// 파일 경로: frontend/src/api/apiClient.js

import axios from 'axios';
// expo-secure-store는 토큰을 안전하게 저장하고 불러올 때 필요합니다.
// 사용하려면 먼저 설치해야 합니다: npm install expo-secure-store
import * as SecureStore from 'expo-secure-store'; // 토큰 사용 시 필요

// --- 1. 기본 설정 ---

// ★★★★★ .env 파일에서 API 기본 URL 가져오기 ★★★★★
// 프로젝트 루트(frontend 폴더)에 .env 파일을 생성하고
// EXPO_PUBLIC_API_BASE_URL="실제 API 서버 URL" 형식으로 변수를 정의해야 합니다.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// .env 파일에 BASE_URL이 제대로 설정되었는지 확인 (개발 편의성 및 오류 방지)
if (!BASE_URL) {
  console.error( // console.warn 대신 error로 변경하여 더 눈에 띄게 함
    "💥 중요 에러: API 기본 URL(EXPO_PUBLIC_API_BASE_URL)이 .env 파일에 설정되지 않았습니다!" +
    "\n프로젝트 루트(frontend 폴더)에 .env 파일을 만들고 해당 변수를 정의해주세요." +
    "\nAPI 호출이 실패합니다."
  );
  // 앱 실행을 막거나 기본 URL을 제공할 수도 있지만, 에러 로그로 확인하는 것이 좋음
}

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: BASE_URL, // .env에서 가져온 URL 사용
  timeout: 15000, // 요청 타임아웃 시간 (15초)
  headers: {
    'Content-Type': 'application/json', // 기본 요청 형식
  },
});

