// src/context/GardenContext.js
import React, { createContext, useState, useEffect, useContext, useCallback  } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentGarden, completeGarden as completeGardenApiCall } from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IMAGES from '../constants/images';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';

const GARDEN_DETAILS_KEY = '@currentGardenDetails';
const PLACED_FLOWERS_KEY = '@placedFlowers';
const CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY = '@CalendarScreen_InitialSyncDone_v1';
const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';



const emotionTypeIdToClientMap = {
  1: { key: 'Ag', name: '분노' },
  2: { key: 'Ax', name: '불안' },
  3: { key: 'Dg', name: '역겨움' },
  4: { key: 'Dr', name: '갈망' },
  5: { key: 'F', name: '두려움' },
  6: { key: 'H', name: '행복' },
  7: { key: 'R', name: '평온' },
  8: { key: 'S', name: '슬픔' },
};

const emotionKeyToTypeIdMap = Object.entries(emotionTypeIdToClientMap).reduce((acc, [id, data]) => {
  acc[data.key] = parseInt(id, 10);
  return acc;
}, {});

export const GardenContext = createContext();

export const GardenProvider = ({ children }) => {
  const { isLoggedIn, token } = useAuth();

  const [placedFlowers, setPlacedFlowers] = useState([]); // 꽃 배열 상태
  const [currentGardenDetails, setCurrentGardenDetails] = useState(null); // 꽃을 제외한 정원 정보
  const [isLoadingGarden, setIsLoadingGarden] = useState(false); // 초기 로딩은 false, fetch 시작 시 true
  const [isCompletingGarden, setIsCompletingGarden] = useState(false);
  const [gardenError, setGardenError] = useState(null);
  const [isNewGarden, setIsNewGarden] = useState(false);

  useEffect(() => {
    const loadInitialDataFromStorage = async () => {
      if (isLoggedIn) { // 로그인 상태일 때만 시도
        setIsLoadingGarden(true); // 초기 로딩 시작 (선택적)
        try {
          const detailsString = await AsyncStorage.getItem(GARDEN_DETAILS_KEY);
          const flowersString = await AsyncStorage.getItem(PLACED_FLOWERS_KEY);

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
    loadInitialDataFromStorage();
  }, [isLoggedIn]);
  
  // --- API 호출 및 데이터 처리 함수 ---
  const fetchCurrentGarden = useCallback(async () => {
    if (isLoggedIn) {
      setIsLoadingGarden(true);
      setGardenError(null);
      try {
        const currentAppDateForStorage = await getAppCurrentDate();
        const formattedCurrentAppDate = formatDateToYYYYMMDD(currentAppDateForStorage);

        console.log('[GardenContext] Fetching current garden data from API...');
        const response = await getCurrentGarden(formattedCurrentAppDate); // API 호출
        const apiGardenData = response.data; // CurrentGardenResDTO

        const { flowers: apiFlowers, ...apiDetails } = apiGardenData;

        // 1. API 응답을 클라이언트 형식으로 변환
        const transformedFlowers = (apiFlowers || []).map(apiFlower => {
          // 감정 매핑
          const emotionInfo = emotionTypeIdToClientMap[apiFlower.emotion_type_id] || { key: 'unknown', name: '알 수 없는 감정' };

          // 메시지(questions_answers) 변환 및 ID 생성
          const clientMessages = (apiFlower.questions_answers || []).flatMap((qa, index) => [
            { id: `bot-${apiFlower.flower_instance_id}-${index}`, sender: 'bot', text: qa.question },
            { id: `user-${apiFlower.flower_instance_id}-${index}`, sender: 'user', text: qa.answer }
          ]);

          const imageKey = apiFlower.flower_type.name;
          let flowerSource = { uri: apiFlower.flower_type.image_url }; // 기본값은 API URL
          if (IMAGES.flowers && IMAGES.flowers[emotionInfo.key] && IMAGES.flowers[emotionInfo.key][imageKey]) {
            flowerSource = IMAGES.flowers[emotionInfo.key][imageKey];
          } else {
             console.warn(`[GardenContext] Local image not found for emotionKey: ${emotionInfo.key}, imageKey: ${imageKey}. Using URL: ${apiFlower.flower_type.image_url}`);
          }

          return {
            id: apiFlower.flower_instance_id, // flower_instance_id -> id
            source: flowerSource,
            emotionKey: emotionInfo.key,
            imageKey: imageKey, // flower_type.name -> imageKey
            emotionName: emotionInfo.name,
            messages: clientMessages,
            creationDate: apiFlower.record_date ? formatDateToYYYYMMDD(new Date(apiFlower.record_date)) : formatDateToYYYYMMDD(new Date()),
            position: apiFlower.position, // {x, y}

            serverFlowerTypeId: apiFlower.flower_type.id,
            serverEmotionTypeId: apiFlower.emotion_type_id,
          };
        });

        // 2. Context 상태 업데이트
        setCurrentGardenDetails(apiDetails);
        setPlacedFlowers(transformedFlowers);

        console.log('[GardenContext] API data loaded and transformed. Details:', apiDetails, 'Transformed Flowers count:', transformedFlowers.length);
        console.log('[GardenContext] Sample transformed flower:', JSON.stringify(transformedFlowers[0], null, 2));
        
        setIsNewGarden(false);
        if (transformedFlowers.length === 0) {
          const lastFlowers = AsyncStorage.getItem(PLACED_FLOWERS_KEY);
          if (lastFlowers.length !== 0) setIsNewGarden(true);
        }

        // 3. 업데이트된 데이터를 AsyncStorage에 저장
        try {
          await AsyncStorage.setItem(GARDEN_DETAILS_KEY, JSON.stringify(apiDetails));
          // transformedFlowers는 이미 클라이언트 형식 (source 포함)
          await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(transformedFlowers));
          console.log('[GardenContext] Transformed API data saved to AsyncStorage.');
        } catch (storageError) {
          console.error('[GardenContext] Failed to save transformed API data to AsyncStorage:', storageError);
        }
        
        if (transformedFlowers[-1]) {
          await AsyncStorage.setItem(LAST_DIAGNOSIS_DATE_KEY, transformedFlowers[-1].creationDate);
        }
        await AsyncStorage.setItem(CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY, 'true');

      } catch (err) {
        console.error("[GardenContext] Failed to fetch/process current garden data from API:", err);
        const errorMessage = err.response?.data?.message || err.message || '정원 정보를 불러오는데 실패했습니다.';
        setGardenError(errorMessage);
        setCurrentGardenDetails(null);
        setPlacedFlowers([]);
      } finally {
        setIsLoadingGarden(false);
      }
    } else {
      // 로그인되지 않은 경우 모든 관련 상태 및 AsyncStorage 데이터 클리어
      setCurrentGardenDetails(null);
      setPlacedFlowers([]);
      setIsLoadingGarden(false);
      setGardenError(null);
      try {
        await AsyncStorage.removeItem(GARDEN_DETAILS_KEY);
        await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
        console.log('[GardenContext] User not logged in or logged out, cleared garden data from AsyncStorage.');
      } catch (clearError) {
        console.error('[GardenContext] Failed to clear AsyncStorage:', clearError);
      }
    }
  }, [isLoggedIn]); // IMAGES, formatDateToYYYYMMDD 등 외부 의존성 추가 가능하나, 함수 스코프 내에서 참조하므로 필수는 아님

  useEffect(() => {
    fetchCurrentGarden();
  }, [fetchCurrentGarden]); // fetchCurrentGarden은 isLoggedIn에 따라 재생성

  // --- 정원 완성 처리 함수 ---
  const completeGarden = useCallback(async (gardenId, gardenName, completedDate) => {
    if (!gardenId || !gardenName || !completedDate) {
      throw new Error("Garden ID and Name are required to complete the garden.");
    }
    setIsCompletingGarden(true); // 정원 완성 처리 중 로딩 상태 시작
    setGardenError(null);
    try {
      const gardenDataForCompletion = {
        name: gardenName,
        completedDate: completedDate
      };
    

      console.log(`[GardenContext] Attempting to complete garden ID: ${gardenId} with name: ${gardenName}`);
      const response = await completeGardenApiCall(gardenId, gardenDataForCompletion);
      console.log('[GardenContext] Garden completed successfully on server:', response.data);

      await fetchCurrentGarden();

      return response.data;
    } catch (error) {
      console.error('[GardenContext] Failed to complete garden on server:', error);
      const errorMessage = error.response?.data?.message || error.message || '정원 완성에 실패했습니다.';
      setGardenError(errorMessage);
      throw error; // 에러를 다시 throw하여 호출한 쪽(HomeScreen)에서 처리할 수 있도록 함
    } finally {
      setIsCompletingGarden(false); // 로딩 상태 종료
    }
  }, [fetchCurrentGarden]); // fetchCurrentGarden 의존성

  // 꽃 추가 함수: 서버 동기화가 우선되어야 함
  // 현재는 클라이언트에서만 추가하고 AsyncStorage에 저장하는 방식
  // 이상적으로는 서버에 꽃을 추가하고, 성공 응답을 받으면 fetchCurrentGarden()을 다시 호출하여 전체 상태를 동기화
  const addFlower = useCallback(async (newFlowerData) => { // newFlowerData는 HomeScreen에서 생성된 형식
    // TODO: 서버에 꽃 추가 API 호출 로직 구현
    // 예: await addFlowerToServerAPI(newFlowerData);
    // 호출 성공 후, 전체 정원 정보를 다시 불러오는 것이 가장 확실함
    // await fetchCurrentGarden();

    // 임시: 클라이언트 상태 및 AsyncStorage만 업데이트 (서버 API 구현 전)
    setPlacedFlowers(prevFlowers => {
      const updatedFlowers = [...prevFlowers, newFlowerData];
      AsyncStorage.setItem(ASYNC_STORAGE_PLACED_FLOWERS_KEY, JSON.stringify(updatedFlowers))
        .then(() => console.log('[GardenContext] (Client-side) Flower added and saved to AsyncStorage.'))
        .catch(err => console.error("Failed to save flowers to AsyncStorage after add:", err));
      return updatedFlowers;
    });
  }, [fetchCurrentGarden]); // fetchCurrentGarden 의존성 추가 (서버 업데이트 후 재호출 위해)

  const value = {
    placedFlowers,
    setPlacedFlowers,
    addFlower,
    currentGardenDetails,
    isLoadingGarden,
    isCompletingGarden,
    gardenError,
    refreshCurrentGarden: fetchCurrentGarden,
    completeGarden,
    isNewGarden,
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