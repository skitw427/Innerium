const express = require('express');
const app = express();
const db = require('./models');
const port = process.env.PORT || 3000; // 포트 설정 (환경 변수 또는 기본값 3000)
const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = path.join(__dirname, 'storage', 'snapshots');
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  console.log(`Snapshot directory created: ${SNAPSHOT_DIR}`);
}

// Body parser 미들웨어 설정 (POST 요청의 body를 읽기 위해)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gardenRoutes = require('./routes/gardens');
const dailyRecordRoutes = require('./routes/dailyRecords');
const diagnosticRoutes = require('./routes/diagnostics');

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/gardens', gardenRoutes);
app.use('/daily-records', dailyRecordRoutes);
app.use('/diagnostics', diagnosticRoutes);

// 기본 라우트 (테스트용)
app.get('/', (req, res) => {
  res.send('안녕하세요! Express 서버입니다.');
});

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

// 중앙 에러 처리 미들웨
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || '서버 내부 오류가 발생했습니다.',
    // 개발 환경에서는 에러 스택 포함 가능
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});