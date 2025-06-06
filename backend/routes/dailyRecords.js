const express = require('express');
const router = express.Router();
const db = require('../models'); // Sequelize 모델
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어 (경로 확인)
const { Op } = require('sequelize'); // 필요시 사용

// Helper function to get current date in YYYY-MM-DD format
const getRecordDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * @route   POST /daily-records
 * @desc    간단 분석 결과 저장
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const {
    first_emotion_id,
    first_emotion_amount,
    second_emotion_id, // 선택적
    second_emotion_amount, // 선택적
    record_date: clientRecordDateString,
    questions_answers: clientQuestionsAnswers,
  } = req.body;

  let transaction;

  const DEFINED_FLOWER_POSITIONS = [
    { x: 0.07, y: 0.2 }, { x: 0.10, y: 0.5 }, { x: 0.08, y: 0.8 },
    { x: 0.41, y: 0.1 }, { x: 0.40, y: 0.4 }, { x: 0.38, y: 0.65 }, { x: 0.42, y: 0.9 },
    { x: 0.75, y: 0.25 }, { x: 0.80, y: 0.55 }, { x: 0.78, y: 0.85 },
  ];
  // const DEFINED_FLOWER_POSITIONS = [
  //   { x: 0.15, y: 0.75 }, { x: 0.35, y: 0.85 }, { x: 0.55, y: 0.70 },
  //   { x: 0.75, y: 0.80 }, { x: 0.20, y: 0.50 }, { x: 0.45, y: 0.55 },
  //   { x: 0.65, y: 0.45 }, { x: 0.80, y: 0.55 }, { x: 0.25, y: 0.25 },
  //   { x: 0.40, y: 0.30 }, { x: 0.60, y: 0.20 }, { x: 0.75, y: 0.30 }
  // ];
  const MAX_FLOWERS_IN_GARDEN = DEFINED_FLOWER_POSITIONS.length;

  try {
    // --- 1. 입력값 유효성 검사 ---
    if (typeof first_emotion_id !== 'number' || typeof first_emotion_amount !== 'number') {
      return res.status(400).json({ message: 'first_emotion_id 와 first_emotion_amount는 필수이며 숫자여야 합니다.' });
    }
    if (first_emotion_amount < 0 || first_emotion_amount > 100) { // 감정량 범위 (예시)
        return res.status(400).json({ message: '감정량(amount)은 0과 100 사이여야 합니다.' });
    }
    if ((second_emotion_id !== undefined && typeof second_emotion_id !== 'number') ||
        (second_emotion_amount !== undefined && typeof second_emotion_amount !== 'number')) {
      return res.status(400).json({ message: 'second_emotion_id 또는 second_emotion_amount가 있다면 숫자여야 합니다.' });
    }
    if (second_emotion_id !== undefined && (second_emotion_amount === undefined || second_emotion_amount < 0 || second_emotion_amount > 100)) {
        return res.status(400).json({ message: 'second_emotion_id가 있다면, second_emotion_amount는 필수이며 0과 100 사이여야 합니다.' });
    }
    if (second_emotion_id === undefined && second_emotion_amount !== undefined) {
        return res.status(400).json({ message: 'second_emotion_amount가 있다면, second_emotion_id도 필수입니다.'});
    }

    if (clientQuestionsAnswers !== undefined) { // questions_answers는 선택적으로 받을 수 있도록 처리 (없으면 undefined)
      if (!Array.isArray(clientQuestionsAnswers)) {
        return res.status(400).json({ message: 'questions_answers는 배열이어야 합니다.' });
      }
      for (const item of clientQuestionsAnswers) {
        if (typeof item.question !== 'string' || typeof item.answer !== 'string') {
          return res.status(400).json({ message: 'questions_answers 배열의 각 항목은 question과 answer 문자열을 포함해야 합니다.' });
        }
      }
    }

    transaction = await db.sequelize.transaction(); // 트랜잭션 시작

    // --- 2. 사용자 및 현재 정원 ID 가져오기 ---
    const user = await db.User.findByPk(userId, { transaction });
    if (!user) {
      // 이 경우는 authMiddleware에서 걸러지거나, 사용자가 삭제된 극히 드문 경우
      await transaction.rollback();
      return res.status(401).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }
    if (!user.current_garden_id) {
      await transaction.rollback();
      return res.status(400).json({ message: '현재 진행 중인 정원이 없습니다. 먼저 정원을 시작해주세요.' });
    }
    const currentGardenId = user.current_garden_id;

    let recordDate;
    if (clientRecordDateString) {
      const parsedDate = new Date(clientRecordDateString); // ISO 문자열을 Date 객체로 파싱
      if (isNaN(parsedDate.getTime())) { // 유효한 날짜인지 확인
        await transaction.rollback();
        return res.status(400).json({ message: '제공된 record_date가 유효한 날짜 형식이 아닙니다.' });
      }
      const year = parsedDate.getUTCFullYear();
      const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getUTCDate()).padStart(2, '0');
      recordDate = `${year}-${month}-${day}`;
    } else {
      // 클라이언트에서 날짜를 보내지 않은 경우 (일반적인 상황), 서버의 현재 날짜 사용
      recordDate = getRecordDate();
    }
    console.log(`[Backend] Using record_date: ${recordDate} (Client sent: ${clientRecordDateString || 'N/A'})`);

    // --- 3. 오늘 날짜로 이미 기록이 있는지 확인 ---
    const existingRecord = await db.DailyRecord.findOne({
      where: {
        user_id: userId,
        garden_id: currentGardenId,
        record_date: recordDate,
      },
      transaction,
    });

    if (existingRecord) {
      await transaction.rollback();
      const message = clientRecordDateString
        ? `선택하신 날짜(${recordDate})의 감정 기록은 이미 존재합니다.`
        : '오늘의 감정 기록은 이미 존재합니다. 하루에 한 번만 기록할 수 있습니다.';
      return res.status(400).json({ message });
    }

    // --- 4. EmotionType 유효성 검사 (DB에 해당 ID가 존재하는지) ---
    const primaryEmotionType = await db.EmotionType.findByPk(first_emotion_id, { transaction });
    if (!primaryEmotionType) {
        await transaction.rollback();
        return res.status(400).json({ message: `유효하지 않은 first_emotion_id: ${first_emotion_id} 입니다.`});
    }
    if (second_emotion_id !== undefined) {
        const secondaryEmotionType = await db.EmotionType.findByPk(second_emotion_id, { transaction });
        if (!secondaryEmotionType) {
            await transaction.rollback();
            return res.status(400).json({ message: `유효하지 않은 second_emotion_id: ${second_emotion_id} 입니다.`});
        }
    }

    // --- 5. 첫 번째 감정에 따른 꽃 결정 ---
    let chosenFlowerTypeId;
    const emotionFlowerMapping = await db.EmotionFlowerPool.findAll({ // 해당 감정의 모든 꽃 후보
      where: { emotion_type_id: first_emotion_id },
      transaction,
    });

    if (emotionFlowerMapping && emotionFlowerMapping.length > 0) {
      // 여러 꽃 후보 중 랜덤 선택
      chosenFlowerTypeId = emotionFlowerMapping[Math.floor(Math.random() * emotionFlowerMapping.length)].flower_type_id;
    } else {
      // 매핑된 꽃이 없으면 기본 꽃 ID 사용 (예: ID 1) 또는 에러 처리
      // 여기서는 예시로 시스템 기본 꽃 ID가 1이라고 가정
      const defaultFlower = await db.FlowerType.findByPk(1, { transaction }); // 1번 꽃이 있는지 확인
      if (!defaultFlower) {
        await transaction.rollback();
        return res.status(500).json({ message: "기본 꽃 정보를 찾을 수 없습니다. 관리자에게 문의하세요."});
      }
      chosenFlowerTypeId = 1;
      console.warn(`Emotion ID ${first_emotion_id}에 매핑된 꽃이 없어 기본 꽃(ID: 1)을 사용합니다.`);
    }

    // --- 6. 꽃 위치 결정 (간단한 랜덤 값 또는 중앙) ---
    let newFlowerPosX, newFlowerPosY;
    let recordToReplaceId = null; // 교체될 레코드의 ID

    // 현재 정원에 있는 모든 꽃들의 위치 정보 (오늘 기록 제외, 모든 날짜의 꽃)
    const placedFlowersInGarden = await db.DailyRecord.findAll({
      where: {
        garden_id: currentGardenId,
      },
      attributes: ['record_id', 'flower_pos_x', 'flower_pos_y'], // ID도 가져와서 교체 시 사용
      transaction,
    });

    const currentFlowerCount = placedFlowersInGarden.length;

    if (currentFlowerCount < MAX_FLOWERS_IN_GARDEN) {
      // 정원이 가득 차지 않았을 때: 새 위치 할당
      const occupiedPositions = new Set(
        placedFlowersInGarden.map(f => f.flower_pos_x !== null && f.flower_pos_y !== null ? JSON.stringify({ x: f.flower_pos_x, y: f.flower_pos_y }) : null).filter(p => p)
      );

      const availableSlots = DEFINED_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));

      let selectedPos;
      if (availableSlots.length > 0) {
        selectedPos = availableSlots[Math.floor(Math.random() * availableSlots.length)];
      } else {
        console.warn(`[Garden ID: ${currentGardenId}] No available unique slots from DEFINED_FLOWER_POSITIONS, but garden is not full. Picking a random defined position.`);
        selectedPos = DEFINED_FLOWER_POSITIONS[Math.floor(Math.random() * DEFINED_FLOWER_POSITIONS.length)];
      }
      newFlowerPosX = selectedPos.x;
      newFlowerPosY = selectedPos.y;
    } else {
      // 정원이 가득 찼을 때: 기존 꽃과 교체
      console.log(`[Garden ID: ${currentGardenId}] Garden is full. Replacing an existing flower.`);
      // Alert.alert은 백엔드에서 사용 불가, 로그로 대체
      
      if (placedFlowersInGarden.length > 0) { // 교체할 꽃이 있는지 확인
        const randomIndex = Math.floor(Math.random() * placedFlowersInGarden.length);
        const flowerToReplace = placedFlowersInGarden[randomIndex];
        
        newFlowerPosX = flowerToReplace.flower_pos_x;
        newFlowerPosY = flowerToReplace.flower_pos_y;
        recordToReplaceId = flowerToReplace.record_id; // 교체될 레코드 ID 저장

        // 교체될 기존 레코드 삭제
        await db.DailyRecord.destroy({
          where: { record_id: recordToReplaceId },
          transaction,
        });
        console.log(`[Garden ID: ${currentGardenId}] Removed flower record ID ${recordToReplaceId} for replacement.`);
      } else {
        console.error(`[Garden ID: ${currentGardenId}] Garden is full but no flowers found to replace. This should not happen.`);
        // fallback: 첫 번째 정의된 위치 사용 또는 에러 반환
        if (DEFINED_FLOWER_POSITIONS.length > 0) {
            newFlowerPosX = DEFINED_FLOWER_POSITIONS[0].x;
            newFlowerPosY = DEFINED_FLOWER_POSITIONS[0].y;
        } else {
            // DEFINED_FLOWER_POSITIONS도 비어있으면 심각한 설정 오류
            await transaction.rollback();
            return res.status(500).json({ message: "꽃 위치를 결정할 수 없습니다. 관리자에게 문의하세요." });
        }
      }
    }

    let resultSummary = `오늘은 주로 ${primaryEmotionType.name}(을)를 느끼셨군요.`;
    if (second_emotion_id !== undefined && second_emotion_amount > 0) {
        const secondaryEmotion = await db.EmotionType.findByPk(second_emotion_id, { attributes: ['name'], transaction });
        if(secondaryEmotion) resultSummary += ` 그리고 ${secondaryEmotion.name} 감정도 함께 느끼셨네요.`;
    }

    // --- 8. DailyRecord 생성 ---
    await db.DailyRecord.create({
      user_id: userId,
      garden_id: currentGardenId,
      record_date: recordDate,
      emotion_type_id: first_emotion_id, // 주 감정
      chosen_flower_type_id: chosenFlowerTypeId,
      flower_pos_x: newFlowerPosX,
      flower_pos_y: newFlowerPosY,
      questions_answers: clientQuestionsAnswers || null,
      result_summary: resultSummary,      // 간단한 요약
    }, { transaction });

    // --- 9. 정원 나무 레벨 등 업데이트 ---
    await db.Garden.increment('tree_level', {
      by: 1,
      where: { garden_id: currentGardenId },
      transaction,
    });
    // 감정 점수(emotion_score) 업데이트 로직도 추가 가능
    // 예: (first_emotion_amount + (second_emotion_amount || 0)) / (second_emotion_id ? 2 : 1) 등

    await transaction.commit(); // 모든 DB 작업 성공 시 커밋

    res.status(200).send(); // 성공 시 빈 응답

  } catch (error) {
    if (transaction) await transaction.rollback(); // 오류 발생 시 롤백
    console.error('POST /daily-records (simple) Error:', error);
    // SequelizeUniqueConstraintError 처리 (오늘 날짜로 이미 기록이 있는 경우)
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: '오늘의 감정 기록은 이미 존재합니다. 하루에 한 번만 기록할 수 있습니다.' });
    }
    next(error); // 중앙 에러 처리기로 전달
  }
});

