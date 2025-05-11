// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  ImageBackground,
  SafeAreaView,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';

// --- 상수 정의 ---
// 나무 크기 스케일 팩터 (treeContainer 크기 기준 %)
const TREE_IMAGE_SCALE_BASE = 0.3;
const TREE_IMAGE_SCALE_2 = 0.4;
const TREE_IMAGE_SCALE_4 = 0.6;
const TREE_IMAGE_SCALE_6 = 0.75;
const TREE_IMAGE_SCALE_8 = 0.85;
const TREE_IMAGE_SCALE_10 = 1;

// ★★★ 새로운 꽃 크기 스케일 팩터 (사용 가능한 화면 높이 기준) ★★★
const FLOWER_DIMENSION_SCALE_FACTOR_HEIGHT = 0.1; // 예: 꽃의 한 변이 사용 가능한 화면 높이의 10%

// 화면 레이아웃 비율 상수
const TOP_SPACER_RATIO = 0.1;
const TREE_CONTAINER_AREA_RATIO = 0.4;
const BUTTON_BOTTOM_FIXED_MARGIN = 25;
const ESTIMATED_NAV_BAR_HEIGHT = 110;

const RELATIVE_FLOWER_POSITIONS = [
  { topRatio: 0.1, leftRatio: 0.2 }, { topRatio: 0.15, leftRatio: 0.5 }, { topRatio: 0.1, leftRatio: 0.8 },
  { topRatio: 0.4, leftRatio: 0.1 }, { topRatio: 0.42, leftRatio: 0.4 }, { topRatio: 0.45, leftRatio: 0.7 },
  { topRatio: 0.35, leftRatio: 0.9 }, { topRatio: 0.8, leftRatio: 0.15 }, { topRatio: 0.82, leftRatio: 0.55 },
  { topRatio: 0.85, leftRatio: 0.85 },
];
// --- ---

