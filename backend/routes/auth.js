// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library'); // Google ID 토큰 검증용
const db = require('../models'); // Sequelize 모델

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Helper function to generate JWT
 * @param {object} user - User object from database (must contain user_id)
 * @returns {string} accessToken
 */
const generateAccessToken = (user) => {
  if (!user || !user.user_id) {
    throw new Error('User ID is required to generate access token');
  }
  const payload = {
    user_id: user.user_id,
    // 필요하다면 다른 정보 추가 (예: role: user.role)
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // 1시간 유효기간 (조정 가능)
};

/**
 * @route   POST /auth/guest
 * @desc    게스트 사용자 생성 및 토큰 발급
 * @access  Public
 * Req: empty
 * Res:
 * Body { access_token: string, provider_user_id: string }
 */
router.post('/guest', async (req, res, next) => {
  try {
    const guestSystemProviderId = `guest_${uuidv4()}`; // 시스템에서 사용할 게스트 고유 ID

    // Users 테이블에 게스트 사용자 정보 저장
    const newGuestUser = await db.User.create({
      auth_provider: 'guest',
      provider_user_id: guestSystemProviderId, // 이 값은 클라이언트가 저장
      // notification_enabled 등 기본값은 모델 정의 따름
    });

    if (!newGuestUser) {
      return res.status(500).json({ message: '게스트 사용자 생성에 실패했습니다.' });
    }

    const accessToken = generateAccessToken(newGuestUser);

    res.status(200).json({ // 명세는 200 OK
      access_token: accessToken,
      provider_user_id: newGuestUser.provider_user_id, // 생성된 게스트 고유 ID
    });
  } catch (error) {
    console.error('POST /auth/guest Error:', error);
    next(error); // 중앙 에러 처리 미들웨어로 전달
  }
});

/**
 * @route   POST /auth/login
 * @desc    소셜 로그인 (Google 예시)
 * @access  Public
 * Req: Body { provider: string, id_token: string }, Header Authorization: Bearer <guest_token> (guest_token은 현재 로직에서 직접 사용하지 않음)
 * Res: Body { provider_user_id: string, access_token: string, is_new_user: boolean }
 */
router.post('/login', async (req, res, next) => {
  const { provider, id_token } = req.body;

  if (provider !== 'google') {
    return res.status(400).json({ message: '지원하지 않는 소셜 프로바이더입니다. 현재는 google만 지원합니다.' });
  }
  if (!id_token) {
    return res.status(400).json({ message: 'id_token이 필요합니다.' });
  }

  try {
    // Google ID 토큰 검증
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });
    const googlePayload = ticket.getPayload();

    if (!googlePayload || !googlePayload.sub) {
      return res.status(400).json({ message: '유효하지 않은 Google ID 토큰입니다.' });
    }

    const googleUserId = googlePayload.sub; // Google 사용자의 고유 ID
    const email = googlePayload.email;
    // const name = googlePayload.name; // 필요하다면 이름 등 추가 정보 활용

    let user;
    let is_new_user = false;

    // 해당 Google ID로 사용자 찾기
    user = await db.User.findOne({
      where: {
        auth_provider: 'google',
        provider_user_id: googleUserId,
      },
    });

    if (!user) {
      // 사용자가 없으면 새로 생성
      user = await db.User.create({
        auth_provider: 'google',
        provider_user_id: googleUserId, // Google의 고유 ID를 저장
        email: email,
        // role 등 다른 필드 설정 가능
      });
      is_new_user = true;
    }

    if (!user) {
      // 위 로직에서 user가 생성되지 않았거나 찾아지지 않은 경우 (극히 드문 DB 오류 등)
      return res.status(500).json({ message: '사용자 처리 중 오류가 발생했습니다.' });
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      provider_user_id: user.provider_user_id, // 우리 시스템에 저장된 provider_user_id (Google ID)
      access_token: accessToken,
      is_new_user: is_new_user,
    });
  } catch (error) {
    console.error('POST /auth/login Error:', error);
    if (error.message && error.message.includes('Invalid token signature')) { // 구글 토큰 검증 실패 등
        return res.status(400).json({ message: '제공된 ID 토큰이 유효하지 않습니다.' });
    }
    next(error);
  }
});

/**
 * @route   POST /auth/token
 * @desc    사용자 인증 토큰 재발급
 * @access  Public (provider_user_id 기반)
 * Req: Body { provider_user_id: string }
 * Res: Body { provider_user_id: string, access_token: string }
 */
router.post('/token', async (req, res, next) => {
  const { provider_user_id } = req.body;

  if (!provider_user_id) {
    // 프론트엔드 로직 3번: 이 경우 프론트에서 /auth/guest 호출
    return res.status(400).json({ message: 'provider_user_id가 필요합니다.' });
  }

  try {
    const user = await db.User.findOne({
      where: { provider_user_id: provider_user_id },
    });

    if (!user) {
      // 프론트엔드 로직 3번: 이 경우 프론트에서 /auth/guest 호출
      return res.status(401).json({ message: '유효하지 않은 provider_user_id입니다. 사용자를 찾을 수 없습니다.' });
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      provider_user_id: user.provider_user_id,
      access_token: accessToken,
    });
  } catch (error) {
    console.error('POST /auth/token Error:', error);
    next(error);
  }
});

module.exports = router;