/**
 * @route   GET /records/monthly?year=YYYY&month=MM
 * @desc    유저 캘린더 월별 정보 조회
 * @access  Private
 */
router.get('/monthly', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { year, month } = req.query;

  try {
    // 1. 입력값 유효성 검사
    const currentYear = new Date().getFullYear();
    if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
      return res.status(400).json({ message: 'year와 month는 필수이며 숫자여야 합니다.' });
    }
    const numYear = parseInt(year);
    const numMonth = parseInt(month); // 1-12
    if (numMonth < 1 || numMonth > 12 || numYear < 2000 || numYear > currentYear + 5) { // 연도 범위는 적절히 조정
      return res.status(400).json({ message: '유효하지 않은 year 또는 month 값입니다.' });
    }

    // 2. 해당 월의 시작일과 종료일 계산
    // JavaScript의 Date 객체에서 month는 0-11이므로, numMonth - 1 사용
    const startDate = new Date(numYear, numMonth - 1, 1);
    const endDate = new Date(numYear, numMonth, 0); // 해당 월의 마지막 날짜 (다음달 0일)

    // 3. DailyRecord 조회
    const monthlyRecordsRaw = await db.DailyRecord.findAll({
      where: {
        user_id: userId,
        record_date: {
          [Op.gte]: startDate, // 크거나 같음 (이상)
          [Op.lte]: endDate,   // 작거나 같음 (이하)
        },
      },
      include: [
        {
          model: db.EmotionType,
          as: 'emotionType', // 모델 정의 시 설정한 alias
          attributes: ['emotion_type_id', 'name', 'emoji_url'],
          required: true, // INNER JOIN (EmotionType이 없는 DailyRecord는 제외)
        },
      ],
      attributes: ['record_id', 'record_date', 'emotion_type_id'], // DailyRecord에서 필요한 컬럼
      order: [['record_date', 'ASC']],
    });

    // 4. 응답 데이터 가공
    const monthly_records = monthlyRecordsRaw.map(record => ({
      record_id: record.record_id.toString(), // BigInt를 문자열로 변환 (JSON 호환성)
      record_date: record.record_date, // YYYY-MM-DD 형식
      emotion_type: {
        emotion_type_id: record.emotionType.emotion_type_id,
        name: record.emotionType.name,
        emoji_url: record.emotionType.emoji_url,
      },
    }));

    res.status(200).json({ monthly_records });

  } catch (error) {
    console.error('GET /records/monthly Error:', error);
    next(error);
  }
});

