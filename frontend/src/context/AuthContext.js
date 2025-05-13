// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { PROVIDER_USER_ID_KEY, ACCESS_TOKEN_KEY } from '../constants/storageKeys';
import { createInitialGuestUser, issueUserToken } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 게스트도 로그인 상태로 간주
  const [accessToken, setAccessToken] = useState(null);
  const [providerUserId, setProviderUserId] = useState(null);
  const [isNewAccountJustCreated, setIsNewAccountJustCreated] = useState(false); // 새로운 계정 생성 플래그 상태 추가

  // 인증 상태 초기화 또는 복구 함수
  const initializeAuth = async () => {
    setIsLoading(true);
    // setIsNewAccountJustCreated(false); // 초기화 시 항상 false로 시작 (선택적)
    try {
      const storedProviderId = await SecureStore.getItemAsync(PROVIDER_USER_ID_KEY);
      const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

      if (storedProviderId && storedToken) {
        console.log('AuthContext: Found existing provider_id and token.');
        setProviderUserId(storedProviderId);
        setAccessToken(storedToken);
        setIsLoggedIn(true);
        setIsNewAccountJustCreated(false); // 기존 계정 로드 시 새 계정 플래그는 false
      } else if (storedProviderId && !storedToken) {
        // ID는 있는데 토큰이 없는 비정상적 상황 -> 토큰 재발급 시도
        console.log('AuthContext: Found provider_id but no token. Attempting token refresh.');
        try {
          const response = await issueUserToken(storedProviderId);
          const newAccessToken = response.data.access_token; // 실제 필드명 확인
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
          setProviderUserId(storedProviderId);
          setAccessToken(newAccessToken);
          setIsLoggedIn(true);
          setIsNewAccountJustCreated(false); // 토큰만 재발급한 것이므로 새 계정 플래그는 false
          console.log('AuthContext: Token refreshed successfully.');
        } catch (refreshError) {
          console.error('AuthContext: Failed to refresh token, creating new guest.', refreshError);
          // 토큰 재발급 실패 시 새 게스트 생성 (이 함수 내에서 플래그 설정됨)
          await createNewGuestSession();
        }
      } else {
        // ID도 토큰도 없는 경우 -> 새 게스트 생성
        console.log('AuthContext: No existing session. Creating new guest user.');
        await createNewGuestSession(); // 새 게스트 생성 (이 함수 내에서 플래그 설정됨)
      }
    } catch (error) {
      console.error('AuthContext: Error during initialization, attempting to create new guest.', error);
      // 어떤 에러든 발생 시 새 게스트 생성을 시도 (최후의 수단)
      try {
          await createNewGuestSession();
      } catch (finalError) {
          console.error('AuthContext: CRITICAL - Failed to create new guest session on final attempt.', finalError);
          setIsLoggedIn(false); // 이 경우 앱 사용 불가 상태
          setIsNewAccountJustCreated(false); // 실패 시 플래그 false
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 인증 로직 실행
  useEffect(() => {
    initializeAuth();
  }, []); // 빈 의존성 배열로 마운트 시 1회만 실행

  // 새로운 게스트 세션을 생성하는 함수
  const createNewGuestSession = async () => {
    // 기존 정보 클리어 (안전장치)
    await SecureStore.deleteItemAsync(PROVIDER_USER_ID_KEY);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);

    const response = await createInitialGuestUser();
    const newProviderUserId = response.data.provider_user_id; // 실제 필드명 확인
    const newAccessToken = response.data.access_token;       // 실제 필드명 확인

    await SecureStore.setItemAsync(PROVIDER_USER_ID_KEY, newProviderUserId);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);

    setProviderUserId(newProviderUserId);
    setAccessToken(newAccessToken);
    setIsLoggedIn(true);
    setIsNewAccountJustCreated(true); // <-- 새 계정 생성 완료 후 플래그를 true로 설정
    console.log('AuthContext: New guest session created and flag set.');
  };

  // 새로운 계정 생성 플래그를 외부에서 초기화하는 함수
  const clearNewAccountFlag = () => {
    // 상태가 실제로 true일 때만 false로 변경하여 불필요한 리렌더링 방지
    if (isNewAccountJustCreated) {
        setIsNewAccountJustCreated(false);
        console.log('AuthContext: New account flag cleared.');
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    setIsLoading(true); // 로그아웃 처리 중 로딩 상태 표시 (선택적)
    await SecureStore.deleteItemAsync(PROVIDER_USER_ID_KEY);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    setProviderUserId(null);
    setAccessToken(null);
    setIsLoggedIn(false);
    setIsNewAccountJustCreated(false); // 로그아웃 시 플래그 초기화
    console.log('AuthContext: User logged out. All tokens cleared.');
    // 필요시 로그아웃 후 특정 화면으로 이동 로직 추가 (네비게이션 컨텍스트 필요)
    setIsLoading(false);
  };

  // Context로 전달할 값들
  const authContextValue = {
    isLoading,
    isLoggedIn,
    accessToken,
    providerUserId,
    isNewAccountJustCreated, // 새 계정 생성 플래그 상태
    logout,
    refreshAuth: initializeAuth, // 인증 상태 강제 새로고침 함수
    createNewGuest: createNewGuestSession, // 명시적으로 새 게스트 생성 함수 (필요시 사용)
    clearNewAccountFlag, // 새 계정 플래그 초기화 함수
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

// Context를 사용하기 위한 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};