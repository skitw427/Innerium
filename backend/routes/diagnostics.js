const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어 (경로 확인)
const db = require('../models'); // 필요하다면 DB 모델 사용 (예: 대화 내용 저장)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  // 어플리케이션 시작 시점에서 이 에러를 처리하는 것이 더 좋을 수 있습니다.
}

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest", // 또는 "gemini-pro" 등 사용 가능한 모델
  // JSON 응답을 더 잘 생성하도록 시스템 지침 설정 (Gemini 1.5 이상 모델에서 효과적)
  systemInstruction: `당신은 사용자의 감정 상태를 진단하는 친절한 상담가 AI입니다. 
  사용자와 최대 5개의 질문과 답변으로 구성된 짧은 대화를 나누세요. 
  사용자가 부정적인 감정을 표현하면 긍정적인 경험을 회상하도록 유도하는 질문을 포함해주세요.
  당신의 모든 응답은 반드시 다음 JSON 형식이어야 합니다:
  {
    "answer": "사용자에게 전달할 당신의 메시지입니다.",
    "conversation_end": boolean (대화를 종료해야 한다고 판단하면 true, 아니면 false)
  }
  마지막 질문 후 또는 사용자가 대화 종료를 원할 경우 "conversation_end"를 true로 설정하세요.`,
});

// 분석용 모델 설정 (필요에 따라 다른 모델 또는 설정 사용 가능)
const analysisModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // 또는 분석에 더 적합한 모델
    systemInstruction: `당신은 사용자와 상담가 간의 대화 내용을 분석하는 AI입니다.
    주어진 대화 내용을 바탕으로 다음 정보를 추출하여 JSON 형식으로 응답해주세요:
    - "detected_emotion_type_id": 사용자의 주요 감정을 나타내는 숫자 ID (예: 1=기쁨, 2=슬픔, 3=분노, 4=불안, 5=평온 등, 미리 정의된 ID 사용).
    - "conversation_summary": 대화 내용을 간결하게 요약한 문자열 (150자 이내).
    - "recommended_flower_type_id": 분석된 감정에 가장 어울리는 꽃의 숫자 ID (예: 101=장미, 102=해바라기 등, 미리 정의된 ID 사용).
    만약 적절한 ID를 찾기 어렵다면 해당 필드는 null로 설정하세요.
    응답 형식:
    {
      "detected_emotion_type_id": number | null,
      "conversation_summary": "string",
      "recommended_flower_type_id": number | null
    }`,
  });
  const analysisGenerationConfig = { temperature: 0.3, maxOutputTokens: 1024 }; // 분석은 좀 더 결정적인 결과 유도

const generationConfig = {
  temperature: 0.7, // 창의성 조절 (0.0 ~ 1.0)
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048, // 최대 출력 토큰 수
  // responseMimeType: "application/json", // 모델이 지원하고 API 버전에서 사용 가능하다면 명시
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// 인메모리 대화 세션 저장소 (프로덕션에서는 Redis 또는 DB 사용 권장)
const activeConversations = {}; // { conversation_id: { history: [], lastActive: Date } }

const FIRST_AI_QUESTION = "안녕하세요! 오늘 하루 기분은 어떠셨나요? 어떤 점이 가장 기억에 남는지, 혹은 어떤 감정을 느끼셨는지 편하게 이야기해주세요.";

/**
 * Helper function to analyze conversation with LLM
 * @param {Array} conversationHistory - The conversation history array
 * @returns {Promise<object|null>} - Analysis result object or null on failure
 */
async function analyzeConversationWithLLM(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return null;
    }
  
    // 대화 기록을 LLM 프롬프트에 적합한 텍스트 형태로 변환
    const historyText = conversationHistory
      .map(entry => `${entry.role === 'user' ? '사용자' : '상담가'}: ${entry.parts.map(p => p.text).join('\n')}`)
      .join('\n\n');
  
    const prompt = `다음은 사용자와 상담가 간의 대화 내용입니다. 분석해주세요:\n\n---\n${historyText}\n---`;
  
    try {
      const result = await analysisModel.generateContent(prompt, analysisGenerationConfig); // systemInstruction은 모델 생성시 주입
      const responseText = result.response.text();
      const analysisResult = JSON.parse(responseText);
  
      // 결과 유효성 검사 (간단하게)
      if (typeof analysisResult.conversation_summary === 'string' &&
          (typeof analysisResult.detected_emotion_type_id === 'number' || analysisResult.detected_emotion_type_id === null) &&
          (typeof analysisResult.recommended_flower_type_id === 'number' || analysisResult.recommended_flower_type_id === null)
      ) {
        return analysisResult;
      } else {
        console.error("LLM 분석 결과 JSON 형식이 올바르지 않습니다:", analysisResult);
        return null;
      }
    } catch (error) {
      console.error("LLM 대화 분석 중 오류 발생:", error);
      return null;
    }
  }

