const express = require('express');
const app = express();
const db = require('./models');

// Body parser 미들웨어 설정 (POST 요청의 body를 읽기 위해)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gardenRoutes = require('./routes/gardens');
const dailyRecordRoutes = require('./routes/dailyRecords');
const diagnosticRoutes = require('./routes/diagnostics');
const recordRoutes = require('./routes/records');

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/gardens', gardenRoutes);
app.use('/dailyRecords', dailyRecordRoutes);
app.use('/diagnostics', diagnosticRoutes);
app.use('/records', recordRoutes);

// 간단한 테스트 라우트 (DB 연결 확인용)
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/test-db', async (req, res) => {
  try {
    // 간단한 쿼리로 DB 연결 및 모델 사용 확인
    const userCount = await db.User.count();
    res.send(`DB 연결 성공! 현재 사용자 수: ${userCount}`);
  } catch (error) {
    console.error('DB 테스트 오류:', error);
    res.status(500).send('DB 연결 실패');
  }
});

// ... (서버 리스닝 코드) ...