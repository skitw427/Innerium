// src/screens/StorageScreen.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';

const StorageScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width } = useWindowDimensions();
  // 12개의 슬롯 데이터 생성
  const slots = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 메인 컨텐츠 영역 (상단 패딩 추가) */}
      <View style={[styles.container, { paddingHorizontal: width * 0.05, paddingTop: 40 }]}>
        {/* 스크롤 가능한 영역 */}
        <ScrollView
          contentContainerStyle={styles.storageGridContainer} // 그리드 컨테이너 스타일
          showsVerticalScrollIndicator={true} // 수직 스크롤바 표시
        >
          {/* 슬롯 렌더링 */}
          {slots.map((num) => (
            <TouchableOpacity key={num} style={styles.storageSlotButton}>
              {/* 슬롯 내부 박스 */}
              <View style={styles.emptyBox}>
                {/* 슬롯 번호 텍스트 */}
                <Text style={styles.boxText}>{num}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* 하단 네비게이션 바 */}
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
      </View>
      {/* 상태 표시줄 스타일 */}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// StorageScreen 스타일 정의
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7ff', // 배경색 설정 (예: 연한 회색)
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // 스크롤 영역과 네비게이션 바 분리
  },
  storageGridContainer: { // ScrollView 내부 컨텐츠 컨테이너
    flexDirection: 'row', // 가로 방향 배치
    flexWrap: 'wrap', // 줄 바꿈 허용
    justifyContent: 'center', // 가로축 중앙 정렬 (아이템 간격 고려)
    alignItems: 'flex-start', // 세로축 상단 정렬
    paddingBottom: 20, // 스크롤 하단 여백
  },
  storageSlotButton: { // 각 슬롯 버튼
    width: '45%', // 화면 너비의 약 45% (2열 그리드)
    aspectRatio: 0.7, // 버튼의 가로세로 비율 (세로가 더 길게)
    margin: '2.5%', // 버튼 주변 여백 (총 5% 간격)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // 버튼 배경색
    borderRadius: 10, // 둥근 모서리
    borderWidth: 1,
    borderColor: '#e0e0e0', // 옅은 테두리
    elevation: 2, // Android 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyBox: { // 버튼 내부의 콘텐츠 영역 (필요시 사용)
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 2, // 필요하다면 내부 테두리 추가
    // borderColor: '#ccc',
    // borderRadius: 8, // 내부 컨텐츠 모서리 둥글게
  },
  boxText: { // 슬롯 번호 텍스트
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888', // 텍스트 색상
  },
  // NavigationBar 스타일은 NavigationBar.js 파일에 정의됨
});

export default StorageScreen;