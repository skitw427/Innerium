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
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';

const TREE_HEIGHT_PERCENTAGE = 0.25;
const screenHeight = Dimensions.get('screen').height;
const screenWidth = Dimensions.get('screen').width;

const FLOWER_SIZE = 55;
const FLOWER_POSITIONS = [
  { top: '55%', left: '15%' }, { top: '58%', left: '35%' }, { top: '56%', left: '55%' },
  { top: '59%', left: '75%' }, { top: '63%', left: '25%' }, { top: '65%', left: '50%' },
  { top: '62%', left: '70%' }, { top: '68%', left: '10%' }, { top: '70%', left: '30%' },
  { top: '71%', left: '60%' }, { top: '67%', left: '80%' }, { top: '74%', left: '20%' },
  { top: '76%', left: '45%' }, { top: '73%', left: '65%' }, { top: '77%', left: '78%' },
];

const HomeScreen = ({ navigation, route }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);
  // ★★★ 초기 상태는 빈 배열 [] 임을 확인 ★★★
  const [placedFlowers, setPlacedFlowers] = useState([]);

  // --- 뒤로가기 버튼 처리 Hook ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => { return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // --- 진단 결과 파라미터 처리 Effect ---
  useEffect(() => {
    // ★★★ route.params 와 필요한 값들이 *모두* 있는지 확인 ★★★
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

          // --- 새 꽃 배치 로직 ---
          const randomPosition = FLOWER_POSITIONS[Math.floor(Math.random() * FLOWER_POSITIONS.length)];
          const newFlower = {
            id: `${Date.now()}-${emotionKey}-${randomIndex}`,
            source: randomImageSource,
            position: randomPosition,
          };

          // ★★★ 상태 업데이트: 여기가 가장 중요! 이전 상태에 새 꽃 추가 ★★★
          setPlacedFlowers(prevFlowers => {
            // 상태 업데이트 함수 내부에서 이전 상태(prevFlowers)를 확인
            console.log('[setPlacedFlowers] Previous flowers:', JSON.stringify(prevFlowers.map(f => f.id))); // 이전 꽃 ID 확인
            // 이전 배열(...prevFlowers)과 새 꽃(newFlower)을 합쳐 새 배열 생성
            const updatedFlowers = [...prevFlowers, newFlower];
            console.log('[setPlacedFlowers] Updated flowers:', JSON.stringify(updatedFlowers.map(f => f.id))); // 업데이트될 꽃 ID 확인
            // 반드시 새로운 배열을 반환해야 함
            return updatedFlowers;
          });
          // --- ---

        } else { console.warn(`No images found for emotion key: ${emotionKey}`); }
      } else { console.warn(`Invalid emotion key or IMAGES.flowers structure issue for key: ${emotionKey}`); }

      // 결과 모달 상태 업데이트
      setResultModalMessage(resultMessage);
      setResultModalImage(randomImageSource);
      setIsResultModalVisible(true);

      // ★★★ 중요: 파라미터 초기화는 반드시 모달이 닫힐 때 수행되어야 함 ★★★
      // 여기서 setParams를 호출하면 상태 업데이트가 완료되기 전에 리렌더링이 발생하여
      // 의도치 않은 동작을 유발할 수 있음.
    }
  // ★★★ 의존성 배열: route.params 객체 자체의 변경을 감지하도록 유지 ★★★
  // 이렇게 해야 SimpleDiagnosis에서 navigate 할 때 params 객체가 새로 생성되면서 effect가 트리거됨
  }, [route.params]); // navigation은 setParams를 effect 내에서 직접 호출하지 않으므로 제거해도 무방

  // --- 핸들러 함수들 ---
  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => setIsModalVisible(false);
  const handleSimpleEmotionCheck = () => {
    setIsModalVisible(false);
    navigation.navigate('SimpleDiagnosis');
  };
  const handleModalClose = () => setIsModalVisible(false);
  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    // ★★★ 모달이 닫힐 때 route params 초기화 ★★★
    navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined });
    console.log('Route params cleared after result modal close.');
  };

  // --- 동적 크기 계산 ---
  const dynamicTreeHeight = screenHeight * TREE_HEIGHT_PERCENTAGE;
  const dynamicTreeWidth = dynamicTreeHeight;

  // --- 콘솔 로그 추가: 렌더링 시 placedFlowers 상태 확인 ---
  console.log('Rendering HomeScreen, placedFlowers count:', placedFlowers.length, JSON.stringify(placedFlowers.map(f => f.id)));


  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={IMAGES.background} style={styles.backgroundImageContainer} resizeMode="cover">
        {/* 기본 레이아웃 요소들 */}
        <View style={styles.topSpacer} />
        <View style={[styles.treeContainer, { width: dynamicTreeWidth, height: dynamicTreeHeight }]}>
          <Image source={IMAGES.treeImage} style={styles.treeImage} resizeMode="contain" />
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

        {/* 화면에 배치된 꽃들 렌더링 */}
        {placedFlowers.map(flower => (
          <Image
            key={flower.id}
            source={flower.source}
            style={[
              styles.placedFlowerImage,
              { top: flower.position.top, left: flower.position.left }
            ]}
            resizeMode="contain"
          />
        ))}

        {/* 감정 진단 선택 모달 */}
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

        {/* 진단 결과 표시 모달 */}
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

// --- 스타일 정의 (기존과 동일) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, },
  backgroundImageContainer: { flex: 1, backgroundColor: '#ADD8E6', alignItems: 'center', paddingHorizontal: '5%', },
  topSpacer: { flex: 1, width: '100%', },
  treeContainer: { zIndex: 1, alignSelf: 'center', alignItems: 'center' },
  treeImage: { width: '40%', height: '40%',},
  bottomAreaContainer: { zIndex: 1, flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', },
  buttonWrapper: { marginBottom: 15, },
  gradientButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, justifyContent: 'center', alignItems: 'center', },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarWrapper: { width: '100%', },
  placedFlowerImage: { position: 'absolute', width: FLOWER_SIZE, height: FLOWER_SIZE, },
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