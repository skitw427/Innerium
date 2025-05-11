// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, TouchableOpacity, Image, Text,
  ImageBackground, SafeAreaView, useWindowDimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const MIN_FLOWER_HEIGHT = 30;

const RELATIVE_FLOWER_POSITIONS = [
  { topRatio: 0.05, leftRatio: 0.2 }, { topRatio: 0.1, leftRatio: 0.5 }, { topRatio: 0.08, leftRatio: 0.8 },
  { topRatio: 0.25, leftRatio: 0.1 }, { topRatio: 0.3, leftRatio: 0.4 }, { topRatio: 0.28, leftRatio: 0.7 },
  { topRatio: 0.26, leftRatio: 0.9 }, { topRatio: 0.5, leftRatio: 0.15 }, { topRatio: 0.55, leftRatio: 0.55 },
  { topRatio: 0.52, leftRatio: 0.85 },
  { topRatio: 0.75, leftRatio: 0.3 }, 
  // { topRatio: 0.8, leftRatio: 0.7 }, // 11개로 맞추기 위해 주석 처리 또는 삭제
  // { topRatio: 0.9, leftRatio: 0.5 }
];
// ★★★ MAX_FLOWERS를 RELATIVE_FLOWER_POSITIONS의 길이로 설정하고, 이 배열의 길이를 11로 맞춤 ★★★
const MAX_FLOWERS = RELATIVE_FLOWER_POSITIONS.length; // 이제 이 값은 11 (위 배열 기준)

const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';
const PLACED_FLOWERS_KEY = '@placedFlowers';

