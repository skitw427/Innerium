// db.js
require('dotenv').config(); // .env 파일의 환경 변수를 로드합니다.

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// 연결 테스트 (선택 사항)
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('PostgreSQL 데이터베이스에 성공적으로 연결되었습니다.');
  client.release(); // 풀에 클라이언트 반환
});

module.exports = pool; // 다른 파일에서 사용할 수 있도록 pool 객체를 내보냅니다.