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

const HomeScreen = ({ navigation, route }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false); // 감정 진단 선택 모달
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalImage, setResultModalImage] = useState(null);

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
    if (route.params?.diagnosisResult && route.params?.emotionKey) {
      const resultMessage = route.params.diagnosisResult;
      const emotionKey = route.params.emotionKey;
      console.log("HomeScreen received result:", resultMessage, "Key:", emotionKey);

      let randomImage = null;
      if (emotionKey && IMAGES.flowers && IMAGES.flowers[emotionKey]) {
        const imageKeys = Object.keys(IMAGES.flowers[emotionKey]);
        if (imageKeys.length > 0) {
          const randomIndex = Math.floor(Math.random() * imageKeys.length);
          const randomImageKey = imageKeys[randomIndex];
          randomImage = IMAGES.flowers[emotionKey][randomImageKey];
          console.log(`Selected random image: Key=${randomImageKey}`);
        } else { console.warn(`No images found for emotion key: ${emotionKey}`); }
      } else { console.warn(`Invalid emotion key or IMAGES.flowers structure issue for key: ${emotionKey}`); }

      setResultModalMessage(resultMessage);
      setResultModalImage(randomImage);
      setIsResultModalVisible(true);
    }
  }, [route.params?.diagnosisResult, route.params?.emotionKey, navigation]);

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
    setResultModalMessage('');
    setResultModalImage(null);
    navigation.setParams({ diagnosisResult: undefined, emotionKey: undefined });
  };

  // --- 동적 크기 계산 ---
  const dynamicTreeHeight = screenHeight * TREE_HEIGHT_PERCENTAGE;
  const dynamicTreeWidth = dynamicTreeHeight;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={IMAGES.background} style={styles.backgroundImageContainer} resizeMode="cover">
        <View style={styles.topSpacer} />
        <View style={[styles.treeContainer, { width: dynamicTreeWidth, height: dynamicTreeHeight }]}>
          <Image source={IMAGES.treeImage} style={styles.treeImage} resizeMode="contain" />
        </View>
        <View style={styles.bottomAreaContainer}>
          <View style={styles.buttonWrapper}>
            {/* --- ★★★ 버튼 수정: TouchableOpacity의 style 제거 ★★★ --- */}
            <LinearGradient
              colors={['#4CAF50', '#8BC34A']}
              style={styles.gradientButton} // LinearGradient가 크기와 모양을 결정
            >
              <TouchableOpacity
                // style={styles.touchableButton} // <<< 이 라인 제거 또는 주석 처리
                onPress={handleEmotionCheckPress} // 이 onPress가 호출되어야 함
              >
                <Text style={styles.buttonText}>감정 진단하기</Text>
              </TouchableOpacity>
            </LinearGradient>
            {/* --- --- */}
          </View>
          <View style={styles.navigationBarWrapper}>
            <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
          </View>
        </View>

        {/* 감정 진단 선택 모달 */}
        <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleModalClose}>
           <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>감정 진단을 시작하시겠습니까?</Text>
                <View style={styles.modalButtons}>
                   <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}>
                    <TouchableOpacity onPress={handleSimpleEmotionCheck} style={styles.modalButton}>
                      <Text style={styles.modalButtonText}>간단 진단</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                  <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}>
                    <TouchableOpacity onPress={handleConfirmEmotionCheck} style={styles.modalButton}>
                      <Text style={styles.modalButtonText}>심층 진단</Text>
                    </TouchableOpacity>
                  </LinearGradient>
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
                {resultModalImage ? (
                  <Image source={resultModalImage} style={styles.resultFlowerImage} resizeMode="contain" />
                ) : (
                  <View style={styles.resultImagePlaceholder}><Text>이미지 없음</Text></View>
                )}
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

// HomeScreen 스타일 정의
const styles = StyleSheet.create({
  safeArea: { flex: 1, },
  backgroundImageContainer: { flex: 1, backgroundColor: '#ADD8E6', alignItems: 'center', paddingHorizontal: '5%', },
  topSpacer: { flex: 1, width: '100%', },
  treeContainer: { alignSelf: 'center', alignItems: 'center' },
  treeImage: { width: '50%', height: '50%',},
  bottomAreaContainer: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', },
  buttonWrapper: { marginBottom: 15, },
  gradientButton: {
    borderRadius: 8,
    paddingVertical: 12, // 그라데이션 자체에 패딩을 주어 크기 확보
    paddingHorizontal: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    // 내부 TouchableOpacity가 이 크기를 따르도록 함
    justifyContent: 'center',
    alignItems: 'center',
  },
  // touchableButton: {}, // <<< 이 스타일 정의는 더 이상 필요 없음 >>>
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', },
  navigationBarWrapper: { width: '100%', },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', },
  modalContentContainer: {},
  modalContent: { width: '80%', maxWidth: 350, padding: 25, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  modalText: { fontSize: 18, marginBottom: 25, color: '#333', textAlign: 'center', fontWeight: '500', },
  modalButtons: { flexDirection: 'row', },
  modalButtonGradient: { borderRadius: 8, minWidth: 110, marginHorizontal: 8, },
  modalButton: { paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  resultModalContentContainer: {},
  resultModalContent: { width: '80%', maxWidth: 300, padding: 20, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  resultFlowerImage: { width: 100, height: 100, marginBottom: 15, },
  resultImagePlaceholder: { width: 100, height: 100, backgroundColor: '#eee', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15, },
  resultModalText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 25, lineHeight: 24, },
  resultCloseButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30, marginTop: 10, },
  resultCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
});

export default HomeScreen;