// --- 2. 요청 인터셉터 (헤더에 토큰 자동 추가 등) ---
// 모든 API 요청이 서버로 전송되기 전에 가로채서 처리합니다.
apiClient.interceptors.request.use(
  async (config) => {
    // 디버깅: 어떤 요청이 나가는지 로그 출력 (메소드, URL)
    console.log(`🚀 Requesting: [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);

    // --- ★★★ 인증 토큰 자동 추가 로직 (실제 구현 필요) ★★★ ---
    try {
      // SecureStore 같은 안전한 저장소에서 'accessToken'이라는 키로 저장된 토큰 가져오기 시도
      const token = await SecureStore.getItemAsync('accessToken');

      // 토큰이 존재하고, 해당 요청이 로그인/게스트생성 관련 URL이 아니라면
      const authUrls = ['/auth/guest', '/auth/login']; // 토큰이 필요 없는 경로 목록
      if (token && !authUrls.some(url => config.url?.includes(url))) {
        // 요청 헤더의 Authorization 필드에 'Bearer 토큰값' 형식으로 추가
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Authorization header added.');
      }
    } catch (e) {
      console.error('🚨 Failed to get/add access token from SecureStore:', e);
    }
    // --- ---

    // 수정된 설정(config)을 반환해야 요청이 정상적으로 진행됨
    return config;
  },
  (error) => {
    // 요청 설정 단계에서 오류 발생 시
    console.error('🚨 Request Interceptor Error:', error);
    return Promise.reject(error); // 에러를 호출한 곳으로 전달
  }
);

// --- 3. 응답 인터셉터 (공통 에러 처리, 토큰 갱신 등) ---
// 서버로부터 응답을 받은 후, .then() 또는 .catch() 전에 가로채서 처리합니다.
apiClient.interceptors.response.use(
  (response) => {
    // 성공적인 응답(2xx 상태 코드)은 그대로 통과
    console.log(`✅ Response: [${response.config.method?.toUpperCase()}] ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  async (error) => { // async: 토큰 갱신 등 비동기 작업 처리 가능성
    // 에러 응답 처리
    console.error('🚨 Response Interceptor Error:', error.response?.status, error.message);
    const originalRequest = error.config; // 원래 보냈던 요청 정보 저장

    if (error.response) {
      // 서버가 에러 상태 코드로 응답한 경우 (4xx, 5xx 등)
      console.error('Error Response Data:', error.response.data); // 서버가 보낸 상세 에러 내용

      // --- ★★★ 401 Unauthorized 에러 시 토큰 갱신 시도 로직 (필요시 구현) ★★★ ---
      // 예시: 401 에러이고, 재시도한 요청이 아니며(무한루프 방지), 로그인/게스트생성 요청 실패가 아니라면
      // if (error.response.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      //   originalRequest._retry = true; // 재시도 플래그 설정
      //   console.log('⏳ Unauthorized (401). Attempting token refresh...');
      //   try {
      //     // 1. 리프레시 토큰으로 새 액세스 토큰 요청 (별도 API 함수 필요)
      //     // const refreshTokenValue = await SecureStore.getItemAsync('refreshToken');
      //     // const refreshResponse = await apiClient.post('/auth/refresh', { refreshToken: refreshTokenValue }); // 예시 API
      //     // const newAccessToken = refreshResponse.data.accessToken;
      //
      //     // 2. 새 액세스 토큰 저장
      //     // await SecureStore.setItemAsync('accessToken', newAccessToken);
      //
      //     // 3. 원래 요청 헤더에 새 토큰 설정 후 재요청
      //     // apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`; // Axios 0.x 방식
      //     // originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`; // Axios 1.x 방식
      //     // console.log('🔄 Retrying original request with new token...');
      //     // return apiClient(originalRequest); // ★★★ 수정된 원래 요청 재실행 ★★★
      //
      //   } catch (refreshError) {
      //     console.error('🚨 Token refresh failed:', refreshError);
      //     // 토큰 갱신 실패 시: 저장된 토큰 삭제 및 로그아웃 처리
      //     // await SecureStore.deleteItemAsync('accessToken');
      //     // await SecureStore.deleteItemAsync('refreshToken');
      //     // 여기서 강제 로그아웃 또는 로그인 화면 이동 로직 실행
      //     // 예: throw new Error('Session expired. Please login again.'); // 에러를 발생시켜 상위에서 처리하도록 유도
      //     return Promise.reject(refreshError); // 갱신 실패 에러 반환
      //   }
      // }
      // --- ---

    } else if (error.request) {
      // 요청은 보냈으나 서버로부터 응답을 받지 못한 경우 (네트워크 오류 등)
      console.error('🚨 No response received from server:', error.request);
      // 사용자에게 네트워크 오류 알림 표시 고려
    } else {
      // 요청 설정 중에 에러가 발생한 경우
      console.error('🚨 Error setting up request:', error.message);
    }

    // 처리되지 않은 에러는 호출한 쪽(.catch 블록)으로 다시 전달
    return Promise.reject(error);
  }
);


// --- 4. API 호출 함수 정의 (명세서 기반) ---
// 각 함수는 API 명세서의 한 줄에 해당합니다.
// JSDoc 주석은 함수의 역할과 반환 타입을 명시하여 코드 가독성을 높입니다. (TypeScript 사용 시 더 강력)

/**
/**
 * 게스트 사용자 생성 (수정됨)
 * [POST] /auth/guest
 * 요청 본문: { access_token: string, provider_user_id: string }
 * @param {object} guestData - 게스트 사용자 생성을 위한 데이터.
 * @param {string} guestData.access_token - (예: 소셜 로그인 후 받은) 액세스 토큰. API 명세서에 따라 'Bearer ' 접두사 없이 토큰 값 자체를 전달해야 할 수 있습니다.
 * @param {string} guestData.provider_user_id - (예: 소셜 로그인 후 받은) 프로바이더 사용자 ID.
 * @returns {Promise<import("axios").AxiosResponse<{accessToken: string}>>} GuestResDTO (또는 실제 응답 DTO) 포함 응답.
 *          (응답 DTO는 기존 정의를 따르거나, 새 명세서에 따라 변경될 수 있습니다.)
 */
export const createGuestUser = (guestData) => {
  // guestData는 { access_token: "...", provider_user_id: "..." } 형태의 객체여야 합니다.
  return apiClient.post('/auth/guest', guestData);
};

/**
 * 소셜 로그인
 * [POST] /auth/login
 * 요청 헤더: Authorization: Bearer <guest_token> (게스트 인증 토큰 필요)
 * 요청 본문: { provider: string, id_token: string }
 * 성공 응답 본문: { provider_user_id: string, access_token: string, is_new_user: boolean }
 * @param {object} loginData - 로그인 요청 데이터.
 * @param {string} loginData.provider - 소셜 로그인 제공자 (예: 'google').
 * @param {string} loginData.id_token - 소셜 로그인 제공자로부터 받은 ID 토큰.
 * @param {string} guestToken - /auth/guest 등을 통해 얻은 게스트 세션의 액세스 토큰.
 * @returns {Promise<import("axios").AxiosResponse<{provider_user_id: string, access_token: string, is_new_user: boolean}>>} 로그인 성공 시 provider_user_id, 새로운 액세스 토큰(사용자용), 신규 사용자 여부 포함 응답
 */
export const socialLogin = (loginData, guestToken) => {
  // loginData는 { provider: "google", id_token: "..." } 형태의 객체여야 합니다.
  // guestToken은 문자열 형태의 게스트 액세스 토큰입니다.

  // 이 요청은 특별히 guestToken을 헤더에 직접 설정해야 합니다.
  // apiClient.post의 세 번째 인자로 config 객체를 전달하여 헤더를 추가/수정합니다.
  return apiClient.post('/auth/login', loginData, {
    headers: {
      // 기존 헤더에 추가되거나, Authorization 헤더가 있다면 이 값으로 덮어씁니다.
      'Authorization': `Bearer ${guestToken}`
    }
  });
};

/**
 * 사용자 인증 토큰 발급 (게스트 토큰 필요로 가정)
 * [POST] /auth/token  (★★★ 중요: 실제 API 경로 및 메소드 확인 필요 ★★★)
 * 요청 헤더: Authorization: Bearer <guest_token> (가정)
 * 요청 본문: { provider_user_id: string }
 * 성공 응답 본문: { provider_user_id: string, access_token: string } (access_token은 사용자 인증 토큰)
 *
 * 참고:
 * - 이 API를 호출하기 전에, `/auth/guest` 등을 통해 `provider_user_id`와 `guest_token`을 확보해야 합니다.
 * - `provider_user_id`가 없는 경우, 먼저 게스트 사용자 생성 API를 호출하여 `provider_user_id`를 발급받아야 합니다.
 *
 * @param {string} providerUserId - 사용자 식별자 (예: 게스트 세션에서 얻은 ID).
 * @param {string} guestToken - 현재 유효한 게스트 액세스 토큰. (이 API가 게스트 토큰을 요구한다고 가정)
 * @returns {Promise<import("axios").AxiosResponse<{provider_user_id: string, access_token: string}>>} provider_user_id와 새로운 사용자 액세스 토큰(Bearer)을 포함한 응답.
 */
export const issueUserToken = (providerUserId, guestToken) => {
  // 필수 파라미터 체크 (개발 편의성)
  if (!providerUserId) {
    const errorMessage = 'issueUserToken: providerUserId는 필수입니다.';
    console.error(`🚨 ${errorMessage}`);
    return Promise.reject(new Error(errorMessage)); // 에러를 반환하여 호출부에서 처리하도록 함
  }
  if (!guestToken) {
    // 이 API가 게스트 토큰을 요구한다는 가정 하에 경고/에러 처리
    const errorMessage = 'issueUserToken: guestToken은 필수입니다. (API가 게스트 토큰을 요구한다고 가정)';
    console.warn(`⚠️ ${errorMessage}`);
    // 실제 운영에서는 에러를 던지거나, API 명세에 따라 다르게 처리할 수 있습니다.
    // return Promise.reject(new Error(errorMessage));
  }

  // ★★★ 실제 API 경로로 변경해야 합니다. 예: '/auth/issue-token' 또는 '/users/token' 등 ★★★
  const apiPath = '/auth/token';

  return apiClient.post(
    apiPath,
    { provider_user_id: providerUserId }, // 요청 본문
    {
      headers: {
        // 이 API가 게스트 토큰을 요구한다고 가정하고 헤더 설정
        // 만약 게스트 토큰이 필요 없다면 이 headers 객체 전체를 제거하거나 수정해야 합니다.
        'Authorization': `Bearer ${guestToken}`
      }
    }
  );
};

/**
 * 내 정보 조회
 * [GET] /users/me
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문: 없음
 * 성공 응답 본문(UserInfoResDTO): { userId: string, auth_provider: string, email: string, notification_enabled: boolean, role: string }
 * @returns {Promise<import("axios").AxiosResponse<{userId: string, auth_provider: string, email: string, notification_enabled: boolean, role: string}>>} UserInfoResDTO 포함 응답
 */
export const getMyInfo = () => {
    // Authorization 헤더는 요청 인터셉터가 SecureStore에서 토큰을 읽어 자동으로 추가해 줄 것입니다.
    // GET 요청이므로 요청 본문(두 번째 인자)은 필요 없습니다.
    return apiClient.get('/users/me');
};

/**
 * 계정 탈퇴
 * [DELETE] /users/me
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문: 없음
 * 성공 응답 본문: 없음 (또는 명세서 확인 필요)
 * @returns {Promise<import("axios").AxiosResponse<any>>} 성공 시 보통 200 OK 또는 204 No Content 응답
 */
export const deleteAccount = () => {
    // Authorization 헤더는 요청 인터셉터가 자동으로 추가합니다.
    // DELETE 요청이며 요청 본문이 필요 없습니다.
    return apiClient.delete('/users/me');
};

/**
 * 사용자 설정 변경 (예: 알림 설정)
 * [PATCH] /users/settings
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문(UserSettingReqDTO): { notification_enabled: boolean }
 * 성공 응답 본문(UserSettingResDTO): { user_id: string, auth_provider: string, email: string, notification_enabled: boolean }
 * @param {object} settingsData - 변경할 설정 데이터. 예: { notification_enabled: true }
 * @returns {Promise<import("axios").AxiosResponse<{user_id: string, auth_provider: string, email: string, notification_enabled: boolean}>>} UserSettingResDTO 포함 응답
 */
export const updateUserSettings = (settingsData) => {
    // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
    // PATCH 요청의 두 번째 인자로 요청 본문 데이터를 전달합니다.
    return apiClient.patch('/users/settings', settingsData);
};

/**
 * 현재 진행 중인 정원 정보 불러오기
 * [GET] /gardens/current
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문: 없음
 * 성공 응답 본문(CurrentGardenResDTO): {
 *   garden_id: string,
 *   tree_level: number, // API 명세상 int는 JS에서 number
 *   sky_color: string,
 *   is_complete: boolean, // API 명세상 bool는 JS에서 boolean
 *   flowers: Array<{ // 꽃 객체 배열
 *     flower_instance_id: string,
 *     flower_type: {
 *       id: number, // API 명세상 int는 JS에서 number
 *       image_url: string
 *     },
 *     position: {
 *       x: number, // API 명세상 float는 JS에서 number
 *       y: number  // API 명세상 float는 JS에서 number
 *     },
 *     emotion_type_id: number // API 명세상 int는 JS에서 number
 *   }>
 * }
 * @returns {Promise<import("axios").AxiosResponse<{
*   garden_id: string,
*   tree_level: number,
*   sky_color: string,
*   is_complete: boolean,
*   flowers: Array<{
*     flower_instance_id: string,
*     flower_type: {
*       id: number,
*       image_url: string
*     },
*     position: {
*       x: number,
*       y: number
*     },
*     emotion_type_id: number
*   }>
* }>>} CurrentGardenResDTO 포함 응답
*/
export const getCurrentGarden = () => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // GET 요청이므로 요청 본문(두 번째 인자)은 필요 없습니다.
 return apiClient.get('/gardens/current');
};

/**
 * 정원 완성 처리 (이름 결정 등)
 * [POST] /gardens/{garden_id}/complete
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문(CompleteGardenReqDTO): { name: string }
 * 성공 응답 본문(CompleteGardenResDTO): {
 *   garden_id: string,
 *   name: string,
 *   completed_at: string, // ISO 8601 형식의 날짜/시간 문자열
 *   snapshot_image_url: string
 * }
 * @param {string | number} gardenId - 완성 처리할 정원의 ID (경로 파라미터)
 * @param {object} gardenNameData - 정원 이름 데이터. 예: { name: "나의 행복 정원" }
 * @returns {Promise<import("axios").AxiosResponse<{
*   garden_id: string,
*   name: string,
*   completed_at: string,
*   snapshot_image_url: string
* }>>} CompleteGardenResDTO 포함 응답
*/
export const completeGarden = (gardenId, gardenNameData) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // URL 경로에 gardenId를 포함시키고, 두 번째 인자로 요청 본문 데이터를 전달합니다.
 return apiClient.post(`/gardens/${gardenId}/complete`, gardenNameData);
};