const HomeScreen = ({ navigation, route }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [placedFlowers, setPlacedFlowers] = useState([]);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  const [currentTreeImageScalingFactor, setCurrentTreeImageScalingFactor] = useState(TREE_IMAGE_SCALE_BASE);

  const availableContentHeight = windowHeight - ESTIMATED_NAV_BAR_HEIGHT;
  const topSpacerHeight = availableContentHeight * TOP_SPACER_RATIO;
  const treeContainerHeight = availableContentHeight * TREE_CONTAINER_AREA_RATIO;
  const treeContainerWidth = treeContainerHeight; // 나무 컨테이너는 정사각형으로 가정
  const flowerCanvasHeight = availableContentHeight - topSpacerHeight - treeContainerHeight - BUTTON_BOTTOM_FIXED_MARGIN;
  const flowerCanvasWidth = windowWidth * (1 - (0.05 * 2)); // 좌우 여백 고려

  // ★★★ 현재 꽃의 동적 픽셀 크기 (사용 가능한 화면 높이 기준) ★★★
  const currentFlowerPixelSize = availableContentHeight * FLOWER_DIMENSION_SCALE_FACTOR_HEIGHT;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    if (route && route.params && route.params.diagnosisResult && route.params.emotionKey) {
      const { diagnosisResult, emotionKey } = route.params;
      let newlySelectedImageSource = null;

      if (emotionKey && IMAGES.flowers && IMAGES.flowers[emotionKey]) {
        const allImagesForEmotion = IMAGES.flowers[emotionKey];
        const allImageKeysForEmotion = Object.keys(allImagesForEmotion);

        if (allImageKeysForEmotion.length > 0) {
          const placedImageKeysForEmotion = placedFlowers
            .filter(flower => flower.emotionKey === emotionKey)
            .map(flower => flower.imageKey);

          const availableImageKeys = allImageKeysForEmotion.filter(
            key => !placedImageKeysForEmotion.includes(key)
          );

          let randomImageKeyToPlace;
          if (availableImageKeys.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableImageKeys.length);
            randomImageKeyToPlace = availableImageKeys[randomIndex];
            newlySelectedImageSource = allImagesForEmotion[randomImageKeyToPlace];
          } else {
            if (placedImageKeysForEmotion.length > 0) {
                newlySelectedImageSource = allImagesForEmotion[placedImageKeysForEmotion[Math.floor(Math.random() * placedImageKeysForEmotion.length)]];
            } else {
                newlySelectedImageSource = allImagesForEmotion[allImageKeysForEmotion[0]]; // Fallback
            }
            Alert.alert("알림", `이미 '${emotionKey}' 감정의 모든 종류의 꽃이 정원에 있어요!`);
            randomImageKeyToPlace = null; // 중복 종류는 심지 않음 (결과 모달에는 표시)
          }

          if (randomImageKeyToPlace && newlySelectedImageSource) {
            setPlacedFlowers(prevFlowers => {
              const occupiedPositions = new Set(prevFlowers.map(flower => JSON.stringify(flower.relativePos)));
              const availablePlacementSlots = RELATIVE_FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));

              if (availablePlacementSlots.length > 0) {
                const randomAvailableIndex = Math.floor(Math.random() * availablePlacementSlots.length);
                const selectedRelativePos = availablePlacementSlots[randomAvailableIndex];
                const newFlower = {
                  id: `${Date.now()}-${emotionKey}-${randomImageKeyToPlace}`,
                  source: newlySelectedImageSource,
                  relativePos: selectedRelativePos,
                  emotionKey: emotionKey,
                  imageKey: randomImageKeyToPlace,
                };
                return [...prevFlowers, newFlower];
              } else {
                Alert.alert("정원 가득!", "꽃을 심을 자리가 부족해요. 하지만 진단 결과는 보여드릴게요!");
                return prevFlowers;
              }
            });
          }
        } else {
          newlySelectedImageSource = null; // 해당 감정에 꽃 이미지가 없음
        }
      } else {
        newlySelectedImageSource = null; // 감정키가 없거나 경로 문제
      }

      setResultModalMessage(diagnosisResult);
      setResultModalImage(newlySelectedImageSource);
      setIsResultModalVisible(true);

      if (navigation && typeof navigation.setParams === 'function') {
        navigation.setParams({
          diagnosisResult: undefined,
          emotionKey: undefined,
        });
      }
    }
  }, [route, navigation]); // placedFlowers 함수형 업데이트로 의존성 제거


  useEffect(() => {
    const flowerCount = placedFlowers.length;
    let newTreeImageSource = IMAGES.treeImage;
    let newImageScalingFactor = TREE_IMAGE_SCALE_BASE;
    if (flowerCount >= 10) { newTreeImageSource = IMAGES.Tree_10; newImageScalingFactor = TREE_IMAGE_SCALE_10; }
    else if (flowerCount >= 8) { newTreeImageSource = IMAGES.Tree_8; newImageScalingFactor = TREE_IMAGE_SCALE_8; }
    else if (flowerCount >= 6) { newTreeImageSource = IMAGES.Tree_6; newImageScalingFactor = TREE_IMAGE_SCALE_6; }
    else if (flowerCount >= 4) { newTreeImageSource = IMAGES.Tree_4; newImageScalingFactor = TREE_IMAGE_SCALE_4; }
    else if (flowerCount >= 2) { newTreeImageSource = IMAGES.Tree_2; newImageScalingFactor = TREE_IMAGE_SCALE_2; }
    if (currentTreeImageSource !== newTreeImageSource) { setCurrentTreeImageSource(newTreeImageSource); }
    if (currentTreeImageScalingFactor !== newImageScalingFactor) { setCurrentTreeImageScalingFactor(newImageScalingFactor); }
  }, [placedFlowers.length, currentTreeImageSource, currentTreeImageScalingFactor]);

  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => {
    setIsModalVisible(false);
    Alert.alert("안내", "심층 진단 기능은 현재 준비 중입니다.");
  };
  const handleSimpleEmotionCheck = () => { setIsModalVisible(false); navigation.navigate('SimpleDiagnosis'); };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    if (navigation && typeof navigation.setParams === 'function') {
      if (route && route.params && (route.params.diagnosisResult || route.params.emotionKey)) {
        navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined });
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={IMAGES.background} style={styles.backgroundImageFill} resizeMode="cover">
        <View style={styles.mainScreenContainer}>
          <View style={[styles.contentWrapper, { paddingHorizontal: windowWidth * 0.05 }]}>
            <View style={{ height: topSpacerHeight }} />
            <View style={[styles.treeContainer, { height: treeContainerHeight, width: treeContainerWidth }]}>
              <Image
                source={currentTreeImageSource}
                style={{
                  width: `${currentTreeImageScalingFactor * 100}%`, // treeContainer의 %
                  height: `${currentTreeImageScalingFactor * 100}%`,// treeContainer의 %
                }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.buttonAreaContainer}>
              <View style={styles.buttonWrapper}>
                <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
                  <TouchableOpacity onPress={handleEmotionCheckPress} activeOpacity={0.7}>
                    <Text style={styles.buttonText}>감정 진단하기</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </View>

          <View style={styles.navigationBarPlacement}>
            <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
          </View>
        </View>

        {placedFlowers.map(flower => {
          const actualFlowerCanvasStartY = topSpacerHeight + treeContainerHeight;
          // ★★★ 꽃 위치 계산 시 currentFlowerPixelSize 사용 ★★★
          const flowerTop = actualFlowerCanvasStartY + (flower.relativePos.topRatio * flowerCanvasHeight) - (currentFlowerPixelSize / 2);
          const flowerLeft = (windowWidth * 0.05) + (flower.relativePos.leftRatio * flowerCanvasWidth) - (currentFlowerPixelSize / 2);

          return (
            <Image
              key={flower.id}
              source={flower.source}
              style={[
                styles.placedFlowerImage,
                {
                  // ★★★ 꽃 크기를 계산된 픽셀 값으로 설정 ★★★
                  width: currentFlowerPixelSize,
                  height: currentFlowerPixelSize, // 정사각형 꽃으로 가정
                  top: flowerTop,
                  left: flowerLeft,
                }
              ]}
              resizeMode="contain"
            />
          );
        })}

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
                {resultModalImage ? (
                  <Image source={resultModalImage} style={styles.resultFlowerImage} resizeMode="contain" />
                ) : (
                  <View style={styles.resultImagePlaceholder}><Text>이미지 없음</Text></View>
                )}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backgroundImageFill: {
    flex: 1,
  },
  mainScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'column',
  },
  treeContainer: {
    // ★★★ 나무를 컨테이너 하단에 정렬 ★★★
    justifyContent: 'flex-end', // 자식 요소를 컨테이너의 끝(하단)으로 정렬
    alignItems: 'center',    // 가로 중앙 정렬 유지
    zIndex: 1,
    overflow: 'hidden',
  },
  buttonAreaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1,
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
  placedFlowerImage: {
    position: 'absolute',
    zIndex: 0,
    // width, height, top, left는 인라인 스타일로 동적 설정
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContentContainer: {},
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500' },
  modalButtons: { flexDirection: 'row' },
  modalButtonGradient: { borderRadius: 8, minWidth: 110, marginHorizontal: 8 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultModalContentContainer: {},
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15 }, // 결과 모달의 꽃 크기는 고정값 유지
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10 },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default HomeScreen;