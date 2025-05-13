const express = require('express');
const router = express.Router();
const db = require('../models'); // Sequelize 모델
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어
const { uploadSnapshot } = require('../middlewares/uploadMiddleware');
const { Op } = require('sequelize'); // Sequelize 연산자

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
router.post(
  '/:garden_id/complete',
  authMiddleware,
  uploadSnapshot.single('snapshotImage'),
  async (req, res, next) => {
    const userId = req.user.user_id;
    const { garden_id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      if (req.file && req.file.path) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error("Error deleting temp file on name validation fail:", e); }
      }
      return res.status(400).json({ message: '정원 이름(name)이 필요합니다.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '정원 스냅샷 이미지 파일(snapshotImage)이 필요합니다.' });
    }

    const tempFilePath = req.file.path; // multer가 저장한 임시 파일의 전체 경로
    const originalFileExtension = path.extname(req.file.originalname);

    // 최종 파일명 결정 (user_id와 garden_id 포함)
    const finalFilename = `user_${userId}_garden_${garden_id}_${Date.now()}${originalFileExtension}`;
    const finalFilePath = path.join(path.dirname(tempFilePath), finalFilename); // 임시 파일과 같은 디렉토리에 최종 파일명으로

    let transaction;
    try {
      transaction = await db.sequelize.transaction();

      const garden = await db.Garden.findOne({
        where: { garden_id: garden_id, user_id: userId },
        transaction,
      });

      if (!garden) {
        await fs.unlink(tempFilePath); // 임시 파일 삭제
        await transaction.rollback();
        return res.status(404).json({ message: '해당 정원을 찾을 수 없거나 권한이 없습니다.' });
      }

      if (garden.completed_at) {
        await fs.unlink(tempFilePath); // 임시 파일 삭제
        await transaction.rollback();
        return res.status(400).json({ message: '이미 완성된 정원입니다.' });
      }

      // 파일명 변경 (임시 -> 최종)
      try {
        await fs.rename(tempFilePath, finalFilePath);
        console.log(`File renamed from ${tempFilePath} to ${finalFilePath}`);
      } catch (renameError) {
        console.error('Error renaming file:', renameError);
        await fs.unlink(tempFilePath); // 이름 변경 실패 시 임시 파일 삭제
        throw renameError; // 에러를 다시 던져서 트랜잭션 롤백 및 전체 에러 처리
      }


      // (선택적) 이전에 스냅샷이 있었다면, 이전 파일 삭제
      if (garden.snapshot_image_url) {
        const oldSnapshotPath = path.join(__dirname, '..', 'storage', 'snapshots', garden.snapshot_image_url);
        try {
          await fs.access(oldSnapshotPath);
          await fs.unlink(oldSnapshotPath);
          console.log(`Old snapshot deleted: ${oldSnapshotPath}`);
        } catch (err) {
          console.warn(`Could not delete old snapshot ${oldSnapshotPath}:`, err.message);
        }
      }

      // 정원 정보 업데이트 (최종 파일명 사용)
      garden.name = name.trim();
      garden.completed_at = new Date();
      garden.snapshot_image_url = finalFilename; // 최종 파일명 저장
      await garden.save({ transaction });

      const user = await db.User.findByPk(userId, { transaction });
      if (user && user.current_garden_id === parseInt(garden_id, 10)) {
        await user.update({ current_garden_id: null }, { transaction });
      }

      await transaction.commit();

      res.status(200).json({
        garden_id: garden.garden_id.toString(),
        name: garden.name,
        completed_at: garden.completed_at.toISOString(),
        snapshot_image_url: `/api/gardens/snapshot/${finalFilename}`, // 최종 파일명으로 URL 생성
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      try {
        await fs.access(finalFilePath); // 최종 파일 경로가 존재하는지 (이름 변경 후 에러 시)
        await fs.unlink(finalFilePath);
        console.log(`Cleaned up final file on error: ${finalFilePath}`);
      } catch (e) {
        // finalFilePath가 없으면 tempFilePath를 삭제 시도
        try {
            await fs.access(tempFilePath);
            await fs.unlink(tempFilePath);
            console.log(`Cleaned up temp file on error: ${tempFilePath}`);
        } catch (e2) {
            // 둘 다 없거나 삭제 실패해도 일단 로깅만
            console.error("Error cleaning up snapshot file on main error:", e, e2);
        }
      }

      console.error('POST /gardens/:garden_id/complete Error:', error);
      if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  }
);

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
  let page = parseInt(req.query.page, 10);
  if (isNaN(page) || page < 0) page = 0; // 기본값 또는 유효하지 않은 값 처리

  let size = parseInt(req.query.size, 10);
  if (isNaN(size) || size <= 0) size = 10; // 기본값 또는 유효하지 않은 값 처리

  const offset = page * size;
  const limit = size;

  try {
    const { count, rows } = await db.Garden.findAndCountAll({
      where: {
        user_id: userId,
        completed_at: { [db.Sequelize.Op.not]: null }, // Op.ne 대신 Op.not 사용 (Sequelize v5+ 권장)
      },
      attributes: ['garden_id', 'name', 'completed_at', 'snapshot_image_url'], // 필요한 속성 명시
      order: [['completed_at', 'DESC']],
      offset: offset,
      limit: limit,
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      contents: rows.map(garden => ({
        garden_id: garden.garden_id.toString(),
        name: garden.name,
        completed_at: garden.completed_at ? garden.completed_at.toISOString() : null,
        // snapshot_image_url 가공
        snapshot_image_url: garden.snapshot_image_url
          ? `/api/gardens/snapshot/${garden.snapshot_image_url}` // API 엔드포인트 경로
          : null, // 스냅샷이 없는 경우 null
      })),
      pages: {
        pageNumber: page, // 클라이언트가 요청한 페이지 번호 그대로
        pageSize: limit,  // 실제 적용된 페이지 크기
        totalElements: count,
        totalPages: totalPages,
        // isLast 계산 시, totalPages가 0인 경우 (항목이 없을 때) page >= -1 이 되어 true가 될 수 있으므로 주의
        isLast: count === 0 ? true : page >= totalPages - 1,
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
      snapshot_image_url: garden.snapshot_image_url
        ? `/api/gardens/snapshot/${garden.snapshot_image_url}` // API 엔드포인트 경로
        : null,
    });
  } catch (error) {
    console.error('GET /gardens/:garden_id Error:', error);
    next(error);
  }
});

module.exports = router;