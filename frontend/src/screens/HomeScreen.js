// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackHandler, Alert, Platform, ScrollView, FlatList } from 'react-native'; // FlatList import 추가
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, TouchableOpacity, Image, Text,
  ImageBackground, SafeAreaView, useWindowDimensions, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

// --- 상수 정의 ---
const TREE_IMAGE_SCALE_BASE = 0.3; const TREE_IMAGE_SCALE_2 = 0.4;
const TREE_IMAGE_SCALE_4 = 0.6; const TREE_IMAGE_SCALE_6 = 0.75;
const TREE_IMAGE_SCALE_8 = 0.85; const TREE_IMAGE_SCALE_10 = 1;
const TOP_SPACER_RATIO = 0.1; const TREE_CONTAINER_AREA_RATIO = 0.4;
const BUTTON_BOTTOM_FIXED_MARGIN = 25;
const ESTIMATED_NAV_BAR_HEIGHT = 110;
const FLOWER_HEIGHT_RATIO_OF_WINDOW = 0.08;
const MAX_FLOWER_HEIGHT = 60;
const MIN_FLOWER_HEIGHT = 20;

const RELATIVE_FLOWER_POSITIONS = [
  { topRatio: 0.07, leftRatio: 0.2 }, { topRatio: 0.10, leftRatio: 0.5 }, { topRatio: 0.08, leftRatio: 0.8 },
  { topRatio: 0.35, leftRatio: 0.1 }, { topRatio: 0.40, leftRatio: 0.4 }, { topRatio: 0.38, leftRatio: 0.7 }, { topRatio: 0.42, leftRatio: 0.9 },
  { topRatio: 0.75, leftRatio: 0.25 }, { topRatio: 0.80, leftRatio: 0.55 }, { topRatio: 0.78, leftRatio: 0.85 },
];
const MAX_FLOWERS = RELATIVE_FLOWER_POSITIONS.length;

const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';
const PLACED_FLOWERS_KEY = '@placedFlowers';
const COMPLETED_GARDENS_KEY = '@completedGardens';
const CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY = '@currentGardenSnapshotTaken';

const keyToEmotionNameMap = {
  H: '행복', Ax: '불안', R: '평온', S: '슬픔',
  Ag: '분노', F: '두려움', Dr: '갈망', Dg: '역겨움',
};

