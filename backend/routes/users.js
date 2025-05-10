const express = require('express');
const router = express.Router();
const db = require('../models'); // Sequelize 모델 (경로에 맞게 수정)
const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미DLFDNJS 경로 (경로에 맞게 수정)

/**
 * @route   GET /users/me
 * @desc    내 정보 조회
 * @access  Private (Token Required)
 * Req: Header { Authorization: Bearer <token> }
 * Res: Body { userId: string, auth_provider: string, email: string, notification_enabled: boolean, role: string }
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // authMiddleware에서 req.user에 인증된 사용자 정보를 넣어줍니다.
    const user = req.user;

    res.status(200).json({
      user_id: user.user_id.toString(),
      auth_provider: user.auth_provider,
      email: user.email,
      notification_enabled: user.notification_enabled,
      role: user.role || 'user',
    });
  } catch (error) {
    console.error('GET /users/me Error:', error);
    next(error); // 중앙 에러 처리 미들웨어로 전달
  }
});

/**
 * @route   DELETE /users/me
 * @desc    계정 탈퇴
 * @access  Private (Token Required)
 * Req: Header { Authorization: Bearer <token> }
 * Res: Empty (200 OK)
 */
router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    const userIdToDelete = req.user.user_id;

    const result = await db.User.destroy({
      where: { user_id: userIdToDelete },
    });

    if (result === 0) {
      // authMiddleware에서 사용자를 이미 찾았으므로 이 경우는 거의 발생하지 않음
      return res.status(404).json({ message: '삭제할 사용자를 찾을 수 없습니다.' });
    }

    // 성공적으로 삭제됨
    res.status(200).send(); // 명세에 따라 빈 응답
  } catch (error) {
    console.error('DELETE /users/me Error:', error);
    next(error);
  }
});

/**
 * @route   PATCH /users/settings
 * @desc    사용자 설정 변경 (알림 설정)
 * @access  Private (Token Required)
 * Req: Body { notification_enabled: boolean }, Header { Authorization: Bearer <token> }
 * Res: Body { user_id: string, auth_provider: string, email: string, notification_enabled: boolean }
 */
router.patch('/settings', authMiddleware, async (req, res, next) => {
  const { notification_enabled } = req.body;
  const userIdToUpdate = req.user.user_id;

  // 요청 바디 유효성 검사
  if (typeof notification_enabled !== 'boolean') {
    return res.status(400).json({ message: 'notification_enabled 값은 boolean 타입이어야 합니다.' });
  }

  try {
    const [numberOfAffectedRows, affectedRows] = await db.User.update(
      { notification_enabled: notification_enabled },
      {
        where: { user_id: userIdToUpdate },
        returning: true, // 업데이트된 레코드를 반환
      }
    );

    if (numberOfAffectedRows === 0 || !affectedRows || affectedRows.length === 0) {
      return res.status(404).json({ message: '설정을 변경할 사용자를 찾지 못했습니다.' });
    }

    const updatedUser = affectedRows[0].get({ plain: true }); // Sequelize 인스턴스를 plain object로 변환

    res.status(200).json({
      user_id: updatedUser.user_id.toString(),
      auth_provider: updatedUser.auth_provider,
      email: updatedUser.email,
      notification_enabled: updatedUser.notification_enabled,
      // role은 이 API 응답 명세에 없으므로 포함하지 않음
    });
  } catch (error) {
    console.error('PATCH /users/settings Error:', error);
    next(error);
  }
});

module.exports = router;