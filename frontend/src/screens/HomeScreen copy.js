// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BackHandler, Alert, Platform, ScrollView, FlatList, ActivityIndicator as ListActivityIndicator, TextInput, Button } from 'react-native'; // TextInput, Button 추가
import { useFocusEffect } from '@react-navigation/native';
// import { getDailyRecordResult, getCurrentGarden } from '../api/apiClient'; // Context에서 호출하므로 직접 호출 불필요
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, TouchableOpacity, Image, Text,
  ImageBackground, SafeAreaView, useWindowDimensions, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // COMPLETED_GARDENS_KEY 에 대한 접근은 유지 가능 (클라이언트 전용 스냅샷)
import ViewShot from 'react-native-view-shot';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';
import { keyToEmotionNameMap } from '../constants/emotionMaps'; // emotionMaps.js 파일 생성 가정

// --- 상수 정의 (기존과 동일) ---
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

// 클라이언트 측에만 저장되는 완성된 정원 스냅샷 키
const COMPLETED_GARDENS_KEY = '@completedGardens';

// (POPUP 관련 상수들은 기존과 동일하게 유지)
// ...

const HomeScreen = ({ navigation, route }) => {
  const {
    currentGardenDetails,
    contextPlacedFlowers, // GardenContext에서 오는 꽃 목록
    isLoadingGarden,    // GardenContext의 초기 정원 로딩 상태
    isCompletingGarden, // GardenContext의 정원 완성 API 호출 중 로딩 상태
    gardenError,
    refreshCurrentGarden,
    completeGarden,
  } = useGarden();

  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isNewAccountJustCreated, clearNewAccountFlag } = useAuth();

  // --- HomeScreen UI 및 인터랙션 관련 상태 ---
  const [isWelcomeModalVisible, setIsWelcomeModalVisible] = useState(false); // 온보딩/새 계정 환영 모달
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);  // 진단 결과 표시 모달
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [resultModalEmotionIcon, setResultModalEmotionIcon] = useState(null);

  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);

  const gardenViewRef = useRef();
  const [isFlowerInfoModalVisible, setIsFlowerInfoModalVisible] = useState(false);
  const [selectedFlowerData, setSelectedFlowerData] = useState(null);
  const [showChatHistoryInModal, setShowChatHistoryInModal] = useState(false);
  const chatHistoryFlatListRef = useRef(null);
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);

  const [isProcessingDiagnosis, setIsProcessingDiagnosis] = useState(false); // 진단 결과 후 서버 새로고침 중 로딩

  // 정원 완성 관련 상태
  const [isGardenNameModalVisible, setIsGardenNameModalVisible] = useState(false);
  const [gardenNameToComplete, setGardenNameToComplete] = useState('');
  const [isGardenCompleteAlertVisible, setIsGardenCompleteAlertVisible] = useState(false); // 정원 완성 알림 모달
  const [completedGardenInfoForAlert, setCompletedGardenInfoForAlert] = useState(null); // 알림에 사용할 완성된 정원 정보
  // const [gardenCompleteAlertMessage, setGardenCompleteAlertMessage] = useState("정원 완성! 현재 정원의 모습이 보관함에 저장되었습니다."); // -> completedGardenInfoForAlert 사용

  // const [isGardenResetAlertVisible, setIsGardenResetAlertVisible] = useState(false); // 서버가 새 정원을 주므로 불필요
  // const [gardenResetAlertMessage, setGardenResetAlertMessage] = useState("새로운 정원을 가꿀 시간입니다!");


  // --- 파생 상태 (Derived State from Context) ---
  const showEmotionCheckButton = useMemo(() => currentGardenDetails ? !currentGardenDetails.is_complete : false, [currentGardenDetails]);
  const isCurrentGardenFull = useMemo(() => Array.isArray(contextPlacedFlowers) && contextPlacedFlowers.length >= MAX_FLOWERS, [contextPlacedFlowers]);
  const isGardenReadyForCompletion = useMemo(() => currentGardenDetails && !currentGardenDetails.is_complete && isCurrentGardenFull, [currentGardenDetails, isCurrentGardenFull]);


  // --- 계산된 값들 (기존과 동일) ---
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


  // --- Effects ---

  // 새로운 계정 생성 팝업 (기존 유지)
  useEffect(() => {
    if (isNewAccountJustCreated) {
      // Alert.alert 또는 커스텀 모달 (setIsWelcomeModalVisible(true))
      Alert.alert("환영합니다!", "새로운 계정이 생성되었습니다!", [{ text: "확인", onPress: () => clearNewAccountFlag() }], { cancelable: false });
    }
  }, [isNewAccountJustCreated, clearNewAccountFlag]);


  // --- 진단 결과 처리 useEffect (GardenContext 연동) ---
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


  // --- 나무 이미지/스케일 업데이트 (GardenContext 데이터 기반) ---
  useEffect(() => {
    if (currentGardenDetails) {
      const serverTreeLevel = currentGardenDetails.tree_level;
      let newSrc = IMAGES.treeImage; let newScale = TREE_IMAGE_SCALE_BASE;
      if (serverTreeLevel >= 10 && IMAGES.Tree_10) { newSrc = IMAGES.Tree_10; newScale = TREE_IMAGE_SCALE_10; }
      else if (serverTreeLevel >= 8 && IMAGES.Tree_8) { newSrc = IMAGES.Tree_8; newScale = TREE_IMAGE_SCALE_8; }
      else if (serverTreeLevel >= 6 && IMAGES.Tree_6) { newSrc = IMAGES.Tree_6; newScale = TREE_IMAGE_SCALE_6; }
      else if (serverTreeLevel >= 4 && IMAGES.Tree_4) { newSrc = IMAGES.Tree_4; newScale = TREE_IMAGE_SCALE_4; }
      else if (serverTreeLevel >= 2 && IMAGES.Tree_2) { newSrc = IMAGES.Tree_2; newScale = TREE_IMAGE_SCALE_2; }
      if (currentTreeImageSource !== newSrc) setCurrentTreeImageSource(newSrc);
      if (currentTreeImageScalingFactor !== newScale) setCurrentTreeImageScalingFactor(newScale);
    } else {
      setCurrentTreeImageSource(IMAGES.treeImage);
      setCurrentTreeImageScalingFactor(TREE_IMAGE_SCALE_BASE);
    }
  }, [currentGardenDetails]); // currentTreeImageSource, currentTreeImageScalingFactor 의존성 제거 (내부에서만 set)


  // --- 정원 완성 처리 관련 함수 ---
  const promptForGardenNameAndComplete = () => {
    if (currentGardenDetails && !currentGardenDetails.is_complete) {
      setIsGardenNameModalVisible(true);
    } else {
      Alert.alert("알림", "이미 완성되었거나 정원 정보가 없습니다.");
    }
  };

  const handleCompleteGardenWithName = async () => {
    if (!gardenNameToComplete.trim()) {
      Alert.alert("오류", "정원 이름을 입력해주세요."); return;
    }
    if (!currentGardenDetails?.garden_id) {
      Alert.alert("오류", "현재 정원 정보를 찾을 수 없습니다."); setIsGardenNameModalVisible(false); return;
    }

    setIsGardenNameModalVisible(false);
    // isCompletingGarden은 GardenContext에서 관리하므로, UI는 해당 상태를 보고 로딩 표시

    let snapshotData = null;
    if (gardenViewRef.current) {
      try {
        snapshotData = await gardenViewRef.current.capture({ format: "jpg", quality: 0.8, result: "base64" });
      } catch (captureError) { console.warn('[HomeScreen] Failed to capture snapshot:', captureError); }
    }

    try {
      const completedInfo = await completeGarden(currentGardenDetails.garden_id, gardenNameToComplete, snapshotData);
      setCompletedGardenInfoForAlert(completedInfo); // 알림용 정보 저장
      setIsGardenCompleteAlertVisible(true);        // 알림 모달 띄우기
      setGardenNameToComplete('');                  // 입력 필드 초기화

      // (선택적) 클라이언트 스냅샷 저장
      if (snapshotData && completedInfo?.garden_id) {
        const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
        const localCompletedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
        localCompletedGardens.push({ /* ... */ });
        await AsyncStorage.setItem(COMPLETED_GARDENS_KEY, JSON.stringify(localCompletedGardens));
      }
    } catch (error) {
      Alert.alert("정원 완성 실패", gardenError || "알 수 없는 오류."); // gardenError는 Context에서 설정됨
    }
  };

  // 정원 완성 알림을 위한 useEffect (모달이나 Alert 표시)
  useEffect(() => {
    if (isGardenCompleteAlertVisible && completedGardenInfoForAlert) {
      Alert.alert(
        "정원 완성!",
        `'${completedGardenInfoForAlert.name}' 정원이 멋지게 완성되었습니다!\n보관함에서 확인할 수 있어요.`,
        [{ text: "확인", onPress: () => {
            setIsGardenCompleteAlertVisible(false);
            setCompletedGardenInfoForAlert(null);
        }}]
      );
    }
  }, [isGardenCompleteAlertVisible, completedGardenInfoForAlert]);


  // --- 화면 포커스 시 데이터 새로고침 및 뒤로가기 처리 ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const performFocusActions = async () => {
        // 로딩 중이 아닐 때만, 화면 포커스 시 서버 데이터 새로고침
        if (isActive && !isLoadingGarden && !isCompletingGarden && !isProcessingDiagnosis) {
          console.log('[HomeScreen] Refreshing current garden on focus.');
          await refreshCurrentGarden();
        }
      };
      performFocusActions();

      const onBackPress = () => {
        Alert.alert("앱 종료", "앱을 종료하시겠습니까?",
          [{ text: "취소", style: "cancel" }, { text: "확인", onPress: () => BackHandler.exitApp() }],
          { cancelable: false }
        );
        return true; // 기본 뒤로가기 동작 막음
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => { isActive = false; subscription.remove(); };
    }, [refreshCurrentGarden, isLoadingGarden, isCompletingGarden, isProcessingDiagnosis])
  );

  // 채팅 히스토리 로딩 (기존 유지)
  useEffect(() => {
    if (isFlowerInfoModalVisible && showChatHistoryInModal) { /* ... */ }
    else setIsLoadingChatHistory(false);
  }, [isFlowerInfoModalVisible, showChatHistoryInModal, selectedFlowerData]);


  // --- 로딩 및 에러 상태에 따른 전체 화면 UI ---
  const overallIsLoading = isLoadingGarden || isCompletingGarden || isProcessingDiagnosis;

  if (isLoadingGarden && !currentGardenDetails && !contextPlacedFlowers.length) { // 최초 데이터 로딩 중
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>정원을 불러오는 중...</Text>
      </View>
    );
  }

  if (gardenError && !currentGardenDetails) { // 로드 중 심각한 에러 발생
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>데이터 로드 실패</Text>
        <Text>{gardenError}</Text>
        <Button title="다시 시도" onPress={() => refreshCurrentGarden()} />
      </View>
    );
  }

  // --- 핸들러 함수들 (기존과 유사, Context 데이터 사용) ---
  const handleEmotionCheckPress = () => setIsWelcomeModalVisible(true); // '환영 모달'로 이름 변경 또는 적절한 모달 사용
  const handleConfirmEmotionCheck = () => { setIsWelcomeModalVisible(false); handleNavigate(navigation, 'DeepDiagnosis'); }; // 심층 진단
  const handleSimpleEmotionCheck = () => { setIsWelcomeModalVisible(false); navigation.navigate('SimpleDiagnosis'); }; // 간단 진단
  const handleModalClose = () => setIsWelcomeModalVisible(false);
  const handleResultModalClose = () => { setIsResultModalVisible(false); /* ... */ }; // checkDiagnosisStatus는 이제 불필요
  const handleFlowerPress = (flower) => { /* ... selectedFlowerData 설정 ... */ };
  // ... (다른 핸들러 함수들) ...


  // --- 최종 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {overallIsLoading && ( // API 호출 관련 로딩 오버레이
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>
            {isProcessingDiagnosis ? "진단 결과 반영 중..." : (isCompletingGarden ? "정원 완성 처리 중..." : "데이터 동기화 중...")}
          </Text>
        </View>
      )}

      <ViewShot
        key={Array.isArray(contextPlacedFlowers) ? contextPlacedFlowers.map(f => f.id).join('_') : 'initial-garden'} // 꽃 목록 변경 시 재캡처 유도
        ref={gardenViewRef}
        options={{ format: 'jpg', quality: 0.8, result: "base64" }}
        style={styles.gardenCaptureArea}
      >
        <ImageBackground
          source={currentGardenDetails?.sky_color === 'night' ? IMAGES.nightBackground : IMAGES.dayBackground} // 서버 sky_color 사용
          style={styles.backgroundImageFill}
          resizeMode="cover"
        >
          {/* 나무 렌더링 */}
          <View style={styles.treeAreaWrapper}>
            <View style={{ height: topSpacerHeight }} />
            <View style={[styles.treeContainer, { height: treeContainerHeight, width: treeContainerWidth }]}>
              <Image source={currentTreeImageSource} style={{ width: `${currentTreeImageScalingFactor * 100}%`, height: `${currentTreeImageScalingFactor * 100}%`}} resizeMode="contain" />
            </View>
          </View>

          {/* 꽃 렌더링: contextPlacedFlowers와 flower.position 사용 */}
          {flowerCanvasHeight > 0 && Array.isArray(contextPlacedFlowers) && contextPlacedFlowers.map(flower => {
            if (!flower?.source || !flower.position) return null; // 필수 데이터 확인
            const aspect = (flower.source.width && flower.source.height) ? flower.source.width / flower.source.height : 1;
            const h = currentFlowerPixelHeight;
            const w = h * aspect;

            // 서버 position (0.0 ~ 1.0 가정)을 픽셀 좌표로 변환
            // 만약 서버 position이 이미 픽셀이라면 이 변환은 불필요
            const flowerCenterXInCanvas = flower.position.x * flowerCanvasWidth;
            const flowerCenterYInCanvas = flower.position.y * flowerCanvasHeight;

            let pixelX = flowerCanvasPaddingHorizontal + flowerCenterXInCanvas - (w / 2);
            let pixelY = flowerCanvasStartY + flowerCenterYInCanvas - (h / 2);

            // 화면 경계 처리 (꽃이 화면 밖으로 나가지 않도록)
            let cLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(pixelX, flowerCanvasPaddingHorizontal + flowerCanvasWidth - w));
            let cTop = Math.max(flowerCanvasStartY, Math.min(pixelY, flowerCanvasEndY - h));

            return (
              <TouchableOpacity key={flower.id} onPress={() => handleFlowerPress(flower)} style={[styles.placedFlowerImageTouchable, { height: h, width: w, top: cTop, left: cLeft }]} activeOpacity={0.8}>
                <Image source={flower.source} style={styles.placedFlowerImageActual} resizeMode="contain" />
              </TouchableOpacity>
            );
          })}
        </ImageBackground>
      </ViewShot>

      {/* UI 오버레이 (버튼 등) */}
      <View style={styles.uiOverlayContainer}>
        {showEmotionCheckButton && (
          <View style={styles.bottomAreaContent}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7} style={styles.mainActionButton} disabled={overallIsLoading}>
                <Text style={styles.mainActionButtonText}>감정 기록하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* 정원 완성 버튼 (isGardenReadyForCompletion으로 제어) */}
        {isGardenReadyForCompletion && (
           <View style={styles.bottomAreaContent}> {/* 위치 조정 필요 */}
            <View style={styles.buttonWrapper}>
              <TouchableOpacity onPress={promptForGardenNameAndComplete} activeOpacity={0.7} style={[styles.mainActionButton, {backgroundColor: '#4CAF50'}]} disabled={overallIsLoading}>
                <Text style={styles.mainActionButtonText}>정원 완성하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.navigationBarPlacement}><NavigationBar currentScreen="Home" navigation={navigation} isTransitioning={isTransitioning} /></View>
      </View>

      {/* 각종 모달들 (기존 구조 유지, visible 상태와 핸들러 함수 사용) */}
      <Modal visible={isWelcomeModalVisible} /* ... */ >{/* 감정 진단 시작 모달 */}</Modal>
      <Modal visible={isResultModalVisible} /* ... */ >{/* 진단 결과 모달 */}</Modal>
      {selectedFlowerData && (<Modal visible={isFlowerInfoModalVisible} /* ... */ >{/* 꽃 정보/대화 모달 */}</Modal>)}
      <Modal visible={isGardenNameModalVisible} /* ... */ >{/* 정원 이름 입력 모달 */}</Modal>
      {/* 정원 완성 알림은 useEffect 내 Alert으로 처리 중, 필요시 커스텀 모달로 변경 */}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (이전 답변의 스타일 및 추가된 로딩, 에러, 모달 스타일 포함)
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#eef7ff' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 10 },
  // ... (나머지 스타일은 이전 답변과 사용자 코드에서 가져와 통합)
});

// emotionMaps.js (예시 파일)
// export const keyToEmotionNameMap = {
//   H: '행복', Ax: '불안', R: '평온', S: '슬픔',
//   Ag: '분노', F: '두려움', Dr: '갈망', Dg: '역겨움',
// };

export default HomeScreen;