const HomeScreen = ({ navigation, route }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [resultModalEmotionIcon, setResultModalEmotionIcon] = useState(null);
  const [placedFlowers, setPlacedFlowers] = useState([]);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);
  const [showEmotionCheckButton, setShowEmotionCheckButton] = useState(true);

  const topSpacerHeight = windowHeight * TOP_SPACER_RATIO;
  const treeContainerHeight = windowHeight * TREE_CONTAINER_AREA_RATIO;
  const treeContainerWidth = treeContainerHeight;

  const flowerCanvasPaddingHorizontal = windowWidth * 0.05;
  const flowerCanvasStartY = topSpacerHeight + treeContainerHeight;
  const flowerCanvasEndY = windowHeight - ESTIMATED_NAV_BAR_HEIGHT;
  const flowerCanvasHeight = flowerCanvasEndY - flowerCanvasStartY;
  const flowerCanvasWidth = windowWidth - (flowerCanvasPaddingHorizontal * 2);

  const calculatedFlowerHeight = windowHeight * FLOWER_HEIGHT_RATIO_OF_WINDOW;
  const currentFlowerPixelHeight = Math.max(MIN_FLOWER_HEIGHT, Math.min(calculatedFlowerHeight, MAX_FLOWER_HEIGHT));

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    const loadPlacedFlowers = async () => {
      try {
        const savedFlowers = await AsyncStorage.getItem(PLACED_FLOWERS_KEY);
        if (savedFlowers !== null) {
          const parsedFlowers = JSON.parse(savedFlowers);
          // MAX_FLOWERS 값 변경에 따른 방어 코드
          if (parsedFlowers.length > MAX_FLOWERS && MAX_FLOWERS > 0) {
            setPlacedFlowers(parsedFlowers.slice(0, MAX_FLOWERS));
          } else {
            setPlacedFlowers(parsedFlowers);
          }
        } else {
          setPlacedFlowers([]);
        }
      } catch (error) {
        console.error('[HomeScreen] Failed to load placed flowers:', error);
        setPlacedFlowers([]);
      }
    };
    loadPlacedFlowers();
  }, []);

  useEffect(() => {
    const savePlacedFlowers = async () => {
      try {
        if (placedFlowers && placedFlowers.length > 0) {
             await AsyncStorage.setItem(PLACED_FLOWERS_KEY, JSON.stringify(placedFlowers));
        } else if (placedFlowers && placedFlowers.length === 0) {
            await AsyncStorage.removeItem(PLACED_FLOWERS_KEY);
        }
      } catch (error) {
        console.error('[HomeScreen] Failed to save placed flowers:', error);
      }
    };
    if (placedFlowers !== null) {
        savePlacedFlowers();
    }
  }, [placedFlowers]);


  const checkDiagnosisStatus = async () => {
    try {
      const lastDiagnosisDate = await AsyncStorage.getItem(LAST_DIAGNOSIS_DATE_KEY);
      const currentAppDateObj = await getAppCurrentDate();
      const currentAppDateFormatted = formatDateToYYYYMMDD(currentAppDateObj);
      if (lastDiagnosisDate === currentAppDateFormatted) {
        setShowEmotionCheckButton(false);
      } else {
        setShowEmotionCheckButton(true);
      }
    } catch (error) {
      console.error('[HomeScreen] Error checking diagnosis status:', error);
      setShowEmotionCheckButton(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkDiagnosisStatus();
      if (route.params?.diagnosisCompletedToday) {
        setShowEmotionCheckButton(false);
        if (navigation && typeof navigation.setParams === 'function') {
            navigation.setParams({ diagnosisCompletedToday: undefined });
        }
      }
    }, [route.params?.diagnosisCompletedToday, navigation])
  );

  // ★★★ 진단 결과 처리 및 꽃 심기/초기화 로직 수정 ★★★
  useEffect(() => {
    if (route.params?.diagnosisResult && route.params?.emotionKey) {
      const { diagnosisResult, emotionKey } = route.params;
      let flowerImageForModal = null;
      let emotionIconForModal = null;
      let shouldPlantNewFlower = false;
      let newFlowerDataForPlanting = null; // 새로 심을 꽃의 전체 데이터 (relativePos 포함)

      if (emotionKey && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKey]) {
        emotionIconForModal = IMAGES.emotionIcon[emotionKey];
      } else { console.warn(`[HomeScreen] Emotion icon not found for key: ${emotionKey}`);}

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
                // relativePos는 아래에서 결정
            };
          } else { // 이미 모든 종류의 꽃을 심은 경우
            if (placedImageKeysForEmotion.length > 0) {
                flowerImageForModal = allImagesForEmotion[placedImageKeysForEmotion[Math.floor(Math.random() * placedImageKeysForEmotion.length)]];
            } else {
                flowerImageForModal = allImagesForEmotion[allImageKeysForEmotion[0]]; // Fallback
            }
            shouldPlantNewFlower = false; // 새로 심지는 않음
          }
        }
      }

      let gardenResetAlertShown = false; // 중복 알림 방지 플래그

      if (shouldPlantNewFlower && newFlowerDataForPlanting && flowerCanvasHeight > 0) {
        setPlacedFlowers(prevFlowers => {
          // 현재 꽃의 개수를 기준으로 MAX_FLOWERS(11)와 비교
          if (prevFlowers.length >= MAX_FLOWERS) {
            if (!gardenResetAlertShown) {
                Alert.alert("정원 가득!", "꽃들이 만개하여 정원이 새로워졌어요! 새로운 시작을 축하합니다!");
                gardenResetAlertShown = true;
            }
            return []; // 정원 즉시 초기화 (새 꽃은 심지 않음)
          }

          let updatedFlowers = [...prevFlowers];
          let selectedRelativePos = null;

          const occupiedPositions = new Set(prevFlowers.map(f => JSON.stringify(f.relativePos)));
          // RELATIVE_FLOWER_POSITIONS 중에서 사용 가능한 슬롯을 찾음
          const availablePlacementSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));

          if (availablePlacementSlots.length > 0) {
            const randomAvailableIndex = Math.floor(Math.random() * availablePlacementSlots.length);
            selectedRelativePos = availablePlacementSlots[randomAvailableIndex];
            newFlowerDataForPlanting.relativePos = selectedRelativePos;
            updatedFlowers.push(newFlowerDataForPlanting);
          } else {
            // 모든 정의된 RELATIVE_FLOWER_POSITIONS 슬롯이 사용 중이지만,
            // prevFlowers.length가 MAX_FLOWERS보다 작은 경우는 로직상 발생하기 어려움
            // (MAX_FLOWERS가 RELATIVE_FLOWER_POSITIONS.length와 같거나 작다고 가정)
            // 만약 발생한다면, 교체 로직을 여기에 두거나, 심지 않음.
            // 현재는 MAX_FLOWERS 도달 시 위에서 먼저 초기화되므로, 이 else if는 거의 실행되지 않음.
            console.warn("[HomeScreen] All defined positions are occupied, but garden count is less than MAX_FLOWERS. This shouldn't normally happen if MAX_FLOWERS <= RELATIVE_FLOWER_POSITIONS.length.");
             // 안전하게 교체 로직 (또는 심지 않음)
            if (prevFlowers.length > 0) {
                Alert.alert("알림", "꽃을 심을 빈 자리가 없어 기존 꽃과 교체합니다.");
                const replaceIndex = Math.floor(Math.random() * prevFlowers.length);
                selectedRelativePos = prevFlowers[replaceIndex].relativePos;
                newFlowerDataForPlanting.relativePos = selectedRelativePos;
                updatedFlowers.splice(replaceIndex, 1, newFlowerDataForPlanting);
            } else {
                return prevFlowers; // 심을 곳도, 교체할 꽃도 없음
            }
          }
          
          // ★★★ 꽃 추가 후, 최종적으로 MAX_FLOWERS 도달 여부 다시 확인 ★★★
          // 이 부분은 사실상 위에서 prevFlowers.length로 체크하는 것으로 충분할 수 있음
          // 하지만, 만약 MAX_FLOWERS가 1이고, 첫 꽃을 심자마자 초기화하고 싶다면 이 위치가 더 적절.
          // 현재는 "11번째 진단이 끝나는 순간" 이므로, 꽃을 심은 *결과*가 11개가 되면 초기화.
          if (updatedFlowers.length >= MAX_FLOWERS) {
            if (!gardenResetAlertShown) {
                Alert.alert("정원 가득!", "꽃들이 만개하여 정원이 새로워졌어요! 새로운 시작을 축하합니다!");
                // gardenResetAlertShown = true; // 이미 위에서 설정되었을 수 있음
            }
            return []; // 정원 초기화
          }
          return updatedFlowers;
        });
      }

      // 결과 모달은 항상 표시 (꽃이 심어졌든 아니든, 정원이 초기화되었든 아니든)
      setResultModalMessage(diagnosisResult);
      setResultModalImage(flowerImageForModal); // 모달에는 해당 진단의 꽃을 보여줌
      setResultModalEmotionIcon(emotionIconForModal);
      setIsResultModalVisible(true);

      // 네비게이션 파라미터 초기화
      if (navigation && typeof navigation.setParams === 'function') {
        navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined, diagnosisCompletedToday: undefined });
      }
    }
  }, [route.params, navigation, flowerCanvasHeight]); // placedFlowers 의존성 제거


  useEffect(() => {
    const flowerCount = placedFlowers.length;
    let newTreeImageSource = IMAGES.treeImage;
    let newImageScalingFactor = TREE_IMAGE_SCALE_BASE;

    // MAX_FLOWERS (11) 기준으로 나무 이미지 설정
    // 11개 이상이면 Tree_10 (가장 큰 나무)
    if (flowerCount >= 10 && IMAGES.Tree_10) { // 10개 이상일 때 (MAX_FLOWERS가 11이므로, 10개일 때 Tree_10)
        newTreeImageSource = IMAGES.Tree_10; newImageScalingFactor = TREE_IMAGE_SCALE_10;
    } else if (flowerCount >= 8 && IMAGES.Tree_8) { newTreeImageSource = IMAGES.Tree_8; newImageScalingFactor = TREE_IMAGE_SCALE_8; }
    else if (flowerCount >= 6 && IMAGES.Tree_6) { newTreeImageSource = IMAGES.Tree_6; newImageScalingFactor = TREE_IMAGE_SCALE_6; }
    else if (flowerCount >= 4 && IMAGES.Tree_4) { newTreeImageSource = IMAGES.Tree_4; newImageScalingFactor = TREE_IMAGE_SCALE_4; }
    else if (flowerCount >= 2 && IMAGES.Tree_2) { newTreeImageSource = IMAGES.Tree_2; newImageScalingFactor = TREE_IMAGE_SCALE_2; }

    if (currentTreeImageSource !== newTreeImageSource) {
        setCurrentTreeImageSource(newTreeImageSource);
    }
    if (currentTreeImageScalingFactor !== newImageScalingFactor) {
        setCurrentTreeImageScalingFactor(newImageScalingFactor);
    }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
        {flowerCanvasHeight > 0 && placedFlowers.map(flower => {
          const flowerImageAspectRatio = (flower.source && flower.source.width && flower.source.height)
                                      ? flower.source.width / flower.source.height : 1;
          const flowerDisplayHeight = currentFlowerPixelHeight;
          const flowerDisplayWidth = flowerDisplayHeight * flowerImageAspectRatio;
          let calculatedTop = flowerCanvasStartY + (flower.relativePos.topRatio * flowerCanvasHeight) - (flowerDisplayHeight / 2);
          let calculatedLeft = flowerCanvasPaddingHorizontal + (flower.relativePos.leftRatio * flowerCanvasWidth) - (flowerDisplayWidth / 2);
          calculatedTop = Math.max(flowerCanvasStartY, Math.min(calculatedTop, flowerCanvasEndY - flowerDisplayHeight));
          calculatedLeft = Math.max(flowerCanvasPaddingHorizontal, Math.min(calculatedLeft, flowerCanvasPaddingHorizontal + flowerCanvasWidth - flowerDisplayWidth));

          return (
            <Image
              key={flower.id}
              source={flower.source}
              style={[
                styles.placedFlowerImage,
                {
                  height: flowerDisplayHeight,
                  width: flowerDisplayWidth,
                  top: calculatedTop,
                  left: calculatedLeft,
                }
              ]}
              resizeMode="contain"
            />
          );
        })}

        <View style={styles.mainScreenContainer}>
            <View style={styles.contentWrapper}>
                <View style={{ height: topSpacerHeight }} />
                <View style={[styles.treeContainer, { height: treeContainerHeight, width: treeContainerWidth }]}>
                <Image
                    source={currentTreeImageSource}
                    style={{ width: `${currentTreeImageScalingFactor * 100}%`, height: `${currentTreeImageScalingFactor * 100}%`}}
                    resizeMode="contain"
                />
                </View>
                <View style={styles.buttonAreaContainer}>
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
      </ImageBackground>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

// Styles는 이전과 동일하게 유지
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backgroundImageFill: {
    flex: 1,
  },
  placedFlowerImage: {
    position: 'absolute',
    zIndex: 0,
  },
  mainScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'column',
    paddingHorizontal: '5%',
  },
  treeContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonAreaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  buttonWrapper: {
    marginBottom: BUTTON_BOTTOM_FIXED_MARGIN,
    alignItems: 'center',
  },
  gradientButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navigationBarPlacement: {
    width: '100%',
  },
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
});

export default HomeScreen;