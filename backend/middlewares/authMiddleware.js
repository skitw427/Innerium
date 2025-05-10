const jwt = require('jsonwebtoken');
const db = require('../models'); // Sequelize 모델
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다. (Bearer 토큰 형식)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.user_id) {
        throw new Error('Invalid token payload');
    }

    const user = await db.User.findByPk(decoded.user_id);

    if (!user) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다. 사용자를 찾을 수 없습니다.' });
    }

    req.user = user; // 요청 객체에 인증된 사용자 정보 추가
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    console.error('Authentication Error:', error);
    return res.status(500).json({ message: '인증 중 서버 오류 발생' });
  }
};