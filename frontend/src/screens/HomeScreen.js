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
  Dimensions, // 화면 높이 가져오기 위해 필요
  Modal,
  // LayoutAnimation, // 애니메이션 필요 시 활성화
  // Platform,
  // UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images'; // IMAGES에 Tree_0, Tree_2 등이 정의되어 있어야 함

// --- 상수 정의 ---
// ★★★ 나무 크기 비율 상수 정의 ★★★
const TREE_HEIGHT_PERCENTAGE_BASE = 0.25; // 기본 크기 (꽃 0-1개)
const TREE_HEIGHT_PERCENTAGE_2 = 0.27;    // 꽃 2-3개
const TREE_HEIGHT_PERCENTAGE_4 = 0.29;    // 꽃 4-5개
const TREE_HEIGHT_PERCENTAGE_6 = 0.31;    // 꽃 6-7개
const TREE_HEIGHT_PERCENTAGE_8 = 0.33;    // 꽃 8-9개
const TREE_HEIGHT_PERCENTAGE_10 = 0.35;   // 꽃 10개 이상
// ★★★ --- ★★★

const FLOWER_SIZE_PERCENTAGE = 0.1; // 꽃 크기 비율 (화면 높이 기준)
const MIN_FLOWER_SIZE = 40;
const MAX_FLOWER_SIZE = 100;

const screenHeight = Dimensions.get('screen').height;

// 꽃 위치 정의 (10개)
const FLOWER_POSITIONS = [
  { top: '63%', left: '20%' }, { top: '65%', left: '50%' }, { top: '64%', left: '80%' },
  { top: '72%', left: '10%' }, { top: '70%', left: '40%' }, { top: '74%', left: '70%' },
  { top: '71%', left: '90%' }, { top: '80%', left: '15%' }, { top: '79%', left: '55%' },
  { top: '81%', left: '85%' },
];

// --- Android LayoutAnimation 활성화 (필요 시 주석 해제) ---
// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }
// --- ---

