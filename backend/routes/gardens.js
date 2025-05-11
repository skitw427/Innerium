const express = require('express');
const router = express.Router();
const db = require('../models'); // Sequelize 모델
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어 (경로 확인)
const { Op } = require('sequelize'); // Sequelize 연산자

// Helper function to calculate sky color based on flowers (Simplified)
const calculateSkyColor = (flowers) => {
//   if (!flowers || flowers.length === 0) {
//     return '#87CEEB'; // Default sky blue
//   }

//   const firstFlowerEmotion = flowers[0].EmotionType;
//   return firstFlowerEmotion && firstFlowerEmotion.color_hex ? firstFlowerEmotion.color_hex : '#87CEEB';
  return '#87CEEB'
};

/**
 * @route   GET /gardens/current
 * @desc    현재 진행 중인 정원 불러오기 (없으면 새로 생성)
 * @access  Private
 */
router.get('/current', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    let user = await db.User.findByPk(userId, {
      include: [ // 사용자의 현재 정원 정보를 함께 가져오기 위함
        {
          model: db.Garden,
          as: 'currentGarden', // User 모델의 'currentGarden' 관계 별칭
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    let currentGarden = user.currentGarden;
    let isNewGarden = false;

    // 현재 진행 중인 정원이 없으면 새로 생성
    if (!currentGarden) {
      currentGarden = await db.Garden.create({
        user_id: userId,
        tree_level: 0, // 초기 나무 레벨
        // emotion_score 등 다른 초기값 설정 가능
      });
      // 사용자의 current_garden_id 업데이트
      await user.update({ current_garden_id: currentGarden.garden_id });
      isNewGarden = true;
    }

    // 정원에 속한 꽃들 정보 가져오기
    const flowersInGarden = await db.DailyRecord.findAll({
      where: { garden_id: currentGarden.garden_id },
      include: [
        {
          model: db.FlowerType, // 꽃 종류 정보 (이미지 URL 등)
          as: 'chosenFlowerType', // DailyRecord 모델의 관계 별칭
          attributes: ['flower_type_id', 'name', 'image_url'], // 필요한 필드만 선택
        },
        {
          model: db.EmotionType, // 감정 정보 (색상 등)
          as: 'emotionType', // DailyRecord 모델의 관계 별칭
          attributes: ['emotion_type_id', 'name', 'color_hex', 'emoji_url'], // 하늘색 계산 및 이모티콘 표시용
        }
      ],
      order: [['record_date', 'ASC']], // 시간순 정렬
    });

    const skyColor = calculateSkyColor(flowersInGarden.map(f => f.EmotionType)); // EmotionType 객체 전달

    res.status(200).json({
      garden_id: currentGarden.garden_id.toString(), // 명세상 string
      tree_level: currentGarden.tree_level,
      sky_color: skyColor,
      is_complete: !!currentGarden.completed_at, // completed_at이 있으면 true
      flowers: flowersInGarden.map(record => ({
        flower_instance_id: record.record_id.toString(), // DailyRecord의 ID를 꽃 인스턴스 ID로 사용
        flower_type: {
          id: record.ChosenFlowerType.flower_type_id,
          image_url: record.ChosenFlowerType.image_url,
        },
        position: {
          x: record.flower_pos_x,
          y: record.flower_pos_y,
        },
        emotion_type_id: record.emotion_type_id,
      })),
      // isNewGarden: isNewGarden, // 프론트에서 새 정원 생성 여부를 알아야 한다면 추가
    });
  } catch (error) {
    console.error('GET /gardens/current Error:', error);
    next(error);
  }
});

/**
 * @route   POST /gardens/:garden_id/complete
 * @desc    정원 완성 처리 (이름 결정)
 * @access  Private
 */
router.post('/:garden_id/complete', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { garden_id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: '정원 이름(name)이 필요합니다.' });
  }

  try {
    const garden = await db.Garden.findOne({
      where: {
        garden_id: garden_id,
        user_id: userId,
      },
    });

    if (!garden) {
      return res.status(404).json({ message: '해당 정원을 찾을 수 없거나 권한이 없습니다.' });
    }

    if (garden.completed_at) {
      return res.status(400).json({ message: '이미 완성된 정원입니다.' });
    }

    // 정원 정보 업데이트
    garden.name = name.trim();
    garden.completed_at = new Date(); // 현재 시간으로 완성 시간 설정
    // garden.snapshot_image_url = `https://example.com/snapshots/${garden.garden_id}.png`; // 임시 스냅샷 URL 또는 실제 생성 로직
    await garden.save();

    // 사용자의 current_garden_id를 null로 설정 (새 정원을 시작할 수 있도록)
    const user = await db.User.findByPk(userId);
    if (user && user.current_garden_id === garden.garden_id) {
      await user.update({ current_garden_id: null });
    }

    res.status(200).json({
      garden_id: garden.garden_id.toString(),
      name: garden.name,
      completed_at: garden.completed_at.toISOString(),
      snapshot_image_url: garden.snapshot_image_url, // DB에 저장된 값 또는 생성된 값
    });
  } catch (error) {
    console.error('POST /gardens/:garden_id/complete Error:', error);
    next(error);
  }
});

