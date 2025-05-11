# 1. 베이스 이미지 선택 (Node.js 버전은 실제 사용 버전에 맞게 조정)
FROM node:22-alpine AS development

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. package.json 및 package-lock.json (또는 yarn.lock) 복사
#    (의존성 변경이 없을 경우 레이어 캐시를 활용하기 위함)
COPY package*.json ./

# 4. 의존성 설치
RUN npm install
# 만약 yarn을 사용한다면:
# RUN yarn install

# 5. 애플리케이션 소스 코드 전체 복사
COPY . .

# 6. 애플리케이션이 실행될 포트 명시 (Express 앱에서 listen하는 포트)
EXPOSE 3000 # 예시: 앱이 3000번 포트를 사용한다면

# 7. 애플리케이션 실행 명령어
CMD [ "npm", "start" ] # package.json의 "scripts": { "start": "node server.js" } 와 같이 정의된 경우
# 또는 직접 실행: CMD [ "node", "server.js" ]