/**
 * 정원 이름 변경
 * [PATCH] /gardens/{garden_id}
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문(ChangeGardenNameReqDTO): { name: string }
 * 성공 응답 본문(ChangeGardenNameResDTO): { name: string }
 * @param {string | number} gardenId - 이름을 변경할 정원의 ID (경로 파라미터)
 * @param {object} newNameData - 새 이름 데이터. 예: { name: "나의 수정된 정원" }
 * @returns {Promise<import("axios").AxiosResponse<{name: string}>>} ChangeGardenNameResDTO 포함 응답
 */
export const changeGardenName = (gardenId, newNameData) => {
    // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
    // URL 경로에 gardenId를 포함시키고, 두 번째 인자로 요청 본문 데이터를 전달합니다.
    return apiClient.patch(`/gardens/${gardenId}`, newNameData);
};

/**
 * 완성된 정원 목록 조회 (페이지네이션)
 * [GET] /gardens/completed
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 쿼리 파라미터: page (number), size (number)
 * 요청 본문: 없음
 * 성공 응답 본문(GardenStorageResDTO): {
 *   contents: Array<{ // 완성된 정원 정보 배열
 *     garden_id: string,
 *     name: string,
 *     completed_at: string, // ISO 8601 형식 날짜/시간 문자열
 *     snapshot_image_url: string
 *   }>,
 *   pages: { // 페이지네이션 정보
 *     pageNumber: number, // 현재 페이지 번호 (API 응답 기준)
 *     pageSize: number, // 페이지 당 항목 수
 *     totalElements: number, // 전체 항목 수
 *     totalPages: number, // 전체 페이지 수
 *     isLast: boolean // 마지막 페이지 여부
 *   }
 * }
 * @param {number} page - 조회할 페이지 번호 (API 명세에 따라 0부터 시작할 수도 있음, 확인 필요)
 * @param {number} size - 한 페이지에 가져올 정원 개수
 * @returns {Promise<import("axios").AxiosResponse<{
*   contents: Array<{
*     garden_id: string,
*     name: string,
*     completed_at: string,
*     snapshot_image_url: string
*   }>,
*   pages: {
*     pageNumber: number,
*     pageSize: number,
*     totalElements: number,
*     totalPages: number,
*     isLast: boolean
*   }
* }>>} GardenStorageResDTO 포함 응답
*/
export const getCompletedGardens = (page, size) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // GET 요청의 두 번째 인자인 config 객체에 params 속성으로 쿼리 파라미터를 전달합니다.
 return apiClient.get('/gardens/completed', { params: { page, size } });
};

