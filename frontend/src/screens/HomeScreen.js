// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackHandler, Alert, Platform, ScrollView, FlatList } from 'react-native'; // ScrollView, FlatList 추가
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, TouchableOpacity, Image, Text,
  ImageBackground, SafeAreaView, useWindowDimensions, Modal,
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
const MAX_FLOWER_HEIGHT = 6000;
const MIN_FLOWER_HEIGHT = 3;

const RELATIVE_FLOWER_POSITIONS = [
  { topRatio: 0.07, leftRatio: 0.2 }, { topRatio: 0.10, leftRatio: 0.5 }, { topRatio: 0.08, leftRatio: 0.8 },
  { topRatio: 0.35, leftRatio: 0.1 }, { topRatio: 0.40, leftRatio: 0.4 }, { topRatio: 0.38, leftRatio: 0.7 }, { topRatio: 0.42, leftRatio: 0.9 },
  { topRatio: 0.75, leftRatio: 0.25 }, { topRatio: 0.80, leftRatio: 0.55 }, { topRatio: 0.78, leftRatio: 0.85 },
];
const MAX_FLOWERS = RELATIVE_FLOWER_POSITIONS.length;

// AsyncStorage 키
const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';
const PLACED_FLOWERS_KEY = '@placedFlowers';
const COMPLETED_GARDENS_KEY = '@completedGardens';
const CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY = '@currentGardenSnapshotTaken';

// 감정 키에 따른 감정 이름 매핑
const keyToEmotionNameMap = {
  H: '행복', Ax: '불안', R: '평온', S: '슬픔',
  Ag: '분노', F: '두려움', Dr: '갈망', Dg: '역겨움',
};

