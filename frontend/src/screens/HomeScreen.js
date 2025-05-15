// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BackHandler, Alert, Platform, ScrollView, FlatList, ActivityIndicator as ListActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDailyRecordResult, getCurrentGarden } from '../api/apiClient';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, TouchableOpacity, Image, Text,
  ImageBackground, SafeAreaView, useWindowDimensions, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';

// --- 상수 정의 ---
const TREE_IMAGE_SCALE_BASE = 0.3; const TREE_IMAGE_SCALE_2 = 0.4;
const TREE_IMAGE_SCALE_4 = 0.6; const TREE_IMAGE_SCALE_6 = 0.75;
const TREE_IMAGE_SCALE_8 = 0.85; const TREE_IMAGE_SCALE_10 = 1;
const TOP_SPACER_RATIO = 0.1; const TREE_CONTAINER_AREA_RATIO = 0.4;
const BUTTON_BOTTOM_FIXED_MARGIN = 25;
const ESTIMATED_NAV_BAR_HEIGHT = 110;
const FLOWER_HEIGHT_RATIO_OF_WINDOW = 0.09; // 수정된 값
const MAX_FLOWER_HEIGHT = 6000;
const MIN_FLOWER_HEIGHT = 2;

const RELATIVE_FLOWER_POSITIONS = [
  { topRatio: 0.07, leftRatio: 0.2 }, { topRatio: 0.10, leftRatio: 0.5 }, { topRatio: 0.08, leftRatio: 0.8 },
  { topRatio: 0.41, leftRatio: 0.1 }, { topRatio: 0.40, leftRatio: 0.4 }, { topRatio: 0.38, leftRatio: 0.65 }, { topRatio: 0.42, leftRatio: 0.9 },
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

const POPUP_WIDTH_PERCENTAGE_OF_SCREEN = 0.85;
const MAX_POPUP_WIDTH_ABSOLUTE = 380;
const POPUP_EFFECTIVE_HEIGHT_PERCENTAGE_OF_SCREEN = 0.6;
const IMAGE_SIZE_RATIO_OF_POPUP_WIDTH = 0.35;
const IMAGE_VERTICAL_GAP_RATIO_OF_POPUP_EFFECTIVE_HEIGHT = 0.03;
const POPUP_IMAGES_CONTAINER_MARGIN_BOTTOM_RATIO_OF_WINDOW_HEIGHT = 0.015;
const GENERIC_ALERT_POPUP_HEIGHT_RATIO = 0.35;


const HomeScreen = ({ navigation, route }) => {
  const {
      currentGardenDetails,
      placedFlowers, // GardenContext에서 오는 꽃 목록
      setPlacedFlowers,
      isLoadingGarden,    // GardenContext의 초기 정원 로딩 상태
      isCompletingGarden, // GardenContext의 정원 완성 API 호출 중 로딩 상태
      gardenError,
      refreshCurrentGarden,
      completeGarden,
    } = useGarden();

  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isNewAccountJustCreated, clearNewAccountFlag } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [resultModalEmotionIcon, setResultModalEmotionIcon] = useState(null);
  // const [placedFlowers, setPlacedFlowers] = useState(null);
  const [isLoadingFlowers, setIsLoadingFlowers] = useState(false);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);
  const [showEmotionCheckButton, setShowEmotionCheckButton] = useState(true);
  // const [isGardenFull, setIsGardenFull] = useState(false);
  const [isGardenFull, setIsGardenFull] = useState(placedFlowers.length >= MAX_FLOWERS);
  const gardenViewRef = useRef();
  const [currentGardenSnapshotTaken, setCurrentGardenSnapshotTaken] = useState(false);
  const [isFlowerInfoModalVisible, setIsFlowerInfoModalVisible] = useState(false);
  const [selectedFlowerData, setSelectedFlowerData] = useState(null);
  const [showChatHistoryInModal, setShowChatHistoryInModal] = useState(false);
  const chatHistoryFlatListRef = useRef(null);
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [pendingGardenCompletionAlert, setPendingGardenCompletionAlert] = useState(false);
  const [isGardenCompleteAlertVisible, setIsGardenCompleteAlertVisible] = useState(false);
  const [gardenCompleteAlertMessage, setGardenCompleteAlertMessage] = useState("정원 완성! 현재 정원의 모습이 보관함에 저장되었습니다.");
  const [isGardenResetAlertVisible, setIsGardenResetAlertVisible] = useState(false);
  const [gardenResetAlertMessage, setGardenResetAlertMessage] = useState("새로운 정원을 가꿀 시간입니다!");
  const [isProcessingDiagnosis, setIsProcessingDiagnosis] = useState(false);


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

  const flowerInfoModalDynamicStyles = useMemo(() => {
    const calculatedPopupWidth = Math.min(windowWidth * POPUP_WIDTH_PERCENTAGE_OF_SCREEN, MAX_POPUP_WIDTH_ABSOLUTE);
    const popupEffectiveHeight = windowHeight * POPUP_EFFECTIVE_HEIGHT_PERCENTAGE_OF_SCREEN;
    const imageSize = calculatedPopupWidth * IMAGE_SIZE_RATIO_OF_POPUP_WIDTH;
    const imageVerticalGap = popupEffectiveHeight * IMAGE_VERTICAL_GAP_RATIO_OF_POPUP_EFFECTIVE_HEIGHT;
    const imagesContainerMarginBottom = windowHeight * POPUP_IMAGES_CONTAINER_MARGIN_BOTTOM_RATIO_OF_WINDOW_HEIGHT;
    return {
      displayImage: { width: imageSize, height: imageSize },
      imagesContainer: { marginBottom: imagesContainerMarginBottom, gap: imageVerticalGap }
    };
  }, [windowWidth, windowHeight]);


  useEffect(() => {
    if (isNewAccountJustCreated) {
      Alert.alert("환영합니다!", "새로운 계정이 생성되었습니다!", [{ text: "확인", onPress: () => clearNewAccountFlag() }], { cancelable: false });
    }
  }, [isNewAccountJustCreated, clearNewAccountFlag]);

  // useEffect(() => {
  //   const loadInitialState = async () => {
  //     setIsLoadingFlowers(true);
  //     try {
  //       const snapshotTakenValuePromise = AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY);
  //       const savedFlowersStringPromise = AsyncStorage.getItem(PLACED_FLOWERS_KEY);
  //       const [snapshotTakenValue, savedFlowersString] = await Promise.all([snapshotTakenValuePromise, savedFlowersStringPromise]);
  //       const isSnapshotTaken = snapshotTakenValue === 'true';
  //       setCurrentGardenSnapshotTaken(isSnapshotTaken);
  //       let loadedFlowers = [];
  //       if (savedFlowersString !== null) {
  //         try {
  //           const parsedFlowers = JSON.parse(savedFlowersString);
  //           if (Array.isArray(parsedFlowers)) {
  //             loadedFlowers = parsedFlowers.length > MAX_FLOWERS && MAX_FLOWERS > 0 ? parsedFlowers.slice(0, MAX_FLOWERS) : parsedFlowers;
  //           } else { await AsyncStorage.removeItem(PLACED_FLOWERS_KEY); }
  //         } catch (parseError) { await AsyncStorage.removeItem(PLACED_FLOWERS_KEY); }
  //       } else { if (isSnapshotTaken) { await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false'); setCurrentGardenSnapshotTaken(false); } }
  //       setPlacedFlowers(loadedFlowers);
  //       setIsGardenFull(loadedFlowers.length >= MAX_FLOWERS);
  //     } catch (error) { setPlacedFlowers([]); setIsGardenFull(false); setCurrentGardenSnapshotTaken(false); } finally { setIsLoadingFlowers(false); }
  //   };
  //   loadInitialState();
  // }, []);

  // useEffect(() => {
  //   if (isLoadingFlowers || placedFlowers === null) return;
  //   const savePlacedFlowers = async () => {
  //     try {
  //       if (Array.isArray(placedFlowers)) {
  //         if (placedFlowers.length > 0) { await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(placedFlowers)); }
  //         else { await AsyncStorage.removeItem(PLACED_FLOWERS_KEY); const flag = await AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY); if (flag === 'true') { await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false'); setCurrentGardenSnapshotTaken(false); } }
  //       }
  //     } catch (error) { console.error('[HomeScreen] Failed to save flowers:', error); }
  //   };
  //   savePlacedFlowers();
  //   if (Array.isArray(placedFlowers)) { const full = placedFlowers.length >= MAX_FLOWERS; if (isGardenFull !== full) setIsGardenFull(full); }
  // }, [placedFlowers, isLoadingFlowers, isGardenFull]);

  // const captureAndSaveGarden = useCallback(async () => {
  //   if (!gardenViewRef.current) { console.warn("[HomeScreen] gardenViewRef NA."); return; }
  //   try {
  //     const base64Data = await gardenViewRef.current.capture({ format: "jpg", quality: 0.8, result: "base64" });
  //     const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
  //     const completedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
  //     completedGardens.push({ timestamp: Date.now(), snapshotData: `data:image/jpeg;base64,${base64Data}` });
  //     await AsyncStorage.setItem(COMPLETED_GARDENS_KEY, JSON.stringify(completedGardens));
  //     await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'true');
  //     setCurrentGardenSnapshotTaken(true);
  
  //     if (isResultModalVisible) {
  //       setPendingGardenCompletionAlert(true);
  //     } else {
  //       setIsGardenCompleteAlertVisible(true);
  //     }
  //   } catch (error) { console.error("[HomeScreen] Failed to capture/save garden:", error); Alert.alert("오류", "정원 이미지 저장 실패."); }
  // }, [isResultModalVisible]);


  // useEffect(() => {
  //   if (isGardenFull && !currentGardenSnapshotTaken && !isLoadingFlowers) {
  //     const timer = setTimeout(() => captureAndSaveGarden(), 500);
  //     return () => clearTimeout(timer);
  //   }
  // }, [isGardenFull, currentGardenSnapshotTaken, isLoadingFlowers, captureAndSaveGarden]);

  useEffect(() => {
      const handleCompleteGarden = async () => {
      if (isGardenFull) {
        try {
          console.log('[HomeScreen] Garden is complete, saving garden data to server...');
          await completeGarden(); // 서버 데이터 새로고침 (꽃 심기는 서버에서 처리됨)
          console.log('[HomeScreen] Garden data saved to server.');

          setResultModalMessage(diagnosisResult);
          setResultModalImage(flowerImgModal);
          setResultModalEmotionIcon(emotionIconModal);
          setIsResultModalVisible(true);
        } catch (error) {
          console.error('[HomeScreen] Error saving the completed garden:', error);
          Alert.alert("오류", gardenError || "정원 완성을 처리하는 중 문제가 발생했습니다.");
        }
      }
    }

    if (!isLoadingGarden && !isCompletingGarden && !isProcessingDiagnosis && !isResultModalVisible) {
      handleCompleteGarden();
    }
  }, [isGardenFull, isResultModalVisible, isLoadingGarden, isProcessingDiagnosis]);

  useEffect(() => {
    if (!isResultModalVisible && pendingGardenCompletionAlert) {
      setIsGardenCompleteAlertVisible(true);
      setPendingGardenCompletionAlert(false);
    }
  }, [isResultModalVisible, pendingGardenCompletionAlert]);

  const checkDiagnosisStatus = useCallback(async () => {
    try {
      const lastDate = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
      const currentDateObj = await getAppCurrentDate();
      const currentDateFormatted = formatDateToYYYYMMDD(currentDateObj);
      setShowEmotionCheckButton(lastDate !== currentDateFormatted);
    } catch (error) { setShowEmotionCheckButton(true); }
  }, [getAppCurrentDate, formatDateToYYYYMMDD]);

  useFocusEffect(
    useCallback(() => {
      const performFocusActions = async () => {
        if (isLoadingFlowers) return;
        let gardenWasReset = false;
        if (isGardenFull && currentGardenSnapshotTaken) {
          try {
            const lastKnownDateForGarden = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
            const currentAppDateObj = await getAppCurrentDate();
            const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);
            if (lastKnownDateForGarden && lastKnownDateForGarden !== currentAppDateFormatted) {
              setPlacedFlowers([]);
              setCurrentGardenSnapshotTaken(false);
              setIsGardenFull(false);
              await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
              await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
              await AsyncStorage.removeItem(LAST_DIAGNOSIS_DATE_KEY);
              gardenWasReset = true;
              setIsGardenResetAlertVisible(true);
            }
          } catch (error) {
            console.error('[HomeScreen] Error in resetting garden logic on date change:', error);
          }
        }
        if (gardenWasReset) {
            setShowEmotionCheckButton(true);
        } else {
            await checkDiagnosisStatus();
        }
      };
      performFocusActions();
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };
    }, [isLoadingFlowers, isGardenFull, currentGardenSnapshotTaken, checkDiagnosisStatus, getAppCurrentDate, formatDateToYYYYMMDD])
  );

  // 진단 결과 처리
  useEffect(() => {
    const handleDiagnosisParams = async () => {
      if (route.params?.diagnosisResult && route.params?.emotionKey) {
        setIsProcessingDiagnosis(true);
        const { diagnosisResult, emotionKey } = route.params;

        if (navigation?.setParams) {
          navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined, primaryEmotionName: undefined, diagnosisMessages: undefined });
        }

        try {
          console.log('[HomeScreen] Diagnosis complete, refreshing garden data from server...');
          await refreshCurrentGarden(); // 서버 데이터 새로고침 (꽃 심기는 서버에서 처리됨)
          console.log('[HomeScreen] Garden data refreshed after diagnosis.');

          // 모달 표시는 그대로 유지 (대표 이미지 사용)
          let flowerImgModal = null;
          let emotionIconModal = null;
          if (emotionKey && IMAGES.emotionIcon?.[emotionKey]) emotionIconModal = IMAGES.emotionIcon[emotionKey];
          if (emotionKey && IMAGES.flowers?.[emotionKey]) {
            const allImgs = IMAGES.flowers[emotionKey];
            const allImgKeys = Object.keys(allImgs);
            if (allImgKeys.length > 0) {
              flowerImgModal = allImgs[allImgKeys[Math.floor(Math.random() * allImgKeys.length)]];
            }
          }
          setResultModalMessage(diagnosisResult);
          setResultModalImage(flowerImgModal);
          setResultModalEmotionIcon(emotionIconModal);
          setIsResultModalVisible(true);
        } catch (error) {
          console.error('[HomeScreen] Error processing diagnosis result or refreshing garden:', error);
          Alert.alert("오류", gardenError || "진단 결과를 처리하는 중 문제가 발생했습니다.");
        } finally {
          setIsProcessingDiagnosis(false);
        }
      }
    };

    // 초기 로딩이나 다른 처리 중이 아닐 때만 실행
    if (!isLoadingGarden && !isCompletingGarden && !isProcessingDiagnosis && route.params?.diagnosisResult) {
      handleDiagnosisParams();
    }
  }, [route.params, navigation, refreshCurrentGarden, isLoadingGarden, isCompletingGarden, isProcessingDiagnosis, gardenError]);

  // useEffect(() => {
  //   if (route.params?.diagnosisResult && route.params?.emotionKey && !isLoadingFlowers && Array.isArray(placedFlowers)) {
  //     const { diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages } = route.params;
  //     if (navigation?.setParams) navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined, primaryEmotionName: undefined, diagnosisMessages: undefined, diagnosisDate: undefined });
      
  //     const processResult = async (result, key, name, messages) => {
  //       let flowerImgModal = null, emotionIconModal = null, plantNew = false, newFlowerData = null;
  //       if (key && IMAGES.emotionIcon?.[key]) emotionIconModal = IMAGES.emotionIcon[key];
  //       if (key && IMAGES.flowers?.[key]) {
  //         const allImgs = IMAGES.flowers[key], allImgKeys = Object.keys(allImgs);
  //         if (allImgKeys.length > 0) {
  //           const placedKeys = placedFlowers.filter(f => f.emotionKey === key).map(f => f.imageKey);
  //           const availableKeys = allImgKeys.filter(k => !placedKeys.includes(k));
  //           if (availableKeys.length > 0) {
  //             const imgKeyPlant = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  //             flowerImgModal = allImgs[imgKeyPlant]; plantNew = true;
  //             const date = formatDateToYYYYMMDD(await getAppCurrentDate());
  //             newFlowerData = { id: `${Date.now()}-${key}-${imgKeyPlant}`, source: flowerImgModal, emotionKey: key, imageKey: imgKeyPlant, emotionName: name || keyToEmotionNameMap[key] || '정보 없음', messages: messages || [], creationDate: date, relativePos: null };
  //           } else { if (placedKeys.length > 0) flowerImgModal = allImgs[placedKeys[Math.floor(Math.random() * placedKeys.length)]]; else flowerImgModal = allImgs[allImgKeys[0]]; plantNew = false; }
  //         } else plantNew = false;
  //       }
  //       if (plantNew && newFlowerData && flowerCanvasHeight > 0) {
  //         setPlacedFlowers(prev => {
  //           if (!Array.isArray(prev)) return prev;
  //           if (prev.length < MAX_FLOWERS) {
  //             let updated = [...prev], selPos = null;
  //             const occupied = new Set(prev.map(f => f.relativePos ? JSON.stringify(f.relativePos) : null).filter(p => p));
  //             const availableSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupied.has(JSON.stringify(pos)));
  //             selPos = availableSlots.length > 0 ? availableSlots[Math.floor(Math.random() * availableSlots.length)] : RELATIVE_FLOWER_POSITIONS[Math.floor(Math.random() * RELATIVE_FLOWER_POSITIONS.length)];
  //             newFlowerData.relativePos = selPos; updated.push(newFlowerData); return updated;
  //           } else {
  //             Alert.alert("알림", "정원이 가득 차서 기존 꽃과 교체합니다.");
  //             let updated = [...prev]; const idx = Math.floor(Math.random() * prev.length);
  //             newFlowerData.relativePos = prev[idx].relativePos; updated.splice(idx, 1, newFlowerData); return updated;
  //           }
  //         });
  //       }
  //       setResultModalMessage(result); setResultModalImage(flowerImgModal); setResultModalEmotionIcon(emotionIconModal); setIsResultModalVisible(true);
  //     };
  //     processResult(diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages);
  //   } else if (route.params?.diagnosisResult && isLoadingFlowers && navigation?.setParams) {
  //     navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined, primaryEmotionName: undefined, diagnosisMessages: undefined });
  //   }
  // }, [route.params, navigation, flowerCanvasHeight, placedFlowers, isLoadingFlowers, getAppCurrentDate, formatDateToYYYYMMDD]);
  
  useEffect(() => {
    if (Array.isArray(placedFlowers)) {
      const count = placedFlowers.length; let newSrc = IMAGES.treeImage, newScale = TREE_IMAGE_SCALE_BASE;
      if (count >= 10 && IMAGES.Tree_10) { newSrc = IMAGES.Tree_10; newScale = TREE_IMAGE_SCALE_10; }
      else if (count >= 8 && IMAGES.Tree_8) { newSrc = IMAGES.Tree_8; newScale = TREE_IMAGE_SCALE_8; }
      else if (count >= 6 && IMAGES.Tree_6) { newSrc = IMAGES.Tree_6; newScale = TREE_IMAGE_SCALE_6; }
      else if (count >= 4 && IMAGES.Tree_4) { newSrc = IMAGES.Tree_4; newScale = TREE_IMAGE_SCALE_4; }
      else if (count >= 2 && IMAGES.Tree_2) { newSrc = IMAGES.Tree_2; newScale = TREE_IMAGE_SCALE_2; }
      if (currentTreeImageSource !== newSrc) setCurrentTreeImageSource(newSrc);
      if (currentTreeImageScalingFactor !== newScale) setCurrentTreeImageScalingFactor(newScale);
    }
  }, [placedFlowers, currentTreeImageSource, currentTreeImageScalingFactor]);

  useEffect(() => {
    if (isFlowerInfoModalVisible && showChatHistoryInModal) {
      if (selectedFlowerData?.messages) { setIsLoadingChatHistory(true); const t = setTimeout(() => setIsLoadingChatHistory(false), 50); return () => clearTimeout(t); }
      else setIsLoadingChatHistory(false);
    } else setIsLoadingChatHistory(false);
  }, [isFlowerInfoModalVisible, showChatHistoryInModal, selectedFlowerData]);

  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => { setIsModalVisible(false); handleNavigate(navigation, 'DeepDiagnosis'); };
  const handleSimpleEmotionCheck = () => { setIsModalVisible(false); navigation.navigate('SimpleDiagnosis'); };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => { setIsResultModalVisible(false); setResultModalEmotionIcon(null); setResultModalImage(null); checkDiagnosisStatus(); };
  const handleFlowerPress = (flower) => {
    if (!flower?.emotionKey) return;
    setSelectedFlowerData({ id: flower.id, source: flower.source, emotionKey: flower.emotionKey, imageKey: flower.imageKey, emotionName: flower.emotionName || keyToEmotionNameMap[flower.emotionKey] || '정보 없음', messages: flower.messages || [], creationDate: flower.creationDate || null, relativePos: flower.relativePos });
    setShowChatHistoryInModal(false); setIsFlowerInfoModalVisible(true);
  };
  const handleFlowerInfoModalClose = () => { setIsFlowerInfoModalVisible(false); setSelectedFlowerData(null); setShowChatHistoryInModal(false); };
  const handleToggleChatHistoryInModal = () => setShowChatHistoryInModal(prev => !prev);
  const renderChatHistoryItem = ({ item }) => (
    <View style={[styles.chatMessageOuterContainer, item.sender === 'bot' ? styles.chatBotRowContainer : styles.chatUserRowContainer]}><View style={[styles.chatMessageBubble, item.sender === 'bot' ? styles.chatBotBubble : styles.chatUserBubble]}><Text style={styles.chatMessageText}>{item.text}</Text></View></View>
  );
  const handleGardenCompleteAlertClose = () => setIsGardenCompleteAlertVisible(false);
  const handleGardenResetAlertClose = () => setIsGardenResetAlertVisible(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoadingFlowers && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#4CAF50" /><Text style={styles.loadingText}>정원 불러오는 중...</Text></View>)}
      {!isLoadingFlowers && (
        <ViewShot key={Array.isArray(placedFlowers) ? placedFlowers.length : 'initial'} ref={gardenViewRef} options={{ format: 'jpg', quality: 0.8, result: "base64" }} style={styles.gardenCaptureArea}>
          <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
            {flowerCanvasHeight > 0 && Array.isArray(placedFlowers) && placedFlowers.map(flower => {
              if (!flower?.source) return null;
              const aspect = (flower.source.width && flower.source.height) ? flower.source.width / flower.source.height : 1;
              const h = currentFlowerPixelHeight, w = h * aspect;

              const flowerCenterXInCanvas = flower.position.x * flowerCanvasWidth;
              const flowerCenterYInCanvas = flower.position.y * flowerCanvasHeight;

              let pixelX = flowerCanvasPaddingHorizontal + flowerCenterXInCanvas - (w / 2);
              let pixelY = flowerCanvasStartY + flowerCenterYInCanvas - (h / 2);

              let cLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(pixelX, flowerCanvasPaddingHorizontal + flowerCanvasWidth - w));
              let cTop = Math.max(flowerCanvasStartY, Math.min(pixelY, flowerCanvasEndY - h));

              return (<TouchableOpacity key={flower.id} onPress={() => handleFlowerPress(flower)} style={[styles.placedFlowerImageTouchable, { height: h, width: w, top: cTop, left: cLeft }]} activeOpacity={0.8}><Image source={flower.source} style={styles.placedFlowerImageActual} resizeMode="contain" /></TouchableOpacity>);
            })}
            <View style={styles.treeAreaWrapper}><View style={{ height: topSpacerHeight }} /><View style={[styles.treeContainer, { height: treeContainerHeight, width: treeContainerWidth }]}><Image source={currentTreeImageSource} style={{ width: `${currentTreeImageScalingFactor * 100}%`, height: `${currentTreeImageScalingFactor * 100}%`}} resizeMode="contain" /></View></View>
          </ImageBackground>
        </ViewShot>
      )}
      <View style={styles.uiOverlayContainer}>
        {!isLoadingFlowers && showEmotionCheckButton && (<View style={styles.bottomAreaContent}><View style={styles.buttonWrapper}><TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7} style={styles.mainActionButton}><Text style={styles.mainActionButtonText}>감정 진단하기</Text></TouchableOpacity></View></View>)}
        <View style={styles.navigationBarPlacement}><NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} /></View>
      </View>
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleModalClose}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}><TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}><View style={styles.modalContent}><Text style={styles.modalText}>감정 진단을 시작하시겠습니까?</Text><View style={styles.modalButtons}><TouchableOpacity onPress={handleSimpleEmotionCheck} style={styles.modalDialogButton} activeOpacity={0.7}><Text style={styles.modalDialogButtonText}>간단 진단</Text></TouchableOpacity><TouchableOpacity onPress={handleConfirmEmotionCheck} style={styles.modalDialogButton} activeOpacity={0.7}><Text style={styles.modalDialogButtonText}>심층 진단</Text></TouchableOpacity></View></View></TouchableOpacity></TouchableOpacity></Modal>
      <Modal visible={isResultModalVisible} transparent={true} animationType="fade" onRequestClose={handleResultModalClose}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleResultModalClose}><TouchableOpacity activeOpacity={1} style={styles.resultModalContentContainer}><View style={styles.resultModalContent}>{resultModalEmotionIcon && (<Image source={resultModalEmotionIcon} style={styles.resultEmotionIcon} resizeMode="contain" />)}{resultModalImage ? (<Image source={resultModalImage} style={styles.resultFlowerImage} resizeMode="contain" />) : (<View style={styles.resultImagePlaceholder}><Text>새로운 꽃 없음</Text></View>)}<Text style={styles.resultModalText}>{resultModalMessage}</Text><TouchableOpacity onPress={handleResultModalClose} style={styles.resultCloseButton} activeOpacity={0.7}><Text style={styles.resultCloseButtonText}>확인</Text></TouchableOpacity></View></TouchableOpacity></TouchableOpacity></Modal>
      
      {selectedFlowerData && (
        <Modal visible={isFlowerInfoModalVisible} transparent={true} animationType="fade" onRequestClose={handleFlowerInfoModalClose}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleFlowerInfoModalClose}>
            <TouchableOpacity activeOpacity={1} style={[styles.flowerInfoModalContainer, { height: windowHeight * POPUP_EFFECTIVE_HEIGHT_PERCENTAGE_OF_SCREEN, maxHeight: 500 }]}>
              <View style={styles.flowerInfoModalContent}>
                {showChatHistoryInModal ? ( <><Text style={styles.flowerInfoTitle}>대화 기록</Text><View style={styles.chatHistoryContainer}>{isLoadingChatHistory ? (<View style={styles.chatLoadingContainer}><ListActivityIndicator size="small" color="#2196F3" /><Text style={styles.chatLoadingText}>대화 기록 불러오는 중...</Text></View>) : ((selectedFlowerData.messages?.length >= 0) ? (<FlatList ref={chatHistoryFlatListRef} data={selectedFlowerData.messages} renderItem={renderChatHistoryItem} keyExtractor={(item, idx) => item.id || `chat-${idx}-${Date.now()}`} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }} ListEmptyComponent={<View style={styles.emptyChatContainer}><Text style={styles.emptyChatText}>대화 기록이 없습니다.</Text></View>} extraData={selectedFlowerData.messages} initialNumToRender={10} windowSize={5} removeClippedSubviews={Platform.OS === 'android'} />) : (<View style={styles.emptyChatContainer}><Text style={styles.emptyChatText}>대화 기록을 불러올 수 없습니다.</Text></View>))}</View><View style={styles.flowerInfoButtonArea}><TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}><Text style={styles.flowerInfoButtonText}>기본 정보 보기</Text></TouchableOpacity><TouchableOpacity onPress={handleFlowerInfoModalClose} style={[styles.flowerInfoButton, styles.flowerInfoCloseButton]}><Text style={styles.flowerInfoButtonText}>닫기</Text></TouchableOpacity></View></>
                ) : ( <><Text style={styles.flowerInfoTitle}>{selectedFlowerData.creationDate || '날짜 정보 없음'}</Text><View style={styles.flowerInfoMainContent}><View style={[styles.flowerInfoImagesContainer, flowerInfoModalDynamicStyles.imagesContainer]}>{selectedFlowerData.source && (<Image source={selectedFlowerData.source} style={flowerInfoModalDynamicStyles.displayImage} resizeMode="contain" />)}{IMAGES.emotionIcon?.[selectedFlowerData.emotionKey] && (<Image source={IMAGES.emotionIcon[selectedFlowerData.emotionKey]} style={flowerInfoModalDynamicStyles.displayImage} resizeMode="contain" />)}</View><Text style={styles.flowerInfoEmotionName}>{selectedFlowerData.emotionName}</Text></View><View style={styles.flowerInfoButtonArea}>{selectedFlowerData.messages?.length > 0 && (<TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.flowerInfoButton}><Text style={styles.flowerInfoButtonText}>대화 기록 보기</Text></TouchableOpacity>)}<TouchableOpacity onPress={handleFlowerInfoModalClose} style={[styles.flowerInfoButton, styles.flowerInfoCloseButton, !(selectedFlowerData.messages?.length > 0) && { alignSelf: 'center'}]}><Text style={styles.flowerInfoButtonText}>닫기</Text></TouchableOpacity></View></>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      <Modal visible={isGardenCompleteAlertVisible} transparent={true} animationType="fade" onRequestClose={handleGardenCompleteAlertClose}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleGardenCompleteAlertClose}>
              <TouchableOpacity activeOpacity={1} style={[styles.genericInfoModalContainer, { height: windowHeight * GENERIC_ALERT_POPUP_HEIGHT_RATIO, maxHeight: 250 }]}>
                  <View style={styles.genericInfoModalContent}>
                      <Text style={styles.genericInfoModalTitle}>알림</Text>
                      <Text style={styles.genericInfoModalMessage}>{gardenCompleteAlertMessage}</Text>
                  </View>
                  <View style={styles.genericInfoModalButtonContainer}>
                      <TouchableOpacity onPress={handleGardenCompleteAlertClose} style={styles.genericInfoModalButton}>
                          <Text style={styles.genericInfoModalButtonText}>확인</Text>
                      </TouchableOpacity>
                  </View>
              </TouchableOpacity>
          </TouchableOpacity>
      </Modal>

      <Modal visible={isGardenResetAlertVisible} transparent={true} animationType="fade" onRequestClose={handleGardenResetAlertClose}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleGardenResetAlertClose}>
              <TouchableOpacity activeOpacity={1} style={[styles.genericInfoModalContainer, { height: windowHeight * GENERIC_ALERT_POPUP_HEIGHT_RATIO, maxHeight: 250 }]}>
                  <View style={styles.genericInfoModalContent}>
                      <Text style={styles.genericInfoModalTitle}>새로운 날</Text>
                      <Text style={styles.genericInfoModalMessage}>{gardenResetAlertMessage}</Text>
                  </View>
                  <View style={styles.genericInfoModalButtonContainer}>
                      <TouchableOpacity onPress={handleGardenResetAlertClose} style={styles.genericInfoModalButton}>
                          <Text style={styles.genericInfoModalButtonText}>확인</Text>
                      </TouchableOpacity>
                  </View>
              </TouchableOpacity>
          </TouchableOpacity>
      </Modal>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  gardenCaptureArea: { flex: 1 },
  backgroundImageFill: { flex: 1 },
  placedFlowerImageTouchable: { position: 'absolute', zIndex: 10 },
  placedFlowerImageActual: { width: '100%', height: '100%' },
  treeAreaWrapper: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  treeContainer: { justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  uiOverlayContainer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomAreaContent: { paddingBottom: ESTIMATED_NAV_BAR_HEIGHT + 10, alignItems: 'center', justifyContent: 'flex-end', minHeight: ESTIMATED_NAV_BAR_HEIGHT + BUTTON_BOTTOM_FIXED_MARGIN + 50 },
  buttonWrapper: { marginBottom: BUTTON_BOTTOM_FIXED_MARGIN, alignItems: 'center', width: '80%', maxWidth: 300 },
  mainActionButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 0, shadowOpacity: 0 },
  mainActionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  navigationBarPlacement: { width: '100%', position: 'absolute', bottom: 0 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContentContainer: {},
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  modalDialogButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, elevation: 0 },
  modalDialogButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultModalContentContainer: {},
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  resultEmotionIcon: { width: 50, height: 50, marginBottom: 10 },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15 },
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10 },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  flowerInfoModalContainer: { width: `${POPUP_WIDTH_PERCENTAGE_OF_SCREEN * 100}%`, maxWidth: MAX_POPUP_WIDTH_ABSOLUTE, backgroundColor: 'white', borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, overflow: 'hidden' },
  flowerInfoModalContent: { width: '100%', flex: 1, flexDirection: 'column', paddingHorizontal: 20, paddingVertical: 15 },
  flowerInfoTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15, flexShrink: 0 },
  flowerInfoMainContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 10 },
  flowerInfoImagesContainer: { flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
  flowerInfoEmotionName: { fontSize: 18, color: '#444', fontWeight: '500', textAlign: 'center', width: '100%' },
  flowerInfoButtonArea: { width: '100%', alignItems: 'center', paddingTop: 15, flexDirection: 'column', gap: 10, flexShrink: 0 },
  flowerInfoButton: { backgroundColor: '#2196F3', paddingVertical: 10, borderRadius: 8, width: '90%', alignItems: 'center' },
  flowerInfoCloseButton: { backgroundColor: '#757575' },
  flowerInfoButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  genericInfoModalContainer: { width: `${POPUP_WIDTH_PERCENTAGE_OF_SCREEN * 100}%`, maxWidth: MAX_POPUP_WIDTH_ABSOLUTE, backgroundColor: 'white', borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, overflow: 'hidden', },
  genericInfoModalContent: { width: '100%', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 60, alignItems: 'center', flex: 1, justifyContent: 'center', }, // 수정됨
  genericInfoModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15, },
  genericInfoModalMessage: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24, },
  genericInfoModalButtonContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center', }, // 추가됨
  genericInfoModalButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 35, }, // alignSelf 제거
  genericInfoModalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  chatHistoryContainer: { flex: 1, width: '100%', paddingHorizontal: 5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  chatLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatLoadingText: { marginTop: 8, fontSize: 14, color: '#666' },
  emptyChatContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChatText: { fontSize: 15, color: '#888' },
  chatMessageOuterContainer: { flexDirection: 'row', marginVertical: 5, maxWidth: '100%' },
  chatBotRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', paddingRight: '15%' },
  chatUserRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', paddingLeft: '15%' },
  chatMessageBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, maxWidth: '100%' },
  chatBotBubble: { backgroundColor: '#e5e5ea', borderTopLeftRadius: 0, alignSelf: 'flex-start' },
  chatUserBubble: { backgroundColor: '#dcf8c6', borderTopRightRadius: 0, alignSelf: 'flex-end' },
  chatMessageText: { fontSize: 15, color: '#000', lineHeight: 20 },
});

export default HomeScreen;