/**
 * 특정 정원 상세 정보 조회
 * [GET] /gardens/{garden_id}
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문: 없음
 * 성공 응답 본문(PreviousGardenResDTO): {
 *   garden_id: string,
 *   name: string,
 *   completed_at: string, // ISO 8601 형식 날짜/시간 문자열
 *   snapshot_image_url: string
 * }
 * @param {string | number} gardenId - 조회할 정원의 ID (경로 파라미터)
 * @returns {Promise<import("axios").AxiosResponse<{
*   garden_id: string,
*   name: string,
*   completed_at: string,
*   snapshot_image_url: string
* }>>} PreviousGardenResDTO 포함 응답
*/
export const getGardenDetails = (gardenId) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // URL 경로에 gardenId를 포함시킵니다. GET 요청이므로 본문은 없습니다.
 return apiClient.get(`/gardens/${gardenId}`);
};

/**
 * 심층 진단 AI 대화 요청
 * [POST] /diagnostics/converse
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문(ConversationReqDTO):
 *   - 대화 시작 시: { action: "start" }
 *   - 대화 진행 중: { conversation_id: string, user_message: string }
 * 성공 응답 본문(ConversationResDTO): {
 *   conversation_id: string,
 *   ai_message: string,
 *   is_complete: boolean
 * }
 * @param {object} messageData - 대화 관련 데이터.
 *   - 시작 시: { action: 'start' }
 *   - 진행 중: { conversation_id: 'some_id', user_message: '사용자 메시지' }
 * @returns {Promise<import("axios").AxiosResponse<{
*   conversation_id: string,
*   ai_message: string,
*   is_complete: boolean
* }>>} ConversationResDTO 포함 응답
*/
export const converseWithAI = (messageData) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // messageData 객체를 요청 본문으로 전달합니다.
 // 호출하는 쪽에서 messageData의 구조를 상황에 맞게 제공해야 합니다.
 return apiClient.post('/diagnostics/converse', messageData);
};

