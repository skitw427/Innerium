// src/context/GardenContext.js
import React, { createContext, useState, useEffect, useContext, useCallback  } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentGarden } from '../api/apiClient';

export const GardenContext = createContext();

export const GardenProvider = ({ children }) => {
  const { isLoggedIn, token } = useAuth(); // token은 인터셉터에서 사용되므로 isLoggedIn이 중요

  // --- 기존 상태 (서버 데이터로 초기화될 예정) ---
  const [placedFlowers, setPlacedFlowers] = useState([]); // 꽃 배열 상태

  // --- 새롭게 추가/분리된 상태 ---
  const [currentGardenDetails, setCurrentGardenDetails] = useState(null); // 꽃을 제외한 정원 정보
  const [isLoadingGarden, setIsLoadingGarden] = useState(false); // 초기 로딩은 false, fetch 시작 시 true
  const [gardenError, setGardenError] = useState(null);

  useEffect(() => {
    const loadInitialDataFromStorage = async () => {
      if (isLoggedIn) { // 로그인 상태일 때만 시도
        setIsLoadingGarden(true); // 초기 로딩 시작 (선택적)
        try {
          const detailsString = await AsyncStorage.getItem(ASYNC_STORAGE_GARDEN_DETAILS_KEY);
          const flowersString = await AsyncStorage.getItem(ASYNC_STORAGE_PLACED_FLOWERS_KEY);

          if (detailsString) {
            setCurrentGardenDetails(JSON.parse(detailsString));
          }
          if (flowersString) {
            const parsedFlowers = JSON.parse(flowersString);
            // HomeScreen에서처럼 source 필드 재구성 로직이 필요할 수 있음
            setPlacedFlowers(parsedFlowers.map(flower => {
                if (flower.emotionKey && flower.imageKey && IMAGES.flowers[flower.emotionKey] && IMAGES.flowers[flower.emotionKey][flower.imageKey]) {
                    return { ...flower, source: IMAGES.flowers[flower.emotionKey][flower.imageKey] };
                }
                return flower;
            }));
          }
          console.log('[GardenContext] Initial data loaded from AsyncStorage.');
        } catch (error) {
          console.error('[GardenContext] Failed to load initial data from AsyncStorage:', error);
          // 에러 발생 시 상태를 초기화하거나, 기존 상태 유지
        } 
      }
    };
    // loadInitialDataFromStorage();
  }, [isLoggedIn]);
  
  // --- API 호출 및 데이터 처리 함수 ---
  const fetchCurrentGarden = useCallback(async () => {
    if (isLoggedIn) { // 사용자가 로그인 되어 있을 때만 실행
      setIsLoadingGarden(true);
      setGardenError(null);
      try {
        console.log('[GardenContext] Fetching current garden data...');
        const response = await getCurrentGarden(); // API 호출
        const gardenData = response.data; // CurrentGardenResDTO

        // 꽃 정보와 나머지 정원 정보 분리
        const { flowers, ...details } = gardenData;

        setCurrentGardenDetails(details); // garden_id, tree_level, sky_color, is_complete 등
        setPlacedFlowers(flowers || []);  // API 응답의 flowers 배열로 placedFlowers 상태 초기화/업데이트

        console.log('[GardenContext] Current garden data loaded. Details:', details, 'Flowers count:', flowers?.length || 0);
      } catch (err) {
        console.error("[GardenContext] Failed to fetch current garden data:", err);
        const errorMessage = err.response?.data?.message || err.message || '정원 정보를 불러오는데 실패했습니다.';
        setGardenError(errorMessage);
        setCurrentGardenDetails(null); // 에러 발생 시 관련 상태 초기화
        setPlacedFlowers([]);          // 에러 발생 시 꽃 정보도 초기화
      } finally {
        setIsLoadingGarden(false);
      }
    } else {
      // 로그인되지 않은 경우 모든 관련 상태 초기화
      setCurrentGardenDetails(null);
      setPlacedFlowers([]);
      setIsLoadingGarden(false); // 로딩 상태 명시적 종료
      setGardenError(null);      // 에러 상태 초기화
    }
  }, [isLoggedIn]);

  // --- 인증 상태 변경 시 데이터 로드 ---
  useEffect(() => {
    fetchCurrentGarden();
  }, [fetchCurrentGarden]);

  // --- 기존 꽃 추가 함수 ---
  const addFlower = useCallback((newFlower) => {
    setPlacedFlowers(prevFlowers => {
      console.log('[GardenContext] Adding flower. Previous count:', prevFlowers.length);
      const updatedFlowers = [...prevFlowers, newFlower];
      console.log('[GardenContext] Updated flowers count:', updatedFlowers.length);
      return updatedFlowers;
    });
  }, []);

  const value = {
    placedFlowers,
    addFlower,
    currentGardenDetails,
    isLoadingGarden,
    gardenError,
    refreshCurrentGarden: fetchCurrentGarden,
  }; 

  return (
    <GardenContext.Provider value={value}>
      {children}
    </GardenContext.Provider>
  );
};

export const useGarden = () => {
  const context = useContext(GardenContext);
  if (context === undefined) {
    throw new Error('useGarden must be used within a GardenProvider');
  }
  return context;
};