const HomeScreen = ({ navigation, route }) => {
  // --- State 및 Hooks ---
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false); // 감정 진단 시작 모달
  const [isResultModalVisible, setIsResultModalVisible] = useState(false); // 진단 결과 모달
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [resultModalEmotionIcon, setResultModalEmotionIcon] = useState(null);
  const [placedFlowers, setPlacedFlowers] = useState([]);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);
  const [showEmotionCheckButton, setShowEmotionCheckButton] = useState(true);
  const [isGardenFull, setIsGardenFull] = useState(false);
  const gardenViewRef = useRef();
  const [currentGardenSnapshotTaken, setCurrentGardenSnapshotTaken] = useState(false);

  // 꽃 정보 모달 관련 State
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
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    const loadInitialState = async () => {
      setIsGardenFull(false);
      setCurrentGardenSnapshotTaken(false);
      try {
        const snapshotTakenValue = await AsyncStorage.getItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY);
        if (snapshotTakenValue === 'true') {
          setCurrentGardenSnapshotTaken(true);
        }
        const savedFlowers = await AsyncStorage.getItem(PLACED_FLOWERS_KEY);
        if (savedFlowers !== null) {
          const parsedFlowers = JSON.parse(savedFlowers);
          const currentFlowers = parsedFlowers.length > MAX_FLOWERS && MAX_FLOWERS > 0
                                ? parsedFlowers.slice(0, MAX_FLOWERS)
                                : parsedFlowers;
          setPlacedFlowers(currentFlowers);
          setIsGardenFull(currentFlowers.length >= MAX_FLOWERS);
        } else {
          setPlacedFlowers([]);
          await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
          setCurrentGardenSnapshotTaken(false);
        }
      } catch (error) {
        console.error('[HomeScreen] Failed to load initial state:', error);
        setPlacedFlowers([]);
        setCurrentGardenSnapshotTaken(false);
      }
    };
    loadInitialState();
  }, []);

  useEffect(() => {
    const savePlacedFlowers = async () => {
      try {
        if (placedFlowers && placedFlowers.length > 0) {
             await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(placedFlowers));
        } else if (placedFlowers && placedFlowers.length === 0) {
            await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
            await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'false');
            setCurrentGardenSnapshotTaken(false);
            console.log("[HomeScreen] Garden reset, snapshot flag reset in AsyncStorage.");
        }
      } catch (error) { console.error('[HomeScreen] Failed to save placed flowers:', error); }
    };
    if (placedFlowers !== null) {
        savePlacedFlowers();
        const currentGardenFullState = placedFlowers.length >= MAX_FLOWERS;
        if (isGardenFull !== currentGardenFullState) {
            setIsGardenFull(currentGardenFullState);
        }
    }
  }, [placedFlowers, isGardenFull]);

  const captureAndSaveGarden = useCallback(async () => {
    if (!gardenViewRef.current) { return; }
    try {
      const base64Data = await gardenViewRef.current.capture({ format: "jpg", quality: 0.8, result: "base64" });
      const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
      const completedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
      completedGardens.push({ timestamp: Date.now(), snapshotData: `data:image/jpeg;base64,${base64Data}` });
      await AsyncStorage.setItem(COMPLETED_GARDENS_KEY, JSON.stringify(completedGardens));
      Alert.alert("정원 완성!", "현재 정원의 모습이 보관함에 저장되었습니다.");
      await AsyncStorage.setItem(CURRENT_GARDEN_SNAPSHOT_TAKEN_KEY, 'true');
      setCurrentGardenSnapshotTaken(true);
    } catch (error) { console.error('[HomeScreen] Failed to capture or save garden snapshot:', error); }
  }, []);

  useEffect(() => {
    if (isGardenFull && !currentGardenSnapshotTaken) {
      const timer = setTimeout(() => { captureAndSaveGarden(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGardenFull, currentGardenSnapshotTaken, captureAndSaveGarden]);

  const checkDiagnosisStatusAndReset = useCallback(async () => {
    try {
      const lastDiagnosisDate = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
      const currentAppDateObj = await getAppCurrentDate();
      const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);
      const canDiagnoseToday = lastDiagnosisDate !== currentAppDateFormatted;
      if (canDiagnoseToday && isGardenFull) {
        Alert.alert("새로운 시작", "정원이 가득 찼어요! 새로운 마음으로 정원을 가꿔보세요.");
        setPlacedFlowers([]);
        setShowEmotionCheckButton(true);
      } else {
        setShowEmotionCheckButton(canDiagnoseToday);
      }
    } catch (error) { setShowEmotionCheckButton(true); }
  }, [isGardenFull]);

  useFocusEffect(
    useCallback(() => {
      checkDiagnosisStatusAndReset();
      if (route.params?.diagnosisCompletedToday) {
        if (navigation && typeof navigation.setParams === 'function') {
          navigation.setParams({ diagnosisCompletedToday: undefined });
        }
      }
    }, [checkDiagnosisStatusAndReset, route.params?.diagnosisCompletedToday, navigation])
  );

  useEffect(() => {
    if (route.params?.diagnosisResult && route.params?.emotionKey) {
      const { diagnosisResult, emotionKey, primaryEmotionName, diagnosisMessages } = route.params;
      let flowerImageForModal = null;
      let emotionIconForModal = null;
      let shouldPlantNewFlower = false;
      let newFlowerDataForPlanting = null;

      if (emotionKey && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKey]) {
          emotionIconForModal = IMAGES.emotionIcon[emotionKey];
      }
      if (emotionKey && IMAGES.flowers && IMAGES.flowers[emotionKey]) {
          const allImagesForEmotion = IMAGES.flowers[emotionKey];
          const allImageKeysForEmotion = Object.keys(allImagesForEmotion);
          if (allImageKeysForEmotion.length > 0) {
              const placedImageKeysForEmotion = placedFlowers.filter(f => f.emotionKey === emotionKey).map(f => f.imageKey);
              const availableImageKeysToPlant = allImageKeysForEmotion.filter(key => !placedImageKeysForEmotion.includes(key));
              if (availableImageKeysToPlant.length > 0) {
                  const randomIndex = Math.floor(Math.random() * availableImageKeysToPlant.length);
                  const imageKeyToPlant = availableImageKeysToPlant[randomIndex];
                  flowerImageForModal = allImagesForEmotion[imageKeyToPlant];
                  shouldPlantNewFlower = true;
                  newFlowerDataForPlanting = {
                      id: `${Date.now()}-${emotionKey}-${imageKeyToPlant}`,
                      source: flowerImageForModal,
                      emotionKey: emotionKey,
                      imageKey: imageKeyToPlant,
                      emotionName: primaryEmotionName || keyToEmotionNameMap[emotionKey] || '정보 없음',
                      messages: diagnosisMessages || [],
                  };
              } else {
                  if (placedImageKeysForEmotion.length > 0) {
                      flowerImageForModal = allImagesForEmotion[placedImageKeysForEmotion[Math.floor(Math.random() * placedImageKeysForEmotion.length)]];
                  } else { flowerImageForModal = allImagesForEmotion[allImageKeysForEmotion[0]]; }
                  shouldPlantNewFlower = false;
              }
          }
      }

      if (shouldPlantNewFlower && newFlowerDataForPlanting && flowerCanvasHeight > 0) {
        setPlacedFlowers(prevFlowers => {
          if (prevFlowers.length < MAX_FLOWERS) {
            let updatedFlowers = [...prevFlowers];
            let selectedRelativePos = null;
            const occupiedPositions = new Set(prevFlowers.map(f => JSON.stringify(f.relativePos)));
            const availablePlacementSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));
            if (availablePlacementSlots.length > 0) {
              const randomAvailableIndex = Math.floor(Math.random() * availablePlacementSlots.length);
              selectedRelativePos = availablePlacementSlots[randomAvailableIndex];
              newFlowerDataForPlanting.relativePos = selectedRelativePos;
              updatedFlowers.push(newFlowerDataForPlanting);
              return updatedFlowers;
            } else {
              if (prevFlowers.length > 0) {
                  Alert.alert("알림", "꽃을 심을 빈 자리가 없어 기존 꽃과 교체합니다.");
                  const replaceIndex = Math.floor(Math.random() * prevFlowers.length);
                  newFlowerDataForPlanting.relativePos = prevFlowers[replaceIndex].relativePos; // 기존 위치 사용
                  updatedFlowers.splice(replaceIndex, 1, newFlowerDataForPlanting);
                  return updatedFlowers;
              }
              return prevFlowers;
            }
          } else { return prevFlowers; }
        });
      }

      setResultModalMessage(diagnosisResult);
      setResultModalImage(flowerImageForModal);
      setResultModalEmotionIcon(emotionIconForModal);
      setIsResultModalVisible(true);
      if (navigation && typeof navigation.setParams === 'function') {
        navigation.setParams({
            diagnosisResult: undefined, emotionKey: undefined, diagnosisCompletedToday: undefined,
            primaryEmotionName: undefined, diagnosisMessages: undefined
        });
      }
    }
  }, [route.params, navigation, flowerCanvasHeight, placedFlowers]);

  useEffect(() => {
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
  }, [placedFlowers.length, currentTreeImageSource, currentTreeImageScalingFactor]);

  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => { setIsModalVisible(false); Alert.alert("안내", "심층 진단 기능은 현재 준비 중입니다."); };
  const handleSimpleEmotionCheck = () => { setIsModalVisible(false); navigation.navigate('SimpleDiagnosis'); };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false); setResultModalEmotionIcon(null); setResultModalImage(null);
    if (navigation && typeof navigation.setParams === 'function') {
      if (route.params?.diagnosisResult || route.params?.emotionKey || route.params?.diagnosisCompletedToday) {
        navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined, diagnosisCompletedToday: undefined });
      }
    }
  };

  const handleFlowerPress = (flower) => {
    setSelectedFlowerData({
        emotionKey: flower.emotionKey,
        emotionName: flower.emotionName || keyToEmotionNameMap[flower.emotionKey] || '감정 정보 없음',
        messages: flower.messages || [],
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ViewShot ref={gardenViewRef} options={{ format: 'jpg', quality: 0.8, result: "base64" }} style={styles.gardenCaptureArea}>
        <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
          {flowerCanvasHeight > 0 && placedFlowers.map(flower => {
            const flowerImageAspectRatio = (flower.source && flower.source.width && flower.source.height) ? flower.source.width / flower.source.height : 1;
            const flowerDisplayHeight = currentFlowerPixelHeight;
            const flowerDisplayWidth = flowerDisplayHeight * flowerImageAspectRatio;
            let calculatedTop = flowerCanvasStartY + (flower.relativePos.topRatio * flowerCanvasHeight) - (flowerDisplayHeight / 2);
            let calculatedLeft = flowerCanvasPaddingHorizontal + (flower.relativePos.leftRatio * flowerCanvasWidth) - (flowerDisplayWidth / 2);
            calculatedTop = Math.max(flowerCanvasStartY, Math.min(calculatedTop, flowerCanvasEndY - flowerDisplayHeight));
            calculatedLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(calculatedLeft, flowerCanvasPaddingHorizontal + flowerCanvasWidth - flowerDisplayWidth));
            return (
              <TouchableOpacity key={flower.id} onPress={() => handleFlowerPress(flower)} style={[ styles.placedFlowerImageTouchable, { height: flowerDisplayHeight, width: flowerDisplayWidth, top: calculatedTop, left: calculatedLeft } ]}>
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

      <View style={styles.uiOverlayContainer}>
        <View style={styles.bottomAreaContent}>
          {showEmotionCheckButton && (
            <View style={styles.buttonWrapper}>
              <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
                <TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7}>
                  <Text style={styles.buttonText}>감정 진단하기</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </View>
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

      {/* 꽃 정보 및 대화 기록 모달 */}
      {selectedFlowerData && (
        <Modal
            visible={isFlowerInfoModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleFlowerInfoModalClose}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleFlowerInfoModalClose}>
                <TouchableOpacity activeOpacity={1} style={[styles.flowerInfoModalContainer, showChatHistoryInModal && styles.chatHistoryModalContainer]}>
                    <View style={styles.flowerInfoModalContent}>
                        {!showChatHistoryInModal ? (
                            <>
                                <Text style={styles.flowerInfoTitle}>꽃 정보</Text>
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
                                            <View style={[
                                                styles.chatMessageBubble,
                                                item.sender === 'user' ? styles.userMessageBubble : styles.botMessageBubble
                                            ]}>
                                                <Text style={styles.chatMessageText}>{item.text}</Text>
                                            </View>
                                        )}
                                        contentContainerStyle={styles.chatHistoryListContent}
                                        inverted={false} // 일반적인 순서로 표시
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  gardenCaptureArea: { flex: 1, },
  backgroundImageFill: { flex: 1, },
  placedFlowerImageTouchable: { // 꽃 터치 영역
    position: 'absolute',
    zIndex: 10, // 다른 요소 위에 오도록 (나무보다도 위)
  },
  placedFlowerImageActual: { // 실제 꽃 이미지
    width: '100%',
    height: '100%',
  },
  treeAreaWrapper: {
      position: 'absolute', top: 0, left: 0, right: 0,
      alignItems: 'center', zIndex: 1,
  },
  treeContainer: { justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', },
  uiOverlayContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, },
  bottomAreaContent: {
      paddingBottom: ESTIMATED_NAV_BAR_HEIGHT + 10,
      alignItems: 'center', justifyContent: 'flex-end', flex: 1,
  },
  buttonWrapper: { marginBottom: BUTTON_BOTTOM_FIXED_MARGIN, alignItems: 'center', },
  gradientButton: {
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 25, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarPlacement: { width: '100%', position: 'absolute', bottom: 0, },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContentContainer: {}, // 일반 모달용
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

  // 꽃 정보 모달 스타일
  flowerInfoModalContainer: { // 꽃 정보 모달 컨테이너 크기
    width: '85%',
    maxWidth: 380,
    maxHeight: '70%', // 대화 기록 많을 때 대비
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  chatHistoryModalContainer: { // 대화 기록 보기 시 컨테이너 스타일 (필요시 높이 등 조절)
    // maxHeight: '80%', // 예시: 대화 기록 시 높이 더 크게
  },
  flowerInfoModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  flowerInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  flowerInfoEmotionIcon: {
    width: 70,
    height: 70,
    marginBottom: 10,
  },
  flowerInfoEmotionName: {
    fontSize: 18,
    color: '#444',
    marginBottom: 20,
    fontWeight: '500',
  },
  flowerInfoButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  flowerInfoCloseButton: {
    backgroundColor: '#757575', // 닫기 버튼 다른 색상
  },
  flowerInfoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 대화 기록 스타일
  chatHistoryScrollContainer: {
    width: '100%',
    maxHeight: 300, // 스크롤 영역 최대 높이
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 15,
    padding: 10,
  },
  chatHistoryListContent: {
    // paddingBottom: 10, // FlatList 내부 패딩
  },
  chatMessageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessageBubble: {
    backgroundColor: '#DCF8C6', // 사용자 말풍선 색
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  botMessageBubble: {
    backgroundColor: '#E5E5EA', // 봇 말풍선 색
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  chatMessageText: {
    fontSize: 15,
    color: '#000',
  },
});

export default HomeScreen;