/**
 * 일일 기록 저장 (간단 진단 결과 저장용)
 * [POST] /daily-records
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문(SaveRecordReqDTO - 간단 진단): {
 *   first_emotion_id: number, // 첫 번째 감정 ID (int -> number)
 *   first_emotion_amount: number, // 첫 번째 감정 정도 (int -> number)
 *   second_emotion_id: number, // 두 번째 감정 ID (int -> number)
 *   second_emotion_amount: number // 두 번째 감정 정도 (int -> number)
 * }
 * 성공 응답 본문: 내용 불명확 (없거나, 성공 메시지, 또는 저장된 ID 등)
 * @param {object} recordData - 저장할 간단 진단 결과 데이터.
 *   예: { first_emotion_id: 1, first_emotion_amount: 3, second_emotion_id: 5, second_emotion_amount: 2 }
 * @returns {Promise<import("axios").AxiosResponse<any>>} 성공 여부 또는 저장된 ID 등 포함 가능
 */
export const saveDailyRecord = (recordData) => {
    // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
    // recordData 객체를 요청 본문으로 전달합니다.
    return apiClient.post('/daily-records', recordData);
};

/**
 * 월별 캘린더 기록 조회
 * [GET] /records/monthly
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 쿼리 파라미터: year (number), month (number)
 * 요청 본문: 없음
 * 성공 응답 본문(CalenderResDTO): {
 *   monthly_records: Array<{ // 해당 월의 기록 배열
 *     record_id: string,
 *     record_date: string, // 날짜 문자열 (예: "YYYY-MM-DD")
 *     emotion_type: { // 기록된 감정 정보
 *       emotion_type_id: number, // 감정 타입 ID (int -> number)
 *       name: string, // 감정 이름
 *       emoji_url: string // 감정 이모지 이미지 URL
 *     }
 *   }>
 * }
 * @param {number | string} year - 조회할 년도 (YYYY 형식)
 * @param {number | string} month - 조회할 월 (1 ~ 12)
 * @returns {Promise<import("axios").AxiosResponse<{
*   monthly_records: Array<{
*     record_id: string,
*     record_date: string,
*     emotion_type: {
*       emotion_type_id: number,
*       name: string,
*       emoji_url: string
*     }
*   }>
* }>>} CalenderResDTO 포함 응답
*/
export const getMonthlyRecords = (year, month) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // API가 월(month)을 두 자리 문자열(예: '05')로 요구할 수 있으므로 변환합니다.
 const formattedMonth = String(month).padStart(2, '0');
 // GET 요청의 config 객체에 params로 쿼리 파라미터를 전달합니다.
 return apiClient.get('/records/monthly', { params: { year, month: formattedMonth } });
};

