// src/screens/HomeScreen.js
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  ImageBackground, // ImageBackground 사용 유지
  SafeAreaView,
  useWindowDimensions, // 현재 창 너비 계산에는 사용 가능
  Dimensions,         // << 기기 화면 크기를 가져오기 위해 import >>
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images'; // 이미지 경로 확인

// --- 크기 비율 정의 ---
// 기기 화면 높이(screen.height)에 대한 비율입니다.
const TREE_HEIGHT_PERCENTAGE = 0.25;   // 예: 화면 높이의 25%를 나무 높이로 (조절 가능)

// --- 기기 화면 크기 가져오기 ---
const screenHeight = Dimensions.get('screen').height;

const HomeScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  // 현재 창(window)의 너비는 가로 중앙 정렬에 필요할 수 있음
  const { width: windowWidth } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false); // 모달 표시 상태

  // --- 핸들러 함수들 (동일) ---
  const handleEmotionCheckPress = () => setIsModalVisible(true);
  const handleConfirmEmotionCheck = () => setIsModalVisible(false);
  const handleSimpleEmotionCheck = () => {
    setIsModalVisible(false);
    navigation.navigate('SimpleDiagnosis');
  };
  const handleModalClose = () => setIsModalVisible(false);

  // --- 동적 크기 계산 (screenHeight 사용) ---
  const dynamicTreeHeight = screenHeight * TREE_HEIGHT_PERCENTAGE;
  // 1:1 비율 가정, 이미지 비율에 맞게 수정 가능
  const dynamicTreeWidth = dynamicTreeHeight;

  // --- 오프셋 계산 로직 완전 제거 ---

  return (
    // 1. SafeAreaView: 최상위 컨테이너
    <SafeAreaView style={styles.safeArea}>
      {/* 2. ImageBackground: 배경 및 메인 Flexbox 컨테이너 */}
      <ImageBackground
        source={IMAGES.background} // 배경 이미지 소스
        style={styles.backgroundImageContainer} // flex: 1 및 내부 정렬
        resizeMode="cover"
      >
        {/* Flexbox 레이아웃 시작: flex 비율로 공간 분배 */}

        {/* 1. 상단 공간 (Flex 비율로 크기 결정) */}
        <View style={styles.topSpacer} />

        {/* 2. 나무 컨테이너 (Flex 아이템) */}
        {/* << 수정: 동적 크기 및 alignSelf 적용 >> */}
        <View style={[styles.treeContainer, { width: dynamicTreeWidth, height: dynamicTreeHeight }]}>
          <Image
            source={IMAGES.treeImage}
            style={styles.treeImage} // 기본 크기 스타일만 적용 (width/height 100%)
            resizeMode="contain"
          />
        </View>

        {/* 3. 하단 컨텐츠 영역 (버튼 + 네비게이션 바) (Flex 비율로 크기 결정) */}
        <View style={styles.bottomAreaContainer}>
          {/* 버튼 컨테이너 (Flex 아이템) */}
          <View style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#4CAF50', '#8BC34A']}
              style={styles.gradientButton}
            >
              <TouchableOpacity
                style={styles.touchableButton}
                onPress={handleEmotionCheckPress}
              >
                <Text style={styles.buttonText}>감정 진단하기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* 네비게이션 바 (Flex 아이템) */}
          <View style={styles.navigationBarWrapper}>
            <NavigationBar
              onNavigate={(screen) => handleNavigate(navigation, screen)}
              isTransitioning={isTransitioning}
            />
          </View>
        </View>

        {/* 모달 */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleModalClose}
        >
           {/* ... 모달 내용 ... */}
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

      </ImageBackground>
      {/* 상태 표시줄 */}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

// HomeScreen 스타일 정의
const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeArea가 화면 전체 차지
  },
  backgroundImageContainer: {
    flex: 1, // SafeAreaView 영역을 완전히 채움
    backgroundColor: '#ADD8E6', // 배경 이미지 로딩 전/실패 시 색상
    // Flexbox 설정: 세로 배치 및 가로 중앙 정렬
    alignItems: 'center', // 자식 요소들을 가로 중앙에 배치
    // justifyContent 제거 (flex 비율로 조절)
    paddingHorizontal: '5%', // 좌우 여백
  },
  topSpacer: {
    // 나무를 중앙에 배치하기 위해 flex: 1 할당
    flex: 1,
    width: '100%',
    // backgroundColor: 'rgba(255, 0, 0, 0.1)', // 영역 확인용
  },
  treeContainer: {
    // position 제거! Flexbox 아이템.
    // 고정 width/height 제거, inline style로 동적 크기 적용
    // 나무는 flex 값을 가지지 않으므로, 남은 공간 중앙에 위치
    // backgroundColor: 'rgba(0, 255, 0, 0.1)', // 영역 확인용
    // << 수정: 명시적으로 가로 중앙 정렬 >>
    alignSelf: 'center', // 부모(backgroundImageContainer)의 alignItems가 이미 center지만 명시
    alignItems: 'center'
  },
  treeImage: {
    width: '50%', // 부모(treeContainer)의 동적 크기를 따름
    height: '50%',
    // position 및 top 제거!
  },
  bottomAreaContainer: { // 버튼과 네비게이션 바를 묶는 컨테이너
    // 나무를 중앙에 배치하기 위해 flex: 1 할당
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end', // 내부 아이템(버튼, 네비바)을 아래쪽에 배치
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 255, 0.1)', // 영역 확인용
  },
  buttonWrapper: {
    // position 제거! Flexbox 아이템.
    marginBottom: 15, // 네비게이션 바 위에 15만큼 간격 (조절 가능)
    // marginTop 제거
    // backgroundColor: 'rgba(0, 0, 255, 0.2)', // 영역 확인용
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
  },
  touchableButton: {},
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navigationBarWrapper: {
    // position 제거! Flexbox 아이템.
    width: '100%',
    // 높이는 내부 컴포넌트에 의해 결정
  },
  // --- 모달 관련 스타일 (동일) ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContentContainer: {},
  modalContent: {
    width: '80%',
    maxWidth: 350,
    padding: 25,
    backgroundColor: '#fff',
    borderRadius: 10,
    // << 중요: 이 alignItems가 내부 modalButtons 컨테이너를 중앙 정렬 >>
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalButtons: { // 두 버튼을 감싸는 View
    flexDirection: 'row', // 버튼을 가로로 배치
    // << 수정: width: '100%' 제거 >>
    // 너비를 지정하지 않으면 내부 컨텐츠 크기에 맞게 줄어듦
    // justifyContent는 너비가 고정되지 않으면 큰 의미가 없을 수 있음
    // justifyContent: 'center', // 제거하거나 남겨도 큰 영향 없을 수 있음
  },
  modalButtonGradient: { // 각 버튼(LinearGradient)에 적용
    borderRadius: 8,
    minWidth: 110,
    // << 수정: 버튼 사이 간격을 위해 좌우 마진 유지 >>
    marginHorizontal: 8, // 각 버튼 좌우에 8px 마진 (총 16px 간격)
  },
  modalButton: { // TouchableOpacity에 적용
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  modalButtonText: { // 버튼 텍스트
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;