/**
 * @route   GET /daily-records?date=YYYY-MM-DD
 * @desc    특정 날짜 감정 진단 기록/결과 조회
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { date } = req.query;

  try {
    // 1. 입력값 유효성 검사
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date 파라미터는 YYYY-MM-DD 형식이어야 합니다.' });
    }

    // 2. DailyRecord 조회
    const record = await db.DailyRecord.findOne({
      where: {
        user_id: userId,
        record_date: date,
      },
      include: [
        {
          model: db.EmotionType,
          as: 'emotionType', // 모델 정의 시 설정한 alias
          attributes: ['emotion_type_id', 'name', 'emoji_url'],
          required: true,
        },
        {
          model: db.FlowerType,
          as: 'chosenFlower', // 모델 정의 시 설정한 alias
          attributes: ['flower_type_id', 'name', 'image_url'],
          required: true,
        },
      ],
      // 필요한 모든 컬럼을 DailyRecord에서 가져오도록 명시하거나, attributes 생략 (모두 가져옴)
      // attributes: ['record_id', 'record_date', 'emotion_type_id', 'chosen_flower_type_id', 'questions_answers', 'result_summary']
    });

    if (!record) {
      // 해당 날짜에 기록이 없을 경우 404 대신 빈 객체나 특정 메시지를 포함한 200을 반환할 수도 있습니다.
      // 여기서는 명세에 따라 404가 더 적절할 수 있지만, 프론트엔드 처리에 따라 조정 가능.
      // 일단 빈 객체를 반환하도록 명세에 따르지 않고 수정해봅니다. (또는 명확한 404)
      return res.status(200).json({}); // 기록이 없을 때 빈 객체
      // 또는 return res.status(404).json({ message: '해당 날짜의 기록을 찾을 수 없습니다.' });
    }

    // 3. 응답 데이터 가공
    const responseData = {
      record_id: record.record_id.toString(),
      record_date: record.record_date,
      emotion_type: {
        emotion_type_id: record.emotionType.emotion_type_id,
        name: record.emotionType.name,
        emoji_url: record.emotionType.emoji_url,
      },
      chosen_flower: {
        flower_type_id: record.chosenFlower.flower_type_id,
        name: record.chosenFlower.name,
        image_url: record.chosenFlower.image_url,
      },
      questions_answers: record.questions_answers, // DB에 JSONB로 저장되어 있다면 그대로 사용
      result_summary: record.result_summary,
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('GET /daily-records?date=YYYY-MM-DD Error:', error);
    next(error);
  }
});


module.exports = router;