/**
 * 일별 감정 진단 기록/결과 조회
 * [GET] /daily-records
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 쿼리 파라미터: date (string, "YYYY-MM-DD" 형식)
 * 요청 본문: 없음
 * 성공 응답 본문(ResultResDTO): {
 *   record_id: string,
 *   record_date: string, // "YYYY-MM-DD" 형식
 *   emotion_type: { // 기록된 감정 정보
 *     emotion_type_id: number, // int -> number
 *     name: string,
 *     emoji_url: string
 *   },
 *   chosen_flower: { // 선택된 꽃 정보
 *     flower_type_id: number, // int -> number
 *     name: string,
 *     image_url: string
 *   },
 *   questions_answers: Array<{ // 질문 및 답변 목록
 *     question: string,
 *     answer: string
 *   }>,
 *   result_summary: string // 결과 요약 텍스트
 * }
 * @param {string} date - 조회할 날짜 ("YYYY-MM-DD" 형식의 문자열)
 * @returns {Promise<import("axios").AxiosResponse<{
*   record_id: string,
*   record_date: string,
*   emotion_type: {
*     emotion_type_id: number,
*     name: string,
*     emoji_url: string
*   },
*   chosen_flower: {
*     flower_type_id: number,
*     name: string,
*     image_url: string
*   },
*   questions_answers: Array<{
*     question: string,
*     answer: string
*   }>,
*   result_summary: string
* }>>} ResultResDTO 포함 응답
*/
export const getDailyRecordResult = (date) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // GET 요청의 config 객체에 params로 쿼리 파라미터를 전달합니다.
 return apiClient.get('/daily-records', { params: { date } });
};

// apiClient 인스턴스 자체를 내보낼 필요는 보통 없습니다.
// 위에서 정의한 개별 API 함수들을 export 하여 사용합니다.
// export default apiClient; // 특별한 경우(예: 인터셉터 외부에서 직접 설정 변경)에만 사용 고려