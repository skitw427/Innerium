// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackHandler, Alert, Platform, ScrollView, FlatList } from 'react-native';
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
  // 안드로이드 뒤로가기 버튼 비활성화
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // 앱 시작 시 AsyncStorage에서 상태 복원
  useEffect(() => {
    const loadInitialState = async () => {
      console.log("[HomeScreen] Starting initial state load...");
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
        console.log(`[HomeScreen] Loaded snapshot taken flag: ${isSnapshotTaken}`);

        console.log(`[HomeScreen] Raw saved flowers string: ${savedFlowersString ? savedFlowersString.substring(0, 100) + '...' : 'null'}`);
        let loadedFlowers = [];
        if (savedFlowersString !== null) {
          try {
            const parsedFlowers = JSON.parse(savedFlowersString);
            if (Array.isArray(parsedFlowers)) {
                loadedFlowers = parsedFlowers.length > MAX_FLOWERS && MAX_FLOWERS > 0
                                ? parsedFlowers.slice(0, MAX_FLOWERS)
                                : parsedFlowers;
                console.log(`[HomeScreen] Parsed and loaded ${loadedFlowers.length} flowers.`);
            } else {
                console.error("[HomeScreen] Parsed flowers data is not an array. Resetting flowers.");
                await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
            }
          } catch (parseError) {
            console.error('[HomeScreen] Failed to parse saved flowers JSON. Resetting flowers.', parseError);
            await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
          }
        } else {
          console.log("[HomeScreen] No saved flowers found. Initializing empty garden.");
          if (isSnapshotTaken) {
              await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
              setCurrentGardenSnapshotTaken(false);
              console.log("[HomeScreen] Corrected snapshot flag to false as no flowers were found.");
          }
        }

        setPlacedFlowers(loadedFlowers);
        setIsGardenFull(loadedFlowers.length >= MAX_FLOWERS);

      } catch (error) {
        console.error('[HomeScreen] Failed to load initial state:', error);
        setPlacedFlowers([]);
        setIsGardenFull(false);
        setCurrentGardenSnapshotTaken(false);
      } finally {
        console.log("[HomeScreen] Finished initial state load.");
        setIsLoadingFlowers(false);
      }
    };
    loadInitialState();
  }, []);

  // placedFlowers 상태 변경 시 AsyncStorage에 저장
  useEffect(() => {
    if (isLoadingFlowers || placedFlowers === null) {
      // console.log(`[HomeScreen] Skipping save: isLoadingFlowers=${isLoadingFlowers}, placedFlowers is ${placedFlowers === null ? 'null' : 'not null'}`);
      return;
    }
    const savePlacedFlowers = async () => {
      try {
        if (Array.isArray(placedFlowers)) {
            if (placedFlowers.length > 0) {
                await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(placedFlowers));
                // console.log(`[HomeScreen] Saved ${placedFlowers.length} flowers to AsyncStorage.`);
            } else {
                await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
                const currentSnapshotFlag = await AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY);
                if (currentSnapshotFlag === 'true') {
                    await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
                    setCurrentGardenSnapshotTaken(false);
                    console.log("[HomeScreen] Garden is empty. Removed key and reset snapshot flag.");
                } else {
                    // console.log("[HomeScreen] Garden is empty. Removed key (snapshot flag was already false or null).");
                }
            }
        } else {
             console.error("[HomeScreen] Cannot save placedFlowers because it's not an array:", placedFlowers);
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
  }, [placedFlowers, isLoadingFlowers]);

  // 정원 캡쳐 및 저장 함수
  const captureAndSaveGarden = useCallback(async () => {
    if (!gardenViewRef.current) {
        console.warn("[HomeScreen] gardenViewRef is not available for capture.");
        return;
    }
    console.log("[HomeScreen] Capturing and saving garden snapshot...");
    try {
      const base64Data = await gardenViewRef.current.capture({ format: "jpg", quality: 0.8, result: "base64" });
      const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
      const completedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
      completedGardens.push({ timestamp: Date.now(), snapshotData: `data:image/jpeg;base64,${base64Data}` });
      await AsyncStorage.setItem(COMPLETED_GARDENS_KEY, JSON.stringify(completedGardens));
      Alert.alert("정원 완성!", "현재 정원의 모습이 보관함에 저장되었습니다.");
      await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'true');
      setCurrentGardenSnapshotTaken(true);
      console.log("[HomeScreen] Garden snapshot saved successfully.");
    } catch (error) {
      console.error('[HomeScreen] Failed to capture or save garden snapshot:', error);
      Alert.alert("오류", "정원 이미지를 저장하는 데 실패했습니다.");
    }
  }, []);

  // 정원이 가득 차고 스냅샷 안 찍었으면 자동 찍기
  useEffect(() => {
    if (isGardenFull && !currentGardenSnapshotTaken) {
      console.log("[HomeScreen] Garden is full and snapshot not taken yet. Scheduling capture...");
      const timer = setTimeout(() => {
        captureAndSaveGarden();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGardenFull, currentGardenSnapshotTaken, captureAndSaveGarden]);

  // 진단 가능 여부 확인 및 버튼 상태 업데이트 함수
  const checkDiagnosisStatus = useCallback(async () => {
    try {
      const lastDiagnosisDate = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
      const currentAppDateObj = await getAppCurrentDate();
      const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);
      const canDiagnoseToday = lastDiagnosisDate !== currentAppDateFormatted;
      setShowEmotionCheckButton(canDiagnoseToday);
      // console.log(`[HomeScreen] Diagnosis check: Last diagnosed: ${lastDiagnosisDate}, Today: ${currentAppDateFormatted}, Can diagnose today: ${canDiagnoseToday}`);
    } catch (error) {
      console.error("[HomeScreen] Failed to check diagnosis status:", error);
      setShowEmotionCheckButton(true);
    }
  }, []);

  // 화면 포커스 시 진단 버튼 상태 업데이트 및 라우트 파라미터 초기화
  useFocusEffect(
    useCallback(() => {
      // console.log("[HomeScreen] Screen focused. Checking diagnosis status.");
      checkDiagnosisStatus();
      // 다른 화면에서 전달된 진단 완료 플래그 정리 (선택적)
      // if (route.params?.diagnosisCompletedToday) {
      //   if (navigation && typeof navigation.setParams === 'function') {
      //     navigation.setParams({ diagnosisCompletedToday: undefined });
      //   }
      // }
    }, [checkDiagnosisStatus, navigation]) // route.params 의존성 제거 시도
  );


  // ★★★ 다른 화면에서 진단 결과 받아 처리 (수정됨: 파라미터 즉시 정리) ★★★
  useEffect(() => {
    // 조건: route.params에 결과가 있고, 꽃 로딩이 완료되었고, placedFlowers가 배열일 때
    if (route.params?.diagnosisResult && route.params?.emotionKey && !isLoadingFlowers && Array.isArray(placedFlowers)) {

      // 1. 결과 데이터 추출
      const { diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages } = route.params;
      console.log(`[HomeScreen] Processing received diagnosis result: emotionKey=${emotionKey}`);

      // 2. ★★★ 파라미터 즉시 정리 (중복 실행 방지) ★★★
      if (navigation && typeof navigation.setParams === 'function') {
          console.log("[HomeScreen] Clearing route params immediately.");
          navigation.setParams({
              diagnosisResult: undefined,
              emotionKey: undefined,
              primaryEmotionName: undefined,
              diagnosisMessages: undefined
          });
      } else {
          console.warn("[HomeScreen] Cannot clear route params: navigation or setParams not available.");
      }

      // 3. 비동기 처리 함수 정의 (파라미터 대신 추출된 변수 사용)
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
                // placedFlowers는 effect 스코프 내 최신 값을 사용
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
                    console.log(`[HomeScreen] New flower selected for planting: ${imageKeyToPlant} on ${formattedDate}`);
                } else {
                     if (placedImageKeysForEmotion.length > 0) {
                        flowerImageForModal = allImagesForEmotion[placedImageKeysForEmotion[Math.floor(Math.random() * placedImageKeysForEmotion.length)]];
                    } else {
                        flowerImageForModal = allImagesForEmotion[allImageKeysForEmotion[0]];
                    }
                    shouldPlantNewFlower = false;
                    console.log("[HomeScreen] No new flower type available for this emotion. Showing existing type in modal.");
                }
            } else {
                shouldPlantNewFlower = false;
                console.warn(`[HomeScreen] No flower images defined for emotionKey: ${key}`);
            }
        }

        // 새 꽃 심기 로직
        if (shouldPlantNewFlower && newFlowerDataForPlanting && flowerCanvasHeight > 0) {
          setPlacedFlowers(prevFlowers => {
             if (!Array.isArray(prevFlowers)) {
                console.error("[HomeScreen] Cannot plant flower because prevFlowers is not an array:", prevFlowers);
                return prevFlowers;
            }
            if (prevFlowers.length < MAX_FLOWERS) {
              let updatedFlowers = [...prevFlowers];
              let selectedRelativePos = null;
              const occupiedPositions = new Set(prevFlowers.map(f => f.relativePos ? JSON.stringify(f.relativePos) : null));
              const availablePlacementSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));
              if (availablePlacementSlots.length > 0) {
                const randomAvailableIndex = Math.floor(Math.random() * availablePlacementSlots.length);
                selectedRelativePos = availablePlacementSlots[randomAvailableIndex];
                newFlowerDataForPlanting.relativePos = selectedRelativePos;
                updatedFlowers.push(newFlowerDataForPlanting);
                console.log(`[HomeScreen] Planting new flower at available slot: ${JSON.stringify(selectedRelativePos)}`);
                return updatedFlowers;
              } else {
                console.warn("[HomeScreen] No available placement slots found, but garden not full? Replacing random flower.");
                const replaceIndex = Math.floor(Math.random() * prevFlowers.length);
                newFlowerDataForPlanting.relativePos = prevFlowers[replaceIndex].relativePos;
                updatedFlowers.splice(replaceIndex, 1, newFlowerDataForPlanting);
                return updatedFlowers;
              }
            } else {
               Alert.alert("알림", "정원이 가득 차서 기존 꽃과 교체합니다.");
               let updatedFlowers = [...prevFlowers];
               const replaceIndex = Math.floor(Math.random() * prevFlowers.length);
               newFlowerDataForPlanting.relativePos = prevFlowers[replaceIndex].relativePos;
               updatedFlowers.splice(replaceIndex, 1, newFlowerDataForPlanting);
               console.log(`[HomeScreen] Garden is full. Replacing flower at index ${replaceIndex}.`);
               return updatedFlowers;
            }
          });
        }

        // 결과 모달 표시
        setResultModalMessage(result);
        setResultModalImage(flowerImageForModal);
        setResultModalEmotionIcon(emotionIconForModal);
        setIsResultModalVisible(true); // 모달 상태 변경 -> 리렌더링 유발 가능성 있음

        // 파라미터 정리는 이미 위에서 했음
      };

      // 4. 비동기 처리 함수 실행 (추출된 변수 전달)
      processDiagnosisResult(diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages);

    } else if (route.params?.diagnosisResult && isLoadingFlowers) {
         console.log("[HomeScreen] Received diagnosis result but flowers are still loading. Result ignored.");
         // 로딩 중에 도착한 결과는 무시, 필요 시 로딩 완료 후 재처리 로직 추가 가능
         // 또는 SimpleDiagnosisScreen에서 결과 전달 전 로딩 상태 확인
         if (navigation && typeof navigation.setParams === 'function') {
            navigation.setParams({
                diagnosisResult: undefined, emotionKey: undefined,
                primaryEmotionName: undefined, diagnosisMessages: undefined
            });
         }
    }
  }, [route.params, navigation, flowerCanvasHeight, placedFlowers, isLoadingFlowers]); // 의존성 배열 유지

  // 꽃 개수에 따라 나무 이미지 및 크기 변경
  useEffect(() => {
    if (Array.isArray(placedFlowers)) {
        const flowerCount = placedFlowers.length;
        let newTreeImageSource = IMAGES.treeImage;
        let newImageScalingFactor = TREE_IMAGE_SCALE_BASE;

        if (flowerCount >= 10 && IMAGES.Tree_10) { newTreeImageSource = IMAGES.Tree_10; newImageScalingFactor = TREE_IMAGE_SCALE_10; }
        else if (flowerCount >= 8 && IMAGES.Tree_8) { newTreeImageSource = IMAGES.Tree_8; newImageScalingFactor = TREE_IMAGE_SCALE_8; }
        else if (flowerCount >= 6 && IMAGES.Tree_6) { newTreeImageSource = IMAGES.Tree_6; newImageScalingFactor = TREE_IMAGE_SCALE_6; }
        else if (flowerCount >= 4 && IMAGES.Tree_4) { newTreeImageSource = IMAGES.Tree_4; newImageScalingFactor = TREE_IMAGE_SCALE_4; }
        else if (flowerCount >= 2 && IMAGES.Tree_2) { newTreeImageSource = IMAGES.Tree_2; newImageScalingFactor = TREE_IMAGE_SCALE_2; }

        if (currentTreeImageSource !== newTreeImageSource) { setCurrentTreeImageSource(newTreeImageSource); }
        if (currentTreeImageScalingFactor !== newImageScalingFactor) { setCurrentTreeImageScalingFactor(newImageScalingFactor); }
    }
  }, [placedFlowers]);

  // --- 핸들러 함수들 ---
  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => {
      setIsModalVisible(false);
      Alert.alert("안내", "심층 진단 기능은 현재 준비 중입니다.");
  };
  const handleSimpleEmotionCheck = () => {
      setIsModalVisible(false);
      navigation.navigate('SimpleDiagnosis');
  };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    setResultModalEmotionIcon(null);
    setResultModalImage(null);
    // 모달 닫을 때 파라미터 재확인 및 정리 (필수는 아님)
    // if (navigation && typeof navigation.setParams === 'function') {
    //   if (route.params?.diagnosisResult || route.params?.emotionKey) {
    //     navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined });
    //   }
    // }
    checkDiagnosisStatus();
  };

  const handleFlowerPress = (flower) => {
    if (!flower || !flower.emotionKey) return;
    console.log("Flower pressed:", flower);
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
    setShowChatHistoryInModal(prev => !prev);
  };

  // --- JSX 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 로딩 중 표시 */}
      {isLoadingFlowers && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>정원 불러오는 중...</Text>
        </View>
      )}

      {/* 정원 영역 (로딩 완료 후 표시) */}
      {!isLoadingFlowers && (
        <ViewShot ref={gardenViewRef} options={{ format: 'jpg', quality: 0.8, result: "base64" }} style={styles.gardenCaptureArea}>
          <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
            {/* 꽃 렌더링 */}
            {flowerCanvasHeight > 0 && Array.isArray(placedFlowers) && placedFlowers.map(flower => {
              const flowerImageAspectRatio = (flower.source && flower.source.width && flower.source.height)
                                            ? flower.source.width / flower.source.height : 1;
              const flowerDisplayHeight = currentFlowerPixelHeight;
              const flowerDisplayWidth = flowerDisplayHeight * flowerImageAspectRatio;
              let calculatedTop = flowerCanvasStartY + ((flower.relativePos?.topRatio || 0.5) * flowerCanvasHeight) - (flowerDisplayHeight / 2);
              let calculatedLeft = flowerCanvasPaddingHorizontal + ((flower.relativePos?.leftRatio || 0.5) * flowerCanvasWidth) - (flowerDisplayWidth / 2);
              calculatedTop = Math.max(flowerCanvasStartY, Math.min(calculatedTop, flowerCanvasEndY - flowerDisplayHeight));
              calculatedLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(calculatedLeft, flowerCanvasPaddingHorizontal + flowerCanvasWidth - flowerDisplayWidth));
              return (
                <TouchableOpacity key={flower.id} onPress={() => handleFlowerPress(flower)} style={[ styles.placedFlowerImageTouchable, { height: flowerDisplayHeight, width: flowerDisplayWidth, top: calculatedTop, left: calculatedLeft } ]}>
                  <Image source={flower.source} style={styles.placedFlowerImageActual} resizeMode="contain" />
                </TouchableOpacity>
              );
            })}
            {/* 나무 영역 */}
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

      {/* UI 오버레이 */}
      <View style={styles.uiOverlayContainer}>
        {!isLoadingFlowers && showEmotionCheckButton && (
          <View style={styles.bottomAreaContent}>
            <View style={styles.buttonWrapper}>
              <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
                <TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7}>
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

      {/* 모달들 */}
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
                <TouchableOpacity activeOpacity={1} style={[styles.flowerInfoModalContainer, showChatHistoryInModal && styles.chatHistoryModalContainer]}>
                    <View style={styles.flowerInfoModalContent}>
                        {!showChatHistoryInModal ? (
                            <>
                                <Text style={styles.flowerInfoTitle}>
                                  {selectedFlowerData.creationDate || '생성 날짜 정보 없음'}
                                </Text>
                                {IMAGES.emotionIcon[selectedFlowerData.emotionKey] && (
                                    <Image source={IMAGES.emotionIcon[selectedFlowerData.emotionKey]} style={styles.flowerInfoEmotionIcon} resizeMode="contain" />
                                )}
                                <Text style={styles.flowerInfoEmotionName}>{selectedFlowerData.emotionName}</Text>
                                {(selectedFlowerData.messages && selectedFlowerData.messages.length > 0) && (
                                    <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}>
                                        <Text style={styles.flowerInfoButtonText}>대화 기록 보기</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={handleFlowerInfoModalClose} style={[styles.flowerInfoButton, styles.flowerInfoCloseButton]}>
                                    <Text style={styles.flowerInfoButtonText}>닫기</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.flowerInfoTitle}>대화 기록</Text>
                                <View style={styles.chatHistoryScrollContainer}>
                                    <FlatList
                                        data={selectedFlowerData.messages}
                                        keyExtractor={(item, index) => item.id || `chatMsg-${index}`}
                                        renderItem={({ item }) => (
                                            <View style={[ styles.chatMessageBubble, item.sender === 'user' ? styles.userMessageBubble : styles.botMessageBubble ]}>
                                                <Text style={styles.chatMessageText}>{item.text}</Text>
                                            </View>
                                        )}
                                        contentContainerStyle={styles.chatHistoryListContent}
                                        inverted={false}
                                    />
                                </View>
                                <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}>
                                    <Text style={styles.flowerInfoButtonText}>정보로 돌아가기</Text>
                                </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
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
  buttonWrapper: { marginBottom: BUTTON_BOTTOM_FIXED_MARGIN, alignItems: 'center', },
  gradientButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, justifyContent: 'center', alignItems: 'center', },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarPlacement: { width: '100%', position: 'absolute', bottom: 0, },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContentContainer: {},
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButtonGradient: { borderRadius: 8, flex:1 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultModalContentContainer: {},
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  resultEmotionIcon: { width: 50, height: 50, marginBottom: 10, },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15, },
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10 },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  flowerInfoModalContainer: { width: '85%', maxWidth: 380, maxHeight: '70%', backgroundColor: 'white', borderRadius: 15, padding: 20, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  chatHistoryModalContainer: {},
  flowerInfoModalContent: { width: '100%', alignItems: 'center', },
  flowerInfoTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, },
  flowerInfoEmotionIcon: { width: 70, height: 70, marginBottom: 10, },
  flowerInfoEmotionName: { fontSize: 18, color: '#444', marginBottom: 20, fontWeight: '500', },
  flowerInfoButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginTop: 10, minWidth: 150, alignItems: 'center', },
  flowerInfoCloseButton: { backgroundColor: '#757575', },
  flowerInfoButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
  chatHistoryScrollContainer: { width: '100%', maxHeight: 300, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 15, padding: 10, },
  chatHistoryListContent: {},
  chatMessageBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, marginBottom: 8, maxWidth: '80%', },
  userMessageBubble: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end', borderBottomRightRadius: 0, },
  botMessageBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start', borderBottomLeftRadius: 0, },
  chatMessageText: { fontSize: 15, color: '#000', },
});

export default HomeScreen;