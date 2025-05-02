// src/screens/CalendarScreen.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Image,
  SafeAreaView,
  useWindowDimensions, // height 사용 제거됨
} from 'react-native';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';

const CalendarScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width } = useWindowDimensions(); // height는 직접 사용하지 않음

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        {/* 이미지 컨테이너 */}
        <View style={styles.calendarImageContainer}>
          <Image
            source={IMAGES.calendarScreen}
            // --- 스타일 수정 ---
            style={styles.calendarImage} // 전용 스타일 적용
            resizeMode="contain" // 비율 유지하며 컨테이너 안에 맞춤
          />
        </View>
        {/* 네비게이션 바 */}
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// CalendarScreen 스타일 정의
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7ff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // 이미지 컨테이너와 네비게이션 바 분리
    alignItems: 'center',
  },
  calendarImageContainer: {
    flex: 1, // 사용 가능한 수직 공간 차지
    justifyContent: 'center', // 내부 이미지 수직 중앙 정렬
    alignItems: 'center', // 내부 이미지 수평 중앙 정렬
    width: '120%', // 컨테이너 너비 100%
    // backgroundColor: 'lightblue', // 영역 확인용 임시 배경색
  },
  // --- 이미지 스타일 추가 ---
  calendarImage: {
    width: '100%', // 컨테이너 너비(화면 너비)에 맞춤
    // height: undefined, // 고정 높이 제거!
    // aspectRatio 속성을 직접 지정할 수도 있음 (이미지 비율을 안다면)
    // 예: aspectRatio: 1, // 정사각형 이미지의 경우
    // 예: aspectRatio: 16 / 9, // 16:9 비율 이미지의 경우
    // resizeMode="contain"이 비율을 유지해주므로 aspectRatio 명시 불필요할 수 있음
    // backgroundColor: 'lightcoral', // 영역 확인용 임시 배경색
  },
});

export default CalendarScreen;