/**
 * @route   POST /diagnostics/converse
 * @desc    심층 진단 AI 대화
 * @access  Private
 */
router.post('/converse', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id; // 인증된 사용자 ID
  const { action, conversation_id: convIdFromUser, user_message } = req.body;

  try {
    if (action === 'start') {
      // 새 대화 시작
      const newConversationId = uuidv4();
      const initialAiMessage = FIRST_AI_QUESTION;

      // Gemini 대화 기록 형식에 맞게 초기 메시지 저장
      activeConversations[newConversationId] = {
        history: [
          // 모델의 첫 메시지를 history에 포함시킬 필요는 없을 수 있음 (사용자 메시지부터 시작)
          // { role: "model", parts: [{ text: initialAiMessage }] }
        ],
        lastActive: new Date(),
        userId: userId // 이 대화가 어떤 사용자의 것인지 기록
      };

      return res.status(200).json({
        conversation_id: newConversationId,
        ai_message: initialAiMessage,
        is_complete: false,
      });
    } else if (convIdFromUser && user_message) {
      // 기존 대화 이어가기
      if (!activeConversations[convIdFromUser] || activeConversations[convIdFromUser].userId !== userId) {
        return res.status(404).json({ message: '유효하지 않거나 찾을 수 없는 대화 ID입니다.' });
      }

      const conversation = activeConversations[convIdFromUser];
      conversation.lastActive = new Date(); // 마지막 활동 시간 갱신

      // Gemini API에 전달할 이전 대화 기록 (history)
      const chatHistory = conversation.history;

      // 현재 사용자 메시지를 대화 기록에 추가 (Gemini API 호출 전에)
      chatHistory.push({ role: "user", parts: [{ text: user_message }] });

      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: chatHistory.slice(0, -1), // 마지막 사용자 메시지는 sendMessge로 전달
      });

      const result = await chat.sendMessage(user_message); // 현재 사용자 메시지 전달
      const geminiResponseRaw = result.response.text();

      let aiMessageContent;
      let isConversationComplete;

      try {
        // Gemini 응답이 JSON 형식이라고 가정하고 파싱
        const geminiJsonResponse = JSON.parse(geminiResponseRaw);
        aiMessageContent = geminiJsonResponse.answer;
        isConversationComplete = geminiJsonResponse.conversation_end === true; // 명시적으로 true인지 확인

        if (typeof aiMessageContent !== 'string' || typeof isConversationComplete !== 'boolean') {
          throw new Error('Gemini 응답 JSON 형식이 올바르지 않습니다. "answer" (string) 와 "conversation_end" (boolean) 필드가 필요합니다.');
        }
      } catch (parseError) {
        console.error('Gemini 응답 JSON 파싱 오류:', parseError, "Raw response:", geminiResponseRaw);
        // 파싱 실패 시, LLM이 JSON이 아닌 일반 텍스트로 답했을 가능성.
        // 이 경우, 대화를 강제로 종료하거나, 텍스트를 그대로 전달하고 is_complete를 false로 처리할 수 있음.
        // 여기서는 일단 에러로 처리하거나, 원본 텍스트를 사용하고 대화는 계속하는 것으로 가정.
        aiMessageContent = "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요. (Raw: " + geminiResponseRaw.substring(0,100) + ")";
        isConversationComplete = false; // 또는 true로 설정하여 강제 종료
        // next(new Error('AI 응답 처리 중 오류가 발생했습니다.')); // 이렇게 에러를 던질 수도 있음
      }

      // AI 응답을 대화 기록에 추가
      chatHistory.push({ role: "model", parts: [{ text: aiMessageContent }] });

      if (isConversationComplete) {
        transaction = await db.sequelize.transaction(); // 트랜잭션 시작

        try {
          // 1. 사용자 정보 및 현재 정원 ID 가져오기
          const user = await db.User.findByPk(userId, { transaction });
          if (!user || !user.current_garden_id) {
            // 현재 진행중인 정원이 없는 경우에 대한 처리
            // 예: 에러를 반환하거나, 기본값을 사용하거나, 새 정원을 만들도록 유도
            // 여기서는 일단 에러로 처리 (또는 이전에 /gardens/current 에서 정원 생성이 보장되어야 함)
            await transaction.rollback(); // 오류 시 롤백
            console.error(`User ${userId} has no current garden to save the record.`);
            // 클라이언트에게는 AI 메시지만 보내고, is_complete는 true로 유지할 수 있으나, DB 저장은 실패.
            // 또는 is_complete를 false로 바꾸고 사용자에게 알릴 수도 있음.
            // 여기서는 일단 서버 내부 오류로 간주하고 다음 로직 진행 안함.
            // 더 나은 방법: /gardens/current 를 먼저 호출하도록 프론트에서 유도
             delete activeConversations[convIdFromUser]; // 세션은 정리
             return res.status(200).json({ // DB 저장은 실패했지만, 대화는 완료됨을 알림
                conversation_id: convIdFromUser,
                ai_message: aiMessageContent,
                is_complete: true,
                // error_message: "감정 기록을 저장할 현재 정원이 없습니다." // 선택적
             });
          }
          const currentGardenId = user.current_garden_id;

          // 2. LLM으로 대화 내용 분석
          const analysisResult = await analyzeConversationWithLLM(chatHistory);

          let detectedEmotionTypeId = null;
          let conversationSummary = "대화 내용을 요약하는 데 실패했습니다.";
          let recommendedFlowerTypeId = null; // 기본값 또는 분석 실패 시 값

          if (analysisResult) {
            detectedEmotionTypeId = analysisResult.detected_emotion_type_id;
            conversationSummary = analysisResult.conversation_summary;
            recommendedFlowerTypeId = analysisResult.recommended_flower_type_id;

            // EmotionType ID가 유효한지 DB에서 확인 (선택적이지만 권장)
            if (detectedEmotionTypeId !== null) {
                const emotionTypeExists = await db.EmotionType.findByPk(detectedEmotionTypeId, { transaction });
                if (!emotionTypeExists) {
                    console.warn(`LLM이 반환한 EmotionType ID ${detectedEmotionTypeId}가 DB에 없습니다. null로 처리합니다.`);
                    detectedEmotionTypeId = null;
                }
            }
            // FlowerType ID도 마찬가지로 확인 가능
            if (recommendedFlowerTypeId !== null) {
                const flowerTypeExists = await db.FlowerType.findByPk(recommendedFlowerTypeId, { transaction });
                if (!flowerTypeExists) {
                    console.warn(`LLM이 반환한 FlowerType ID ${recommendedFlowerTypeId}가 DB에 없습니다. null로 처리합니다.`);
                    recommendedFlowerTypeId = null; // 또는 기본 꽃 ID
                }
            }
          }

          // 3. DailyRecords 테이블에 저장할 데이터 구성
          const today = new Date();
          const recordDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          // 꽃 위치 결정 (여기서는 간단한 랜덤 값 또는 중앙)
          const flowerPosX = Math.random() * 100; // 0-100 범위
          const flowerPosY = Math.random() * 100; // 0-100 범위

          // chosen_flower_type_id가 null이면 기본값 또는 다른 로직으로 설정
          // 예시: 감정에 따라 EmotionFlowerPool에서 가져오거나, LLM 추천이 없다면 가장 일반적인 꽃
          if (recommendedFlowerTypeId === null && detectedEmotionTypeId !== null) {
            const emotionFlower = await db.EmotionFlowerPool.findOne({
                where: { emotion_type_id: detectedEmotionTypeId },
                order: db.sequelize.random(), // 랜덤으로 하나 선택
                transaction
            });
            if (emotionFlower) recommendedFlowerTypeId = emotionFlower.flower_type_id;
          }
          // 그래도 null이면, 시스템 기본 꽃 ID (예: 1번 꽃)
          const finalFlowerTypeId = recommendedFlowerTypeId !== null ? recommendedFlowerTypeId : 1; // 1번이 기본 꽃이라고 가정

          await db.DailyRecord.create({
            user_id: userId,
            garden_id: currentGardenId,
            record_date: recordDate,
            emotion_type_id: detectedEmotionTypeId, // 분석 결과 또는 null
            chosen_flower_type_id: finalFlowerTypeId,
            flower_pos_x: flowerPosX,
            flower_pos_y: flowerPosY,
            questions_answers: { history: chatHistory }, // 대화 내용 전체 저장
            result_summary: conversationSummary,
            // created_at, updated_at은 자동 생성
          }, { transaction });

          // (선택적) 정원의 나무 레벨 업데이트
           await db.Garden.increment('tree_level', { by: 1, where: { garden_id: currentGardenId }, transaction });
           // 또는 감정 점수에 따른 로직 추가
           // await db.Garden.increment('emotion_score', { by: calculatedScore, where: { garden_id: currentGardenId }, transaction });


          await transaction.commit(); // 모든 DB 작업 성공 시 커밋
          console.log(`Conversation ${convIdFromUser} for user ${userId} saved to DailyRecords. Garden: ${currentGardenId}`);
        } catch (dbError) {
          if (transaction) await transaction.rollback(); // DB 작업 중 오류 발생 시 롤백
          console.error(`Error saving conversation ${convIdFromUser} to DB:`, dbError);
          // 클라이언트에게는 AI 메시지는 보내되, DB 저장 실패에 대한 처리는 내부적으로 (예: 로깅, 재시도 큐)
          // 또는 is_complete를 false로 바꾸고 에러 메시지 전달 가능
        } finally {
          delete activeConversations[convIdFromUser]; // DB 저장 성공/실패 여부와 관계없이 세션은 정리
        }
      }

      return res.status(200).json({
        conversation_id: convIdFromUser,
        ai_message: aiMessageContent,
        is_complete: isConversationComplete,
      });
    } else {
      return res.status(400).json({ message: '잘못된 요청입니다.' });
    }
  } catch (error) {
    if (transaction) await transaction.rollback(); // 예기치 않은 전체 오류 시 롤백
    console.error('POST /diagnostics/converse Error:', error);
    if (error.message && error.message.includes("SAFETY")) {
      return res.status(400).json({ message: "AI가 현재 메시지에 대해 응답할 수 없습니다." });
    }
    next(error);
  }
});

// 오래된 대화 세션 정리
setInterval(() => {
  const now = new Date();
  for (const convId in activeConversations) {
    if (now - activeConversations[convId].lastActive > 30 * 60 * 1000) { // 30분
      console.log(`Conversation ${convId} timed out and removed.`);
      delete activeConversations[convId];
    }
  }
}, 5 * 60 * 1000); // 5분마다 체크

module.exports = router;