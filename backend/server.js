// server.js
require('dotenv').config(); // .env 로드 (DB 연결 외 다른 환경변수 사용 시 필요)

const express = require('express');
const pool = require('./db'); // 5단계에서 만든 db.js 파일 가져오기

const app = express();
const port = process.env.PORT || 3000; // 포트 설정 (환경 변수 또는 기본값 3000)

// JSON 요청 본문을 파싱하기 위한 미들웨어
app.use(express.json());

// 기본 라우트 (테스트용)
app.get('/', (req, res) => {
  res.send('안녕하세요! Express 서버입니다.');
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users'); // 'users' 테이블이 있다고 가정
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('서버 오류');
  }
});

// 서버 시작
app.listen(port, () => {
  console.log('서버가 http://localhost:${port} 에서 실행 중입니다.', port);
});