/**
 * @route   PATCH /gardens/:garden_id
 * @desc    완성된 정원 이름 변경
 * @access  Private
 */
router.patch('/:garden_id', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { garden_id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: '새로운 정원 이름(name)이 필요합니다.' });
  }

  try {
    const garden = await db.Garden.findOne({
      where: {
        garden_id: garden_id,
        user_id: userId,
      },
    });

    if (!garden) {
      return res.status(404).json({ message: '해당 정원을 찾을 수 없거나 권한이 없습니다.' });
    }

    if (!garden.completed_at) {
      return res.status(400).json({ message: '완성되지 않은 정원의 이름은 변경할 수 없습니다. 완성 후 시도해주세요.' });
    }

    garden.name = name.trim();
    await garden.save();

    res.status(200).json({
      // garden_id: garden.garden_id.toString(), // 응답 명세에는 name만 있음
      name: garden.name,
    });
  } catch (error) {
    console.error('PATCH /gardens/:garden_id Error:', error);
    next(error);
  }
});

/**
 * @route   GET /gardens/completed
 * @desc    완성된 정원 목록 정보 조회 (페이지네이션)
 * @access  Private
 */
router.get('/completed', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const page = parseInt(req.query.page, 10) || 0; // 기본값 0페이지
  const size = parseInt(req.query.size, 10) || 10; // 기본 페이지 크기 10

  if (page < 0) return res.status(400).json({ message: '페이지 번호는 0 이상이어야 합니다.' });
  if (size <= 0) return res.status(400).json({ message: '페이지 크기는 0보다 커야 합니다.' });

  const offset = page * size;
  const limit = size;

  try {
    const { count, rows } = await db.Garden.findAndCountAll({
      where: {
        user_id: userId,
        completed_at: { [Op.ne]: null }, // completed_at이 null이 아닌 정원
      },
      attributes: ['garden_id', 'name', 'completed_at', 'snapshot_image_url'],
      order: [['completed_at', 'DESC']], // 최근 완성 순
      offset: offset,
      limit: limit,
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      contents: rows.map(garden => ({
        garden_id: garden.garden_id.toString(),
        name: garden.name,
        completed_at: garden.completed_at ? garden.completed_at.toISOString() : null,
        snapshot_image_url: garden.snapshot_image_url,
      })),
      pages: {
        pageNumber: page,
        pageSize: limit,
        totalElements: count,
        totalPages: totalPages,
        isLast: page >= totalPages - 1,
      },
    });
  } catch (error) {
    console.error('GET /gardens/completed Error:', error);
    next(error);
  }
});

/**
 * @route   GET /gardens/:garden_id
 * @desc    특정 정원 상세 조회
 * @access  Private
 */
router.get('/:garden_id', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { garden_id } = req.params;

  try {
    const garden = await db.Garden.findOne({
      where: {
        garden_id: garden_id,
        user_id: userId, // 본인 정원만 조회 가능
      },
      attributes: ['garden_id', 'name', 'completed_at', 'snapshot_image_url', 'tree_level'],
      // 만약 이 API가 꽃 정보도 함께 보여줘야 한다면 include 추가
      // include: [{ model: db.DailyRecord, as: 'DailyRecords', include: [...] }]
    });

    if (!garden) {
      return res.status(404).json({ message: '해당 정원을 찾을 수 없거나 권한이 없습니다.' });
    }

    if (!garden.completed_at) {
       return res.status(404).json({ message: '완성된 정원만 상세 조회가 가능합니다.' });
    }

    res.status(200).json({
      garden_id: garden.garden_id.toString(),
      name: garden.name,
      completed_at: garden.completed_at ? garden.completed_at.toISOString() : null,
      snapshot_image_url: garden.snapshot_image_url,
      // tree_level: garden.tree_level, // 필요시 추가
      // is_complete: !!garden.completed_at, // 필요시 추가
      // sky_color: ..., // 필요시 추가 (계산 로직 필요)
      // flowers: ..., // 필요시 추가 (DailyRecord 조회 로직 필요)
    });
  } catch (error) {
    console.error('GET /gardens/:garden_id Error:', error);
    next(error);
  }
});

module.exports = router;