const HomeScreen = ({ navigation, route }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  const [placedFlowers, setPlacedFlowers] = useState([]);
  const [currentTreeImageSource, setCurrentTreeImageSource] = useState(IMAGES.treeImage);
  // ★★★ 현재 나무 크기 비율 상태 추가 ★★★
  const [currentTreeHeightPercentage, setCurrentTreeHeightPercentage] = useState(TREE_HEIGHT_PERCENTAGE_BASE);

  // 뒤로가기 버튼 처리 (동일)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // 진단 결과 파라미터 처리 (꽃 추가 로직 - 동일)
  useEffect(() => {
    if (route.params && route.params.diagnosisResult && route.params.emotionKey) {
      const resultMessage = route.params.diagnosisResult;
      const emotionKey = route.params.emotionKey;
      console.log("Effect triggered: Received result -", resultMessage, "Key:", emotionKey);

      let randomImageSource = null;
      if (emotionKey && IMAGES.flowers && IMAGES.flowers[emotionKey]) {
        const imageKeys = Object.keys(IMAGES.flowers[emotionKey]);
        if (imageKeys.length > 0) {
          const randomIndex = Math.floor(Math.random() * imageKeys.length);
          const randomImageKey = imageKeys[randomIndex];
          randomImageSource = IMAGES.flowers[emotionKey][randomImageKey];
          console.log(`Selected random image: Key=${randomImageKey}`);

          const occupiedPositions = new Set(placedFlowers.map(flower => JSON.stringify(flower.position)));
          const availablePositions = FLOWER_POSITIONS.filter(pos => !occupiedPositions.has(JSON.stringify(pos)));

          if (availablePositions.length > 0) {
            const randomAvailableIndex = Math.floor(Math.random() * availablePositions.length);
            const selectedPosition = availablePositions[randomAvailableIndex];
            const newFlower = {
              id: `${Date.now()}-${emotionKey}-${randomIndex}`,
              source: randomImageSource,
              position: selectedPosition,
            };
            setPlacedFlowers(prevFlowers => [...prevFlowers, newFlower]);
          } else {
            console.warn("All flower positions are occupied.");
            Alert.alert("정원 가득!", "더 이상 꽃을 심을 공간이 없어요.");
          }
        } else { console.warn(`No images found for emotion key: ${emotionKey}`); }
      } else { console.warn(`Invalid emotion key or IMAGES.flowers structure issue for key: ${emotionKey}`); }

      setResultModalMessage(resultMessage);
      setResultModalImage(randomImageSource);
      setIsResultModalVisible(true);
    }
  }, [route.params]); // placedFlowers 의존성 제거 유지

  // ★★★ 꽃 개수에 따라 나무 이미지 및 크기 비율 변경하는 Effect 수정 ★★★
  useEffect(() => {
    const flowerCount = placedFlowers.length;
    console.log(`Flower count changed: ${flowerCount}`);

    let newTreeImageSource = IMAGES.treeImage; // 기본 이미지
    let newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_BASE; // 기본 크기 비율

    // 꽃 개수에 따라 이미지와 크기 비율 결정
    if (flowerCount >= 10) {
      newTreeImageSource = IMAGES.Tree_10;
      newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_10;
    } else if (flowerCount >= 8) {
      newTreeImageSource = IMAGES.Tree_8;
      newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_8;
    } else if (flowerCount >= 6) {
      newTreeImageSource = IMAGES.Tree_6;
      newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_6;
    } else if (flowerCount >= 4) {
      newTreeImageSource = IMAGES.Tree_4;
      newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_4;
    } else if (flowerCount >= 2) {
      newTreeImageSource = IMAGES.Tree_2;
      newTreeHeightPercentage = TREE_HEIGHT_PERCENTAGE_2;
    }
    // 0개 또는 1개일 때는 기본값 유지

    // 상태 변경 여부 확인 및 LayoutAnimation 적용 (선택적)
    let imageChanged = currentTreeImageSource !== newTreeImageSource;
    let sizeChanged = currentTreeHeightPercentage !== newTreeHeightPercentage;

    // 애니메이션을 원하면 상태 변경 전에 호출
    // if (sizeChanged) {
    //   LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // }

    // 현재 이미지와 다를 경우 업데이트
    if (imageChanged) {
      console.log(`Updating tree image for ${flowerCount} flowers.`);
      setCurrentTreeImageSource(newTreeImageSource);
    }

    // 현재 크기 비율과 다를 경우 업데이트
    if (sizeChanged) {
      console.log(`Updating tree size percentage for ${flowerCount} flowers to ${newTreeHeightPercentage}.`);
      setCurrentTreeHeightPercentage(newTreeHeightPercentage);
    }

  }, [placedFlowers.length, currentTreeImageSource, currentTreeHeightPercentage]);
  // ★★★ --- ★★★

  // 핸들러 함수들 (동일)
  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => setIsModalVisible(false);
  const handleSimpleEmotionCheck = () => {
    setIsModalVisible(false);
    navigation.navigate('SimpleDiagnosis');
  };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined });
    console.log('Route params cleared after result modal close.');
  };

  // --- 동적 크기 계산 ---
  // ★★★ 현재 상태 비율(currentTreeHeightPercentage)을 사용하여 나무 컨테이너 크기 계산 ★★★
  const dynamicTreeHeight = screenHeight * currentTreeHeightPercentage;
  const dynamicTreeWidth = dynamicTreeHeight; // 나무 컨테이너는 정사각형 유지
  // ★★★ --- ★★★

  // 꽃 크기 계산 (동일)
  const calculatedFlowerSize = screenHeight * FLOWER_SIZE_PERCENTAGE;
  const dynamicFlowerSize = Math.max(MIN_FLOWER_SIZE, Math.min(calculatedFlowerSize, MAX_FLOWER_SIZE));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={IMAGES.background} style={styles.backgroundImageContainer} resizeMode="cover">
        {/* 기본 레이아웃 요소들 */}
        <View style={styles.topSpacer} />
        {/* ★★★ 나무 컨테이너에 동적으로 계산된 크기 적용 ★★★ */}
        <View style={[styles.treeContainer, { width: dynamicTreeWidth, height: dynamicTreeHeight }]}>
          {/* 나무 이미지 source는 상태 변수 사용, 스타일은 그대로 유지 */}
          <Image source={currentTreeImageSource} style={styles.treeImage} resizeMode="contain" />
        </View>
        <View style={styles.bottomAreaContainer}>
          <View style={styles.buttonWrapper}>
            <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
              <TouchableOpacity onPress={handleEmotionCheckPress}>
                <Text style={styles.buttonText}>감정 진단하기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <View style={styles.navigationBarWrapper}>
            <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
          </View>
        </View>

        {/* 화면에 배치된 꽃들 렌더링 (동일) */}
        {placedFlowers.map(flower => (
          <Image
            key={flower.id}
            source={flower.source}
            style={[
              styles.placedFlowerImage,
              { width: dynamicFlowerSize, height: dynamicFlowerSize, top: flower.position.top, left: flower.position.left }
            ]}
            resizeMode="contain"
          />
        ))}

        {/* 모달들 (동일) */}
        <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleModalClose}>
           <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>감정 진단을 시작하시겠습니까?</Text>
                <View style={styles.modalButtons}>
                  <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}><TouchableOpacity onPress={handleSimpleEmotionCheck} style={styles.modalButton}><Text style={styles.modalButtonText}>간단 진단</Text></TouchableOpacity></LinearGradient>
                  <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}><TouchableOpacity onPress={handleConfirmEmotionCheck} style={styles.modalButton}><Text style={styles.modalButtonText}>심층 진단</Text></TouchableOpacity></LinearGradient>
                </View>
              </View>
            </TouchableOpacity>
           </TouchableOpacity>
        </Modal>
        <Modal visible={isResultModalVisible} transparent={true} animationType="fade" onRequestClose={handleResultModalClose}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleResultModalClose}>
            <TouchableOpacity activeOpacity={1} style={styles.resultModalContentContainer}>
              <View style={styles.resultModalContent}>
                {resultModalImage ? (<Image source={resultModalImage} style={styles.resultFlowerImage} resizeMode="contain" />) : (<View style={styles.resultImagePlaceholder}><Text>이미지 없음</Text></View>)}
                <Text style={styles.resultModalText}>{resultModalMessage}</Text>
                <TouchableOpacity onPress={handleResultModalClose} style={styles.resultCloseButton}>
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

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, },
  backgroundImageContainer: { flex: 1, backgroundColor: '#ADD8E6', alignItems: 'center', paddingHorizontal: '5%', },
  topSpacer: { flex: 1, width: '100%', },
  treeContainer: { // 나무 이미지를 감싸는 컨테이너
    zIndex: 1,
    alignSelf: 'center',
    alignItems: 'center',
    // width, height는 inline style로 동적으로 설정됩니다.
  },
  treeImage: { // 실제 나무 이미지 스타일
    width: '50%', // 사용자가 지정한 크기 (컨테이너의 50%)
    height: '50%',
  },
  bottomAreaContainer: { zIndex: 1, flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', },
  buttonWrapper: { marginBottom: 15, },
  gradientButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, justifyContent: 'center', alignItems: 'center', },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarWrapper: { width: '100%', },
  placedFlowerImage: { position: 'absolute', },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', },
  modalContentContainer: {},
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500', },
  modalButtons: { flexDirection: 'row', },
  modalButtonGradient: { borderRadius: 8, minWidth: 110, marginHorizontal: 8, },
  modalButton: { paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  resultModalContentContainer: { },
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15, },
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15, },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24, },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10, },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
});

export default HomeScreen;