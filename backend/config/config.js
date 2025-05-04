require('dotenv').config(); // .env 파일 로드

module.exports = {
  development: {
    username: process.env.DB_USER,     // .env 파일의 DB 사용자 이름 변수
    password: process.env.DB_PASSWORD, // .env 파일의 DB 비밀번호 변수
    database: process.env.DB_DATABASE,     // .env 파일의 DB 이름 변수
    host: process.env.DB_HOST || '127.0.0.1', // .env 파일의 DB 호스트 변수 (없으면 기본값)
    port: process.env.DB_PORT || 5432,       // .env 파일의 DB 포트 변수 (없으면 기본값 5432)
    dialect: 'postgres',
    dialectOptions: {                 // 필요에 따라 SSL 설정 등 추가 옵션
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false // 개발 환경 등에서 필요할 수 있음
      // }
    }
  },
  test: { // 테스트 환경 설정 (필요하다면 별도 DB 정보 사용)
    username: process.env.TEST_DB_USER || process.env.DB_USER,
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.TEST_DB_NAME || 'database_test',
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: process.env.TEST_DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // 테스트 시 로그 끄기
  },
  production: { // 프로덕션(배포) 환경 설정
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    port: process.env.PROD_DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // 프로덕션에서는 보통 로그 최소화
    // dialectOptions: { // 실제 배포 시 SSL 설정 등이 필요할 수 있음
    //   ssl: {
    //     require: true,
    //     rejectUnauthorized: true // CA 인증서 필요
    //   }
    // }
  }
};