// routes/diagnostics.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { authMiddleware } = require('../middlewares/authMiddleware'); // 인증 미들웨어 (경로 확인)
// const db = require('../models'); // 필요하다면 DB 모델 사용 (예: 대화 내용 저장)

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
      chatHistory.push({ role: "model", parts: [{ text: aiMessageContent }] }); // 실제 AI 메시지 저장

      // 대화가 완료되면 세션 정리 (선택적)
      if (isConversationComplete) {
        // TODO: 대화 내용을 DB에 저장하는 로직 (DailyRecords 등에 요약본 또는 전체 대화 저장)
        // 예를 들어, DailyRecord를 생성/업데이트 하면서 이 대화의 요약이나 감정 분석 결과를 저장
        console.log(`Conversation ${convIdFromUser} completed. User: ${userId}`);
        delete activeConversations[convIdFromUser]; // 인메모리에서 삭제
      }

      return res.status(200).json({
        conversation_id: convIdFromUser,
        ai_message: aiMessageContent,
        is_complete: isConversationComplete,
      });

    } else {
      return res.status(400).json({ message: '잘못된 요청입니다. "action":"start" 또는 "conversation_id"와 "user_message"가 필요합니다.' });
    }
  } catch (error) {
    console.error('POST /diagnostics/converse Error:', error);
    if (error.message.includes("SAFETY")) { // Gemini API 안전 설정에 걸린 경우
        return res.status(400).json({ message: "AI가 현재 메시지에 대해 응답할 수 없습니다. 다른 질문을 해주시거나 내용을 수정해주세요."});
    }
    next(error); // 중앙 에러 처리기로 전달
  }
});

// 오래된 대화 세션 정리 (예: 30분 이상 비활성 시) - 서버가 계속 실행 중일 때 주기적으로 실행
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