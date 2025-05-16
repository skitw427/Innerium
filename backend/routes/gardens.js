const express = require('express');
const router = express.Router();
const db = require('../models'); // Sequelize 모델
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어
const uploadSnapshot = require('../middlewares/uploadMiddleware');
const { Op } = require('sequelize'); // Sequelize 연산자
const path = require('path');

const SNAPSHOT_STORAGE_BASE_PATH = path.join(__dirname, '..', 'storage', 'snapshots');

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
  const { currentDate } = req.query;

  try {
    let user = await db.User.findByPk(userId, {
      include: [
        {
          model: db.Garden,
          as: 'currentGarden',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    currentGarden = user.currentGarden;
    let isNewGarden = false;

    if (user.currentGarden && user.currentGarden.completed_at) {
      const completedDateValue = user.currentGarden.completed_at;
  
      const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);
      const currentDateObj = new Date(currentYear, currentMonth - 1, currentDay);
      currentDateObj.setHours(0, 0, 0, 0)
  
      let completedDateObj;
      if (typeof completedDateValue === 'string') {
        const [compYear, compMonth, compDay] = completedDateValue.split('-').map(Number);
        completedDateObj = new Date(compYear, compMonth - 1, compDay);
      } else if (completedDateValue instanceof Date) {
        
        completedDateObj = new Date(
          completedDateValue.getFullYear(),
          completedDateValue.getMonth(),
          completedDateValue.getDate()
        );
      } else {
        console.error('Invalid completedDate format:', completedDateValue);
      }
      
      if (completedDateObj) {
          completedDateObj.setHours(0, 0, 0, 0);
  
          const completedDatePlusOneDay = new Date(completedDateObj);
          completedDatePlusOneDay.setDate(completedDateObj.getDate() + 1);
  
          if (currentDateObj.getTime() >= completedDatePlusOneDay.getTime()) {
            console.log(`${currentDate}는 ${completedDateValue}보다 하루 이상 큽니다. 새로운 정원을 생성합니다.`);
            currentGarden = await db.Garden.create({
              user_id: userId,
              tree_level: 0, // 초기 나무 레벨
            });
            await user.update({ current_garden_id: currentGarden.garden_id });
            isNewGarden = true;

          } else {
            console.log(`${currentDate}는 ${completedDateValue}보다 하루 이상 크지 않습니다.`);
          }
      }
    } else if (!user.currentGarden){
        currentGarden = await db.Garden.create({
          user_id: userId,
          tree_level: 0,
        });
        await user.update({ current_garden_id: currentGarden.garden_id });
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

    const skyColor = calculateSkyColor(flowersInGarden.map(f => f.emotionType)); // 'emotionType'으로 수정

    res.status(200).json({
      garden_id: currentGarden.garden_id.toString(),
      tree_level: currentGarden.tree_level,
      sky_color: skyColor,
      is_complete: !!currentGarden.completed_at,
      isNewGarden: isNewGarden,
      flowers: flowersInGarden.map(record => {
        const flowerTypeData = record.chosenFlowerType ? {
          id: record.chosenFlowerType.flower_type_id,
          name: record. chosenFlowerType.name,
          image_url: record.chosenFlowerType.image_url,
        } : null; // 또는 기본값 설정

        if (!flowerTypeData) {
            console.warn(`DailyRecord ID ${record.record_id} has no associated chosenFlowerType or flower_type_id is missing.`);
        }

        return {
          flower_instance_id: record.record_id.toString(),
          flower_type: flowerTypeData ? { // 수정된 부분
            id: flowerTypeData.id,
            name: flowerTypeData.name,
            image_url: flowerTypeData.image_url,
          } : { id: null, image_url: null }, // flowerTypeData가 null일 경우의 처리
          position: {
            x: record.flower_pos_x,
            y: record.flower_pos_y,
          },
          emotion_type_id: record.emotion_type_id, // 이건 DailyRecord의 직접적인 컬럼이므로 그대로 사용
          record_date: record.record_date,
          questions_answers: record.questions_answers,
        };
      }).filter(flower => flower && flower.flower_type && flower.flower_type.id !== null), // 만약 위에서 null을 반환했다면 필터링
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
  // uploadSnapshot.single('snapshotImage'),
  async (req, res, next) => {
    const userId = req.user.user_id;
    const { garden_id } = req.params;
    const { name, completedDate } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      if (req.file && req.file.path) {
        try { await fs.unlink(req.file.path); } catch (e) { console.error("Error deleting temp file on name validation fail:", e); }
      }
      return res.status(400).json({ message: '정원 이름(name)이 필요합니다.' });
    }

    // if (!req.file) {
    //   return res.status(400).json({ message: '정원 스냅샷 이미지 파일(snapshotImage)이 필요합니다.' });
    // }

    // const tempFilePath = req.file.path; // multer가 저장한 임시 파일의 전체 경로
    // const originalFileExtension = path.extname(req.file.originalname);

    // 최종 파일명 결정 (user_id와 garden_id 포함)
    // const finalFilename = `user_${userId}_garden_${garden_id}_${Date.now()}${originalFileExtension}`;
    // const finalFilePath = path.join(path.dirname(tempFilePath), finalFilename); // 임시 파일과 같은 디렉토리에 최종 파일명으로

    let transaction;
    try {
      transaction = await db.sequelize.transaction();

      const garden = await db.Garden.findOne({
        where: { garden_id: garden_id, user_id: userId },
        transaction,
      });

      if (!garden) {
        await transaction.rollback();
        return res.status(404).json({ message: '해당 정원을 찾을 수 없거나 권한이 없습니다.' });
      }

      if (garden.completed_at) {
        await transaction.rollback();
        return res.status(400).json({ message: '이미 완성된 정원입니다.' });
      }

      // 파일명 변경 (임시 -> 최종)
      // try {
      //   await fs.rename(tempFilePath, finalFilePath);
      //   console.log(`File renamed from ${tempFilePath} to ${finalFilePath}`);
      // } catch (renameError) {
      //   console.error('Error renaming file:', renameError);
      //   await fs.unlink(tempFilePath); // 이름 변경 실패 시 임시 파일 삭제
      //   throw renameError; // 에러를 다시 던져서 트랜잭션 롤백 및 전체 에러 처리
      // }


      // (선택적) 이전에 스냅샷이 있었다면, 이전 파일 삭제
      // if (garden.snapshot_image_url) {
      //   const oldSnapshotPath = path.join(__dirname, '..', 'storage', 'snapshots', garden.snapshot_image_url);
      //   try {
      //     await fs.access(oldSnapshotPath);
      //     await fs.unlink(oldSnapshotPath);
      //     console.log(`Old snapshot deleted: ${oldSnapshotPath}`);
      //   } catch (err) {
      //     console.warn(`Could not delete old snapshot ${oldSnapshotPath}:`, err.message);
      //   }
      // }

      // 정원 정보 업데이트 (최종 파일명 사용)
      garden.name = name.trim();
      // garden.completed_at = new Date();
      garden.completed_at = completedDate;
      // garden.snapshot_image_url = finalFilename; // 최종 파일명 저장
      await garden.save({ transaction });

      // const user = await db.User.findByPk(userId, { transaction });
      // if (user && user.current_garden_id === parseInt(garden_id, 10)) {
      //   await user.update({ current_garden_id: null }, { transaction });
      // }

      await transaction.commit();

      let finalCompletedAtISO = null;
      if (garden.completed_at && typeof garden.completed_at === 'string') {
        console.log("[Backend] completed_at === String")
        const dateObj = new Date(garden.completed_at);
        if (!isNaN(dateObj.getTime())) {
          finalCompletedAtISO = dateObj.toISOString();
          console.log("[Backend] finalCompletedAtISO:", finalCompletedAtISO, typeof(finalCompletedAtISO))
        } else {
          console.warn(`Could not parse completed_at string "${garden.completed_at}" into a valid Date.`);
        }
      } else if (garden.completed_at instanceof Date) {
        finalCompletedAtISO = garden.completed_at.toISOString();
      }

      res.status(200).json({
        garden_id: garden.garden_id.toString(),
        name: garden.name,
        completed_at: finalCompletedAtISO
      });

    } catch (error) {
      if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') { // 롤백/커밋되지 않은 경우만
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('POST /gardens/:garden_id/complete final Error:', error);
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
          ? `/gardens/snapshot/${garden.snapshot_image_url}` // API 엔드포인트 경로
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
        ? `/gardens/snapshot/${garden.snapshot_image_url}` // API 엔드포인트 경로
        : null,
    });
  } catch (error) {
    console.error('GET /gardens/:garden_id Error:', error);
    next(error);
  }
});

/**
 * @route   GET /gardens/snapshot/:filename
 * @desc    저장된 정원 스냅샷 이미지 파일 제공
 * @access  Private (해당 정원 소유자만 접근 가능)
 */
router.get('/snapshot/:filename', authMiddleware, async (req, res, next) => {
  const userId = req.user.user_id;
  const { filename } = req.params;

  try {
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ message: '잘못된 파일명입니다.' });
    }

    const garden = await db.Garden.findOne({
      where: {
        user_id: userId,
        snapshot_image_url: filename, // DB에 저장된 파일명과 요청된 파일명이 일치해야 함
      },
      attributes: ['garden_id'], // 실제 정원 데이터는 필요 없고, 존재 여부와 권한만 확인
    });

    if (!garden) {
      return res.status(404).json({ message: '스냅샷을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    const filePath = path.join(SNAPSHOT_STORAGE_BASE_PATH, filename);

    try {
      await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK); // 파일 존재 및 읽기 권한 확인
    } catch (fileAccessError) {
      console.error(`Snapshot file not found on disk: ${filePath}`, fileAccessError);
      return res.status(404).json({ message: '스냅샷 파일을 서버에서 찾을 수 없습니다.' });
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending snapshot file ${filePath}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ message: '이미지를 전송하는 중 오류가 발생했습니다.' });
        }
      }
    });

  } catch (error) {
    console.error(`GET /api/gardens/snapshot/${filename} Error:`, error);
    next(error);
  }
});

module.exports = router;