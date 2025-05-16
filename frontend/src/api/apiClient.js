// 파일 경로: frontend/src/api/apiClient.js

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { PROVIDER_USER_ID_KEY, ACCESS_TOKEN_KEY } from '../constants/storageKeys'; // 경로 확인!

// --- 1. 기본 설정 ---
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  console.error(
    "💥 중요 에러: API 기본 URL(EXPO_PUBLIC_API_BASE_URL)이 .env 파일에 설정되지 않았습니다!"
    // ... (이하 생략) -> 이 부분은 제공해주신 코드에 생략 표시가 있었으므로 동일하게 유지합니다.
  );
  // 개발 중에는 로컬 폴백 URL을 제공할 수 있지만, 경고는 유지합니다.
  // throw new Error("API 기본 URL이 설정되지 않았습니다."); // 또는 에러를 발생시켜 앱 실행 중단
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 기존 15000 유지, 필요시 이미지 업로드 위해 증가 고려
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- 2. 요청 인터셉터 ---
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      // 토큰이 필요 없는 경로 (또는 특별한 토큰 처리가 필요한 경로)
      const noTokenRequiredUrls = ['/auth/guest', '/auth/token', '/auth/login']; // `/auth/token`도 포함 가능

      if (token && !noTokenRequiredUrls.some(url => config.url?.includes(url))) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('🚨 Failed to get/add access token from SecureStore:', e);
    }
    return config;
  },
  (error) => {
    console.error('🚨 Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// --- 3. 응답 인터셉터 ---
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('⏳ Unauthorized (401). Attempting token refresh or new guest creation...');

      try {
        const storedProviderUserId = await SecureStore.getItemAsync(PROVIDER_USER_ID_KEY);
        const currentAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY); // 토큰 갱신 시 필요할 수 있음

        if (!storedProviderUserId) {
          console.log('No provider_user_id found. Creating new guest user for retry...');
          const guestResponse = await createInitialGuestUser(); // 아래 정의된 함수
          const newAccessToken = guestResponse.data.access_token; // 실제 필드명 확인!
          const newProviderUserId = guestResponse.data.provider_user_id; // 실제 필드명 확인!

          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
          await SecureStore.setItemAsync(PROVIDER_USER_ID_KEY, newProviderUserId);
          console.log('✅ New guest created and tokens stored.');

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          console.log(`Attempting to refresh token for provider_user_id: ${storedProviderUserId}`);
          // [수정] issueUserToken 호출 시 currentAccessToken을 guestToken으로 전달
          const refreshResponse = await issueUserToken(storedProviderUserId, currentAccessToken);
          const newAccessToken = refreshResponse.data.access_token; // 실제 필드명 확인!

          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
          console.log('✅ Token refreshed and stored.');

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshOrNewGuestError) {
        console.error('🚨 Token refresh or new guest creation failed after 401:', refreshOrNewGuestError);
        const isInvalidProviderIdError = refreshOrNewGuestError.response &&
          [400, 403, 404].includes(refreshOrNewGuestError.response.status);

        if (isInvalidProviderIdError && originalRequest.url !== '/auth/guest') {
          console.log('Provider_user_id seems invalid. Attempting to create a new guest account.');
          try {
            await SecureStore.deleteItemAsync(PROVIDER_USER_ID_KEY);
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            const guestResponse = await createInitialGuestUser();
            const newAccessToken = guestResponse.data.access_token; // 실제 필드명 확인!
            const newProviderUserId = guestResponse.data.provider_user_id; // 실제 필드명 확인!
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
            await SecureStore.setItemAsync(PROVIDER_USER_ID_KEY, newProviderUserId);
            console.log('✅ New guest created after failed token refresh.');
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          } catch (finalGuestError) {
            console.error('🚨 Critical: Failed to create new guest after token refresh failure:', finalGuestError);
            return Promise.reject(finalGuestError);
          }
        }
        return Promise.reject(refreshOrNewGuestError);
      }
    }

    // 기존 에러 로깅 (401 아니거나 재시도 실패 시)
    if (error.response) {
      console.error('🚨 Response Interceptor Error (non-401 or retry failed):', error.response.status, error.message);
      console.error('Error Response Data:', error.response.data);
    } else if (error.request) {
      console.error('🚨 No response received from server:', error.request);
    } else {
      console.error('🚨 Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// --- 4. API 호출 함수 정의 ---

// [추가] 최초 게스트 사용자 생성을 위한 함수
export const createInitialGuestUser = () => {
  return apiClient.post('/auth/guest', {}); // 요청 본문이 없다면 {} 또는 생략
};

// 기존 함수들 (createGuestUser, socialLogin, issueUserToken은 하나만 남김)
export const createGuestUser = (guestData) => {
  return apiClient.post('/auth/guest', guestData);
};

export const socialLogin = (loginData, guestToken) => {
  return apiClient.post('/auth/login', loginData, {
    headers: {
      'Authorization': `Bearer ${guestToken}`
    }
  });
};

// [수정] issueUserToken 함수는 하나만 남기고, 시그니처는 (providerUserId, guestToken)으로 통일
/**
 * 사용자 인증 토큰 발급
 * [POST] /auth/token
 * 요청 헤더: Authorization: Bearer <guest_token> (API 명세에 따라 필요 여부 결정)
 * 요청 본문: { provider_user_id: string }
 * @param {string} providerUserId - 사용자 식별자.
 * @param {string} guestToken - (선택적 또는 API 명세에 따라 필수) 게스트 액세스 토큰.
 */
export const issueUserToken = (providerUserId, guestToken) => {
  if (!providerUserId) {
    const errorMessage = 'issueUserToken: providerUserId는 필수입니다.';
    console.error(`🚨 ${errorMessage}`);
    return Promise.reject(new Error(errorMessage));
  }

  // API가 guestToken을 요구하는지에 따라 이 부분 로직 조정
  const headersConfig = {};
  if (guestToken) { // guestToken이 제공된 경우에만 헤더에 추가 (API 명세 확인!)
    headersConfig.Authorization = `Bearer ${guestToken}`;
  } else {
    // API가 guestToken 없이도 토큰 갱신을 허용하거나,
    // 또는 이 API가 요청 인터셉터의 자동 토큰 주입을 사용해야 한다면
    // guestToken이 없을 때의 처리를 명확히 해야 함.
    // 현재는 guestToken이 없으면 Authorization 헤더 없이 요청.
    console.warn('⚠️ issueUserToken: guestToken is not provided. Requesting without Authorization header for /auth/token.');
  }

  const apiPath = '/auth/token'; // ★★★ 실제 API 경로 확인 필요 ★★★

  return apiClient.post(
    apiPath,
    { provider_user_id: providerUserId }, // 요청 본문
    { headers: headersConfig } // 설정된 헤더 사용
  );
};

/**
 * 내 정보 조회
 * [GET] /users/me
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가되어야 함)
 * 요청 본문: 없음
 * 성공 응답 본문(UserInfoResDTO): { user_Id: string, auth_provider: string, email: string, notification_enabled: boolean, role: string }
 * @returns {Promise<import("axios").AxiosResponse<{user_id: string, auth_provider: string, email: string, notification_enabled: boolean, role: string}>>} UserInfoResDTO 포함 응답
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
    // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
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

// --- 정원 관련 API 함수 ---

/**
 * 현재 진행 중인 정원 정보 불러오기
 * [GET] /gardens/current
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가)
 * 요청 파라미터: currentDate: string
 * 성공 응답 본문(CurrentGardenResDTO): {
 *   garden_id: string, // 서버에서 관리하는 현재 정원의 ID
 *   tree_level: number, // 현재 나무 레벨 (int)
 *   sky_color: string, // 현재 하늘 색상
 *   is_complete: boolean, // 정원 완성 여부
 *   flowers: Array<{
 *     flower_instance_id: string, // 클라이언트/서버 간 동기화되는 꽃의 고유 ID
 *     flower_type: {
 *       id: number, // 꽃 종류의 고유 ID (int)
 *       image_url: string // 꽃 이미지의 URL
 *     },
 *     position: {
 *       x: number, // x 좌표 (float)
 *       y: number  // y 좌표 (float)
 *     },
 *     emotion_type_id: number // 감정 종류의 ID (int)
 *   }>
 * }
 * @returns {Promise<import("axios").AxiosResponse<CurrentGardenResDTO>>} CurrentGardenResDTO 포함 응답
 */
export const getCurrentGarden = (currentDateString) => {
  return apiClient.get('/gardens/current', {
    params: {
      currentDate: currentDateString
    }
  });
};

/**
 * 현재 진행 중인 정원 정보 저장/업데이트
 * [PUT] /gardens/current (또는 API 설계에 따라 POST일 수 있음)
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가)
 * 요청 본문(SaveCurrentGardenReqDTO - 가정된 형식): {
 *   garden_id?: string | null, // 업데이트할 기존 정원 ID (새 정원일 경우 null 또는 생략)
 *   tree_level: number,
 *   snapshot_taken: boolean,
 *   flowers: Array<{
 *     id: string,
 *     emotion_key: string,
 *     image_key: string,
 *     emotion_name: string,
 *     questions_answers: jsonb
 *     messages: Array<{ sender: 'user' | 'bot', text: string, id?: string }>,
 *     creation_date: string,
 *     relative_pos: { topRatio: number, leftRatio: number } | null
 *   }>
 * }
 * 성공 응답: 200 OK (업데이트된 정원 정보 또는 garden_id 포함 가능)
 * @param {SaveCurrentGardenReqDTO} gardenData - 저장할 정원 데이터
 * @returns {Promise<import("axios").AxiosResponse<any>>} 성공 시 응답 (업데이트된 garden_id 등 포함 가능)
 */
export const saveCurrentGarden = (gardenData) => {
  // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
  // API 엔드포인트 및 메소드(PUT/POST)는 실제 백엔드 설계에 맞춰야 합니다.
  // 여기서는 PUT /gardens/current 로 가정합니다.
  return apiClient.put('/gardens/current', gardenData);
};

/**
 * 정원 완성 처리 (이름 결정 및 스냅샷 이미지 업로드)
 * [POST] /gardens/{garden_id}/complete
 * 요청 헤더: Authorization: Bearer <user_token> (요청 인터셉터에서 자동 추가)
 *            Content-Type: multipart/form-data (FormData 사용 시 Axios가 자동 설정)
 * 요청 본문(FormData):
 *   - name: string (사용자가 정한 정원 이름)
 *   - completedDate: string
 *   - snapshot_image: File (스냅샷 이미지 파일, 선택적)
 * 성공 응답 본문(CompleteGardenResDTO): {
 *   garden_id: string,
 *   name: string,
 *   completed_at: string,
 *   snapshot_image_url: string
 * }
 * @param {string} gardenId - 완성 처리할 정원의 ID (경로 파라미터)
 * // param {FormData} formData - 이름과 스냅샷 이미지 파일(선택적)을 포함하는 FormData 객체
 * @returns {Promise<import("axios").AxiosResponse<CompleteGardenResDTO>>} CompleteGardenResDTO 포함 응답
 */
export const completeGarden = (gardenId, completedGardenData) => {
  return apiClient.post(`/gardens/${gardenId}/complete`, completedGardenData);
};

// --- 기존 정원 API 함수들 (주석은 원래 제공된 상세한 내용 유지) ---

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
 * @returns {Promise<import("axios").AxiosResponse<GardenStorageResDTO>>} GardenStorageResDTO 포함 응답
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
 * @returns {Promise<import("axios").AxiosResponse<PreviousGardenResDTO>>} PreviousGardenResDTO 포함 응답
*/
export const getGardenDetails = (gardenId) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // URL 경로에 gardenId를 포함시킵니다. GET 요청이므로 본문은 없습니다.
 return apiClient.get(`/gardens/${gardenId}`);
};

// --- 나머지 기존 API 함수들 (주석은 원래 제공된 상세한 내용 유지) ---

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
 * @returns {Promise<import("axios").AxiosResponse<ConversationResDTO>>} ConversationResDTO 포함 응답
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
 *   record_date: string
 *   questions_answers: jsonb
 * }
 * 성공 응답 본문: 없음음
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
 * [GET] /daily-records/monthly
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
 * @returns {Promise<import("axios").AxiosResponse<CalenderResDTO>>} CalenderResDTO 포함 응답
*/
export const getMonthlyRecords = (year, month) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // API가 월(month)을 두 자리 문자열(예: '05')로 요구할 수 있으므로 변환합니다.
 const formattedMonth = String(month).padStart(2, '0');
 // GET 요청의 config 객체에 params로 쿼리 파라미터를 전달합니다.
 return apiClient.get('/daily-records/monthly', { params: { year, month: formattedMonth } });
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
 * @returns {Promise<import("axios").AxiosResponse<ResultResDTO>>} ResultResDTO 포함 응답
*/
export const getDailyRecordResult = (date) => {
 // Authorization 헤더는 인터셉터가 자동으로 추가합니다.
 // GET 요청의 config 객체에 params로 쿼리 파라미터를 전달합니다.
 return apiClient.get('/daily-records', { params: { date } });
};

// apiClient 인스턴스 자체를 내보낼 필요는 보통 없습니다.
// 위에서 정의한 개별 API 함수들을 export 하여 사용합니다.
// export default apiClient; // 특별한 경우(예: 인터셉터 외부에서 직접 설정 변경)에만 사용 고려