const HomeScreen = ({ navigation, route }) => {
  // --- State 및 Hooks ---
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
   const { isNewAccountJustCreated, clearNewAccountFlag } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [resultModalEmotionIcon, setResultModalEmotionIcon] = useState(null);
  const [placedFlowers, setPlacedFlowers] = useState(null);
  const [isLoadingFlowers, setIsLoadingFlowers] = useState(true);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);
  const [showEmotionCheckButton, setShowEmotionCheckButton] = useState(true);
  const [isGardenFull, setIsGardenFull] = useState(false);
  const gardenViewRef = useRef();
  const [currentGardenSnapshotTaken, setCurrentGardenSnapshotTaken] = useState(false);
  const [isFlowerInfoModalVisible, setIsFlowerInfoModalVisible] = useState(false);
  const [selectedFlowerData, setSelectedFlowerData] = useState(null);
  const [showChatHistoryInModal, setShowChatHistoryInModal] = useState(false);

  // --- 계산된 값들 ---
  const topSpacerHeight = windowHeight * TOP_SPACER_RATIO;
  const treeContainerHeight = windowHeight * TREE_CONTAINER_AREA_RATIO;
  const treeContainerWidth = treeContainerHeight;
  const flowerCanvasStartY = topSpacerHeight + treeContainerHeight;
  const flowerCanvasPaddingHorizontal = windowWidth * 0.05;
  const flowerCanvasEndY = windowHeight - ESTIMATED_NAV_BAR_HEIGHT;
  const flowerCanvasHeight = flowerCanvasEndY - flowerCanvasStartY;
  const flowerCanvasWidth = windowWidth - (flowerCanvasPaddingHorizontal * 2);
  const calculatedFlowerHeight = windowHeight * FLOWER_HEIGHT_RATIO_OF_WINDOW;
  const currentFlowerPixelHeight = Math.max(MIN_FLOWER_HEIGHT, Math.min(calculatedFlowerHeight, MAX_FLOWER_HEIGHT));

  // --- Effects ---

    // 새로운 계정 생성 팝업 표시 Effect
  useEffect(() => {
    if (isNewAccountJustCreated) {
      Alert.alert(
        "환영합니다!",
        "새로운 계정이 생성되었습니다!",
        [
          {
            text: "확인",
            onPress: () => clearNewAccountFlag() // 확인 시 플래그 초기화
          }
        ],
        { cancelable: false }
      );
    }
  }, [isNewAccountJustCreated, clearNewAccountFlag]); // isNewAccountJustCreated 상태 변경 시 실행

  // 초기 상태 로드
  useEffect(() => {
    
    const loadInitialState = async () => {
      setIsLoadingFlowers(true);
      try {
        const snapshotTakenValuePromise = AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY);
        const savedFlowersStringPromise = AsyncStorage.getItem(PLACED_FLOWERS_KEY);

        const [snapshotTakenValue, savedFlowersString] = await Promise.all([
            snapshotTakenValuePromise,
            savedFlowersStringPromise
        ]);

        const isSnapshotTaken = snapshotTakenValue === 'true';
        setCurrentGardenSnapshotTaken(isSnapshotTaken);
        
        let loadedFlowers = [];
        if (savedFlowersString !== null) {
          try {
            const parsedFlowers = JSON.parse(savedFlowersString);
            if (Array.isArray(parsedFlowers)) {
                loadedFlowers = parsedFlowers.length > MAX_FLOWERS && MAX_FLOWERS > 0
                                ? parsedFlowers.slice(0, MAX_FLOWERS)
                                : parsedFlowers;
            } else {
                console.warn('[HomeScreen] Invalid flower data in AsyncStorage, removing.');
                await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
            }
          } catch (parseError) {
            console.error('[HomeScreen] Failed to parse flowers from AsyncStorage, removing:', parseError);
            await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
          }
        } else {
          // 저장된 꽃이 없는데 스냅샷이 찍혔다고 되어있으면 플래그 초기화
          if (isSnapshotTaken) {
              console.log('[HomeScreen] No flowers found, but snapshot flag was true. Resetting flag.');
              await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
              setCurrentGardenSnapshotTaken(false);
          }
        }

        setPlacedFlowers(loadedFlowers);
        setIsGardenFull(loadedFlowers.length >= MAX_FLOWERS);

      } catch (error) {
        console.error('[HomeScreen] Error loading initial state:', error);
        setPlacedFlowers([]);
        setIsGardenFull(false);
        setCurrentGardenSnapshotTaken(false);
      } finally {
        setIsLoadingFlowers(false);
      }
    };
    loadInitialState();
  }, []);

  // 배치된 꽃 저장 및 정원 상태 업데이트
  useEffect(() => {
    if (isLoadingFlowers || placedFlowers === null) {
      return;
    }
    const savePlacedFlowers = async () => {
      try {
        if (Array.isArray(placedFlowers)) {
            if (placedFlowers.length > 0) {
                await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(placedFlowers));
            } else {
                // 꽃이 없으면 저장된 데이터 삭제
                await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
                const currentSnapshotFlag = await AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY);
                if (currentSnapshotFlag === 'true') {
                    // 꽃이 없는데 스냅샷 플래그가 true면 false로 변경
                    await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
                    setCurrentGardenSnapshotTaken(false);
                }
            }
        }
      } catch (error) {
        console.error('[HomeScreen] Failed to save placed flowers:', error);
      }
    };
    savePlacedFlowers();

    if(Array.isArray(placedFlowers)) {
        const currentGardenFullState = placedFlowers.length >= MAX_FLOWERS;
        if (isGardenFull !== currentGardenFullState) {
            setIsGardenFull(currentGardenFullState);
        }
    }
  }, [placedFlowers, isLoadingFlowers, isGardenFull]); // isGardenFull 의존성 추가 (루프 방지 위해 검토 필요할 수 있음)

  // 정원 스냅샷 촬영 및 저장
  const captureAndSaveGarden = useCallback(async () => {
    if (!gardenViewRef.current) {
        console.warn("[HomeScreen] gardenViewRef is not available for capture.");
        return;
    }
    try {
      const base64Data = await gardenViewRef.current.capture({ format: "jpg", quality: 0.8, result: "base64" });
      const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
      const completedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
      completedGardens.push({ timestamp: Date.now(), snapshotData: `data:image/jpeg;base64,${base64Data}` });
      await AsyncStorage.setItem(COMPLETED_GARDENS_KEY, JSON.stringify(completedGardens));
      Alert.alert("정원 완성!", "현재 정원의 모습이 보관함에 저장되었습니다.");
      await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'true');
      setCurrentGardenSnapshotTaken(true);
    } catch (error) {
      console.error("[HomeScreen] Failed to capture and save garden:", error);
      Alert.alert("오류", "정원 이미지를 저장하는 데 실패했습니다.");
    }
  }, []); // gardenViewRef는 ref이므로 의존성 배열에 포함하지 않음

  // 정원이 가득 차면 자동으로 스냅샷 촬영
  useEffect(() => {
    if (isGardenFull && !currentGardenSnapshotTaken && !isLoadingFlowers) {
      // isLoadingFlowers 조건 추가: 초기 로드 중에는 스냅샷 찍지 않음
      const timer = setTimeout(() => {
        captureAndSaveGarden();
      }, 500); // 약간의 딜레이를 주어 렌더링 안정화
      return () => clearTimeout(timer);
    }
  }, [isGardenFull, currentGardenSnapshotTaken, captureAndSaveGarden, isLoadingFlowers]);

  // 오늘 진단 가능 여부 체크 함수
  const checkDiagnosisStatus = useCallback(async () => {
    try {
      const lastDiagnosisDate = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
      const currentAppDateObj = await getAppCurrentDate();
      const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);
      const canDiagnoseToday = lastDiagnosisDate !== currentAppDateFormatted;
      setShowEmotionCheckButton(canDiagnoseToday);
    } catch (error) {
      console.error('[HomeScreen] Failed to check diagnosis status:', error);
      setShowEmotionCheckButton(true); // 오류 발생 시 기본적으로 버튼 표시
    }
  }, [getAppCurrentDate, formatDateToYYYYMMDD]); // 의존성 배열 수정

  // 화면 포커스 시 실행되는 로직 (날짜 변경에 따른 정원 초기화 및 진단 상태 체크)
  useFocusEffect(
    useCallback(() => {
      const performFocusActions = async () => {
        if (isLoadingFlowers) return; // 데이터 로딩 중에는 아래 로직 실행 안 함

        let gardenWasReset = false;

        // 1. 날짜 변경에 따른 정원 초기화 먼저 시도
        if (isGardenFull && currentGardenSnapshotTaken) {
          try {
            const lastKnownDateForGarden = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY); // 진단 날짜를 정원 사용 날짜로 간주
            const currentAppDateObj = await getAppCurrentDate();
            const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);

            if (lastKnownDateForGarden && lastKnownDateForGarden !== currentAppDateFormatted) {
              console.log('[HomeScreen] Date changed, garden was full & snapshot taken. Resetting garden.');
              
              setPlacedFlowers([]); // 정원 비우기
              setCurrentGardenSnapshotTaken(false); // 스냅샷 상태 초기화
              setIsGardenFull(false); // 정원 가득 참 상태 초기화

              await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
              await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
              // 이전 진단 날짜 기록 삭제하여 오늘 다시 진단 가능하도록 함
              await AsyncStorage.removeItem(LAST_DIAGNOSIS_DATE_KEY);
              
              gardenWasReset = true;
              Alert.alert("새로운 날", "새로운 정원을 가꿀 시간입니다!");
            }
          } catch (error) {
            console.error('[HomeScreen] Error in resetting garden logic on date change:', error);
          }
        }

        // 2. 진단 상태 체크 (정원 초기화 여부와 관계없이, 또는 초기화 후 업데이트된 상태로 체크)
        // 정원이 리셋되었다면 setShowEmotionCheckButton(true)가 이미 호출된 효과가 있으므로,
        // checkDiagnosisStatus는 최신 LAST_DIAGNOSIS_DATE_KEY를 기반으로 다시 판단함.
        if (gardenWasReset) {
            setShowEmotionCheckButton(true); // 명시적으로 진단 버튼 보이게 함
        } else {
            await checkDiagnosisStatus(); // await 추가하여 순서 보장 및 최신 상태 반영
        }
      };

      performFocusActions();

      // 안드로이드 뒤로가기 버튼 처리 (홈 화면에서는 앱 종료 방지 또는 특정 동작)
      const onBackPress = () => {
        // Alert.alert("앱 종료", "앱을 종료하시겠습니까?", [
        //   { text: "아니오", style: "cancel" },
        //   { text: "네", onPress: () => BackHandler.exitApp() }
        // ]);
        return true; // true를 반환하면 기본 뒤로가기 동작(앱 종료 등)을 막음
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [
        isLoadingFlowers, 
        isGardenFull, 
        currentGardenSnapshotTaken, 
        checkDiagnosisStatus, 
        getAppCurrentDate, 
        formatDateToYYYYMMDD
    ])
  );

  // 진단 결과 처리
  useEffect(() => {
    if (route.params?.diagnosisResult && route.params?.emotionKey && !isLoadingFlowers && Array.isArray(placedFlowers)) {
      const { diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages } = route.params;
      
      // 네비게이션 파라미터 초기화 (중복 처리 방지)
      if (navigation && typeof navigation.setParams === 'function') {
          navigation.setParams({
              diagnosisResult: undefined,
              emotionKey: undefined,
              primaryEmotionName: undefined,
              diagnosisMessages: undefined
          });
      }

      const processDiagnosisResult = async (result, key, name, messages) => {
        let flowerImageForModal = null;
        let emotionIconForModal = null;
        let shouldPlantNewFlower = false;
        let newFlowerDataForPlanting = null;

        if (key && IMAGES.emotionIcon && IMAGES.emotionIcon[key]) {
            emotionIconForModal = IMAGES.emotionIcon[key];
        }

        if (key && IMAGES.flowers && IMAGES.flowers[key]) {
            const allImagesForEmotion = IMAGES.flowers[key];
            const allImageKeysForEmotion = Object.keys(allImagesForEmotion);

            if (allImageKeysForEmotion.length > 0) {
                const placedImageKeysForEmotion = placedFlowers.filter(f => f.emotionKey === key).map(f => f.imageKey);
                const availableImageKeysToPlant = allImageKeysForEmotion.filter(k => !placedImageKeysForEmotion.includes(k));

                if (availableImageKeysToPlant.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableImageKeysToPlant.length);
                    const imageKeyToPlant = availableImageKeysToPlant[randomIndex];
                    flowerImageForModal = allImagesForEmotion[imageKeyToPlant];
                    shouldPlantNewFlower = true;
                    const appCurrentDate = await getAppCurrentDate();
                    const formattedDate = formatDateToYYYYMMDD(appCurrentDate);
                    newFlowerDataForPlanting = {
                        id: `${Date.now()}-${key}-${imageKeyToPlant}`,
                        source: flowerImageForModal,
                        emotionKey: key,
                        imageKey: imageKeyToPlant,
                        emotionName: name || keyToEmotionNameMap[key] || '정보 없음',
                        messages: messages || [],
                        creationDate: formattedDate,
                        relativePos: null
                    };
                } else {
                    // 심을 수 있는 새 종류의 꽃이 없을 경우, 기존 꽃 중 하나를 모달에 표시
                     if (placedImageKeysForEmotion.length > 0) {
                        flowerImageForModal = allImagesForEmotion[placedImageKeysForEmotion[Math.floor(Math.random() * placedImageKeysForEmotion.length)]];
                    } else {
                        // 이론상 이 경우는 발생하기 어려움 (allImageKeysForEmotion > 0 이므로)
                        flowerImageForModal = allImagesForEmotion[allImageKeysForEmotion[0]];
                    }
                    shouldPlantNewFlower = false; // 새 꽃을 심지 않음
                    // 필요하다면 여기서 사용자에게 알림 (예: "이 감정의 모든 종류의 꽃을 이미 심었어요!")
                }
            } else {
                // 해당 감정에 대한 꽃 이미지가 아예 없는 경우
                shouldPlantNewFlower = false;
            }
        }

        if (shouldPlantNewFlower && newFlowerDataForPlanting && flowerCanvasHeight > 0) {
          setPlacedFlowers(prevFlowers => {
             if (!Array.isArray(prevFlowers)) { // 방어 코드
                console.warn("[HomeScreen] prevFlowers is not an array during planting.");
                return prevFlowers;
            }
            if (prevFlowers.length < MAX_FLOWERS) {
              let updatedFlowers = [...prevFlowers];
              let selectedRelativePos = null;
              const occupiedPositions = new Set(prevFlowers.map(f => f.relativePos ? JSON.stringify(f.relativePos) : null).filter(p => p !== null));
              const availablePlacementSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));
              
              if (availablePlacementSlots.length > 0) {
                const randomAvailableIndex = Math.floor(Math.random() * availablePlacementSlots.length);
                selectedRelativePos = availablePlacementSlots[randomAvailableIndex];
              } else {
                // 모든 정의된 위치가 찼다면, 랜덤 위치 중 하나를 재사용 (이론상 MAX_FLOWERS 도달 시 발생)
                // 이 경우는 prevFlowers.length < MAX_FLOWERS 조건과 상충될 수 있으므로,
                // MAX_FLOWERS에 도달하지 않았는데 availablePlacementSlots가 없는 경우는 로직 오류일 수 있음.
                // 여기서는 일단 정의된 위치 중 하나를 랜덤하게 선택하는 것으로 가정.
                console.warn("[HomeScreen] No available placement slots, but garden is not full. Check RELATIVE_FLOWER_POSITIONS and MAX_FLOWERS.");
                selectedRelativePos = RELATIVE_FLOWER_POSITIONS[Math.floor(Math.random() * RELATIVE_FLOWER_POSITIONS.length)];
              }
              
              newFlowerDataForPlanting.relativePos = selectedRelativePos;
              updatedFlowers.push(newFlowerDataForPlanting);
              return updatedFlowers;

            } else { // 정원이 가득 찬 경우 (MAX_FLOWERS 도달)
               Alert.alert("알림", "정원이 가득 차서 기존 꽃과 교체합니다.");
               let updatedFlowers = [...prevFlowers];
               const replaceIndex = Math.floor(Math.random() * prevFlowers.length);
               newFlowerDataForPlanting.relativePos = prevFlowers[replaceIndex].relativePos; // 교체될 꽃의 위치 사용
               updatedFlowers.splice(replaceIndex, 1, newFlowerDataForPlanting);
               return updatedFlowers;
            }
          });
        }

        setResultModalMessage(result);
        setResultModalImage(flowerImageForModal); // 새 꽃이 없더라도, 해당 감정의 기존 꽃을 보여줄 수 있음
        setResultModalEmotionIcon(emotionIconForModal);
        setIsResultModalVisible(true);
      };

      processDiagnosisResult(diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages);

    } else if (route.params?.diagnosisResult && isLoadingFlowers) {
         // 로딩 중에 진단 결과가 도착하면 파라미터만 정리 (처리를 위해 로딩 완료까지 기다리지 않음)
         if (navigation && typeof navigation.setParams === 'function') {
            navigation.setParams({
                diagnosisResult: undefined, emotionKey: undefined,
                primaryEmotionName: undefined, diagnosisMessages: undefined
            });
         }
    }
  }, [route.params, navigation, flowerCanvasHeight, placedFlowers, isLoadingFlowers, getAppCurrentDate, formatDateToYYYYMMDD]);

  // 꽃 개수에 따라 나무 이미지 변경
  useEffect(() => {
    if (Array.isArray(placedFlowers)) {
        const flowerCount = placedFlowers.length;
        let newTreeImageSource = IMAGES.treeImage; // 기본 나무
        let newImageScalingFactor = TREE_IMAGE_SCALE_BASE;

        if (flowerCount >= 10 && IMAGES.Tree_10) { newTreeImageSource = IMAGES.Tree_10; newImageScalingFactor = TREE_IMAGE_SCALE_10; }
        else if (flowerCount >= 8 && IMAGES.Tree_8) { newTreeImageSource = IMAGES.Tree_8; newImageScalingFactor = TREE_IMAGE_SCALE_8; }
        else if (flowerCount >= 6 && IMAGES.Tree_6) { newTreeImageSource = IMAGES.Tree_6; newImageScalingFactor = TREE_IMAGE_SCALE_6; }
        else if (flowerCount >= 4 && IMAGES.Tree_4) { newTreeImageSource = IMAGES.Tree_4; newImageScalingFactor = TREE_IMAGE_SCALE_4; }
        else if (flowerCount >= 2 && IMAGES.Tree_2) { newTreeImageSource = IMAGES.Tree_2; newImageScalingFactor = TREE_IMAGE_SCALE_2; }
        // flowerCount가 0 또는 1일 때는 기본 나무와 스케일 사용

        if (currentTreeImageSource !== newTreeImageSource) { setCurrentTreeImageSource(newTreeImageSource); }
        if (currentTreeImageScalingFactor !== newImageScalingFactor) { setCurrentTreeImageScalingFactor(newImageScalingFactor); }
    }
  }, [placedFlowers, currentTreeImageSource, currentTreeImageScalingFactor]); // current 상태값들도 의존성에 추가

  // --- 핸들러 함수들 ---
  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => {
      setIsModalVisible(false);
      handleNavigate(navigation, 'DeepDiagnosis');
  };
  const handleSimpleEmotionCheck = () => {
      setIsModalVisible(false);
      // 네비게이션 시 현재 화면 상태를 전달할 필요는 없음
      navigation.navigate('SimpleDiagnosis');
  };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    setResultModalEmotionIcon(null);
    setResultModalImage(null);
    // 결과 모달 닫힐 때 진단 상태 다시 체크 (오늘 진단 완료했으면 버튼 숨김)
    checkDiagnosisStatus();
  };

  const handleFlowerPress = (flower) => {
    if (!flower || !flower.emotionKey) return;
    setSelectedFlowerData({
        id: flower.id,
        source: flower.source,
        emotionKey: flower.emotionKey,
        imageKey: flower.imageKey,
        emotionName: flower.emotionName || keyToEmotionNameMap[flower.emotionKey] || '감정 정보 없음',
        messages: flower.messages || [],
        creationDate: flower.creationDate || null,
        relativePos: flower.relativePos
    });
    setShowChatHistoryInModal(false);
    setIsFlowerInfoModalVisible(true);
  };

  const handleFlowerInfoModalClose = () => {
    setIsFlowerInfoModalVisible(false);
    setSelectedFlowerData(null);
    setShowChatHistoryInModal(false);
  };

  const handleToggleChatHistoryInModal = () => {
    setShowChatHistoryInModal(prevState => !prevState);
  };

  const renderChatHistoryItem = ({ item }) => (
    <View style={[
      styles.chatMessageOuterContainer,
      item.sender === 'bot' ? styles.chatBotRowContainer : styles.chatUserRowContainer
    ]}>
      <View style={[
        styles.chatMessageBubble,
        item.sender === 'bot' ? styles.chatBotBubble : styles.chatUserBubble
      ]}>
        <Text style={styles.chatMessageText}>{item.text}</Text>
      </View>
    </View>
  );

  // --- JSX 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoadingFlowers && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>정원 불러오는 중...</Text>
        </View>
      )}

      {!isLoadingFlowers && (
        // ViewShot의 key를 추가하여 placedFlowers가 초기화될 때 ViewShot 내부도 리렌더링 유도 (필요 시)
        <ViewShot key={Array.isArray(placedFlowers) ? placedFlowers.length : 'initial'} ref={gardenViewRef} options={{ format: 'jpg', quality: 0.8, result: "base64" }} style={styles.gardenCaptureArea}>
          <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
            {flowerCanvasHeight > 0 && Array.isArray(placedFlowers) && placedFlowers.map(flower => {
              if (!flower || !flower.source) { // 방어 코드: flower 객체나 source가 없을 경우 렌더링 건너뛰기
                console.warn("[HomeScreen] Invalid flower data for rendering:", flower);
                return null;
              }
              const flowerImageAspectRatio = (flower.source.width && flower.source.height)
                                            ? flower.source.width / flower.source.height : 1;
              const flowerDisplayHeight = currentFlowerPixelHeight;
              const flowerDisplayWidth = flowerDisplayHeight * flowerImageAspectRatio;
              
              // relativePos가 없을 경우 기본 중앙값 사용
              const topRatio = flower.relativePos?.topRatio !== undefined ? flower.relativePos.topRatio : 0.5;
              const leftRatio = flower.relativePos?.leftRatio !== undefined ? flower.relativePos.leftRatio : 0.5;

              let calculatedTop = flowerCanvasStartY + (topRatio * flowerCanvasHeight) - (flowerDisplayHeight / 2);
              let calculatedLeft = flowerCanvasPaddingHorizontal + (leftRatio * flowerCanvasWidth) - (flowerDisplayWidth / 2);
              
              // 꽃이 캔버스 영역을 벗어나지 않도록 위치 조정
              calculatedTop = Math.max(flowerCanvasStartY, Math.min(calculatedTop, flowerCanvasEndY - flowerDisplayHeight));
              calculatedLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(calculatedLeft, flowerCanvasPaddingHorizontal + flowerCanvasWidth - flowerDisplayWidth));
              
              return (
                <TouchableOpacity 
                    key={flower.id} 
                    onPress={() => handleFlowerPress(flower)} 
                    style={[ 
                        styles.placedFlowerImageTouchable, 
                        { 
                            height: flowerDisplayHeight, 
                            width: flowerDisplayWidth, 
                            top: calculatedTop, 
                            left: calculatedLeft 
                        } 
                    ]}
                    activeOpacity={0.8} // 터치 피드백
                >
                  <Image source={flower.source} style={styles.placedFlowerImageActual} resizeMode="contain" />
                </TouchableOpacity>
              );
            })}
            <View style={styles.treeAreaWrapper}>
               <View style={{ height: topSpacerHeight }} />
               <View style={[styles.treeContainer, { height: treeContainerHeight, width: treeContainerWidth }]}>
                    <Image
                        source={currentTreeImageSource}
                        style={{ width: `${currentTreeImageScalingFactor * 100}%`, height: `${currentTreeImageScalingFactor * 100}%`}}
                        resizeMode="contain"
                    />
               </View>
            </View>
          </ImageBackground>
        </ViewShot>
      )}

      <View style={styles.uiOverlayContainer}>
        {!isLoadingFlowers && showEmotionCheckButton && (
          <View style={styles.bottomAreaContent}>
            <View style={styles.buttonWrapper}>
              <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
                <TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7} style={styles.fullWidthTouchable}>
                  <Text style={styles.buttonText}>감정 진단하기</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        )}
        <View style={styles.navigationBarPlacement}>
            <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
        </View>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleModalClose}>
         <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>감정 진단을 시작하시겠습니까?</Text>
              <View style={styles.modalButtons}>
                <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}>
                  <TouchableOpacity onPress={handleSimpleEmotionCheck} style={styles.modalButton} activeOpacity={0.7}>
                    <Text style={styles.modalButtonText}>간단 진단</Text>
                  </TouchableOpacity>
                </LinearGradient>
                <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}>
                  <TouchableOpacity onPress={handleConfirmEmotionCheck} style={styles.modalButton} activeOpacity={0.7}>
                    <Text style={styles.modalButtonText}>심층 진단</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </TouchableOpacity>
         </TouchableOpacity>
      </Modal>

      <Modal visible={isResultModalVisible} transparent={true} animationType="fade" onRequestClose={handleResultModalClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleResultModalClose}>
          <TouchableOpacity activeOpacity={1} style={styles.resultModalContentContainer}>
            <View style={styles.resultModalContent}>
              {resultModalEmotionIcon && (<Image source={resultModalEmotionIcon} style={styles.resultEmotionIcon} resizeMode="contain" />)}
              {resultModalImage ? (<Image source={resultModalImage} style={styles.resultFlowerImage} resizeMode="contain" />)
                : (<View style={styles.resultImagePlaceholder}><Text>새로운 꽃 없음</Text></View>)}
              <Text style={styles.resultModalText}>{resultModalMessage}</Text>
              <TouchableOpacity onPress={handleResultModalClose} style={styles.resultCloseButton} activeOpacity={0.7}>
                <Text style={styles.resultCloseButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {selectedFlowerData && (
        <Modal visible={isFlowerInfoModalVisible} transparent={true} animationType="fade" onRequestClose={handleFlowerInfoModalClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleFlowerInfoModalClose}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={[styles.flowerInfoModalContainer, { height: windowHeight * 0.6, maxHeight: 500 }]} // 높이 조정 및 최대 높이 설정
                >
                    <View style={styles.flowerInfoModalContent}>
                        {showChatHistoryInModal && selectedFlowerData.messages && selectedFlowerData.messages.length > 0 ? (
                            <>
                                <Text style={styles.flowerInfoTitle}>대화 기록</Text>
                                <View style={styles.chatHistoryContainer}>
                                    <FlatList
                                        data={selectedFlowerData.messages}
                                        renderItem={renderChatHistoryItem}
                                        keyExtractor={(item, index) => item.id || `chat-message-${index}-${Date.now()}`} // 더 고유한 키
                                        contentContainerStyle={{ paddingBottom: 10 }}
                                        style={{ flex: 1 }}
                                        inverted={false} // 일반적으로 채팅은 inverted 사용하지만, 여기서는 메시지 순서대로
                                    />
                                </View>
                                <View style={styles.flowerInfoButtonArea}>
                                    <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}>
                                        <Text style={styles.flowerInfoButtonText}>기본 정보 보기</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleFlowerInfoModalClose} style={[styles.flowerInfoButton, styles.flowerInfoCloseButton]}>
                                        <Text style={styles.flowerInfoButtonText}>닫기</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.flowerInfoTitle}>
                                    {selectedFlowerData.creationDate || '날짜 정보 없음'}
                                </Text>
                                <View style={styles.flowerInfoMainContent}>
                                    <View style={styles.emotionDisplayArea}>
                                        {IMAGES.emotionIcon[selectedFlowerData.emotionKey] && (
                                            <Image source={IMAGES.emotionIcon[selectedFlowerData.emotionKey]} style={styles.flowerInfoEmotionIcon} resizeMode="contain" />
                                        )}
                                        <Text style={styles.flowerInfoEmotionName}>{selectedFlowerData.emotionName}</Text>
                                    </View>
                                </View>
                                <View style={styles.flowerInfoButtonArea}>
                                    {selectedFlowerData.messages && selectedFlowerData.messages.length > 0 && (
                                        <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}>
                                            <Text style={styles.flowerInfoButtonText}>대화 기록 보기</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={handleFlowerInfoModalClose} style={[
                                        styles.flowerInfoButton, 
                                        styles.flowerInfoCloseButton,
                                        // 대화 기록 버튼이 없을 경우 닫기 버튼만 중앙에 오도록 마진 조정 (선택적)
                                        !(selectedFlowerData.messages && selectedFlowerData.messages.length > 0) && { alignSelf: 'center'}
                                    ]}>
                                        <Text style={styles.flowerInfoButtonText}>닫기</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
      )}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' }, // 배경색 통일감
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999, },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333', },
  gardenCaptureArea: { flex: 1, },
  backgroundImageFill: { flex: 1, },
  placedFlowerImageTouchable: { position: 'absolute', zIndex: 10, },
  placedFlowerImageActual: { width: '100%', height: '100%', },
  treeAreaWrapper: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1, },
  treeContainer: { justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', },
  uiOverlayContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, },
  bottomAreaContent: { paddingBottom: ESTIMATED_NAV_BAR_HEIGHT + 10, alignItems: 'center', justifyContent: 'flex-end', minHeight: ESTIMATED_NAV_BAR_HEIGHT + BUTTON_BOTTOM_FIXED_MARGIN + 50 },
  buttonWrapper: { marginBottom: BUTTON_BOTTOM_FIXED_MARGIN, alignItems: 'center', width: '80%', maxWidth: 300}, // 버튼 너비 제한
  gradientButton: { borderRadius: 8, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, width: '100%'},
  fullWidthTouchable: { paddingVertical: 12, paddingHorizontal: 25, alignItems: 'center', justifyContent: 'center'}, // TouchableOpacity가 Gradient 전체 차지
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarPlacement: { width: '100%', position: 'absolute', bottom: 0, },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContentContainer: { /* 스타일 불필요 또는 커스텀 */ },
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' }, // gap 사용, 너비 100%
  modalButtonGradient: { borderRadius: 8, flex:1 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultModalContentContainer: { /* 스타일 불필요 또는 커스텀 */ },
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  resultEmotionIcon: { width: 50, height: 50, marginBottom: 10, },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15, },
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10 },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  flowerInfoModalContainer: { 
    width: '85%', 
    maxWidth: 380, 
    backgroundColor: 'white', 
    borderRadius: 15, 
    paddingHorizontal: 20,
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 3.84, 
    overflow: 'hidden', // 내부 컨텐츠가 borderRadius를 넘지 않도록
  },
  flowerInfoModalContent: { 
    width: '100%', 
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20, 
  },
  flowerInfoTitle: { 
    fontSize: 20, // 약간 줄임
    fontWeight: 'bold', 
    color: '#333', 
    textAlign: 'center',
    marginBottom: 15,
  },
  flowerInfoMainContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: '100%',
    paddingVertical: 10, // 컨텐츠와 타이틀/버튼 영역 사이 간격
  },
  emotionDisplayArea: { 
    alignItems: 'center',
  },
  flowerInfoEmotionIcon: { 
    width: 80, // 약간 줄임
    height: 80, // 약간 줄임
    marginBottom: 10, 
  },
  flowerInfoEmotionName: { 
    fontSize: 18, // 약간 줄임
    color: '#444', 
    fontWeight: '500', 
    textAlign: 'center',
  },
  flowerInfoButtonArea: { 
    width: '100%',
    alignItems: 'center', 
    paddingTop: 10, 
    flexDirection: 'column', // 버튼들을 세로로 나열 (여러 개일 경우)
    gap: 10, // 버튼 사이 간격
  },
  flowerInfoButton: { 
    backgroundColor: '#2196F3', 
    paddingVertical: 10, 
    // paddingHorizontal: 20, // 너비 100%로 변경
    borderRadius: 8, 
    // marginTop: 10, // gap으로 대체
    width: '90%', // 버튼 너비 조정
    alignItems: 'center', 
  },
  flowerInfoCloseButton: { 
    backgroundColor: '#757575', 
  },
  flowerInfoButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  chatHistoryContainer: {
    flex: 1, 
    width: '100%',
    marginBottom: 10, 
    paddingHorizontal: 5, 
    // backgroundColor: '#f9f9f9', // 배경색 추가하여 구분 용이
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  chatMessageOuterContainer: { 
    flexDirection: 'row',
    marginVertical: 5,
    maxWidth: '100%',
  },
  chatBotRowContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    paddingRight: '15%', // 패딩 조정
  },
  chatUserRowContainer: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    paddingLeft: '15%', // 패딩 조정
  },
  chatMessageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    maxWidth: '100%', // 버블이 너무 커지지 않도록
  },
  chatBotBubble: {
    backgroundColor: '#e5e5ea', 
    borderTopLeftRadius: 0,
    alignSelf: 'flex-start',
  },
  chatUserBubble: {
    backgroundColor: '#dcf8c6', 
    borderTopRightRadius: 0,
    alignSelf: 'flex-end',
  },
  chatMessageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
});

export default HomeScreen;