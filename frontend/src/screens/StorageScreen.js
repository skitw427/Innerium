// src/screens/StorageScreen.js
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  // Image, // 실제 이미지 표시 시 필요
} from 'react-native';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';

// --- API 함수 Import (나중에 실제 데이터 연동 시 필요) ---
// import { getCompletedGardens } from '../api/apiClient';

const ITEMS_PER_PAGE = 4; // 한 페이지에 보여줄 아이템 수
const TOP_SPACE = 40; // <<< 화면 상단에 추가할 여백 크기 (조절 가능) >>>

const StorageScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width, height } = useWindowDimensions();

  // --- 상태 변수 ---
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [gardenData, setGardenData] = useState([]);

  // --- 임시 슬롯 데이터 ---
  const slots = Array.from({ length: totalItems }, (_, i) => ({ id: i + 1, name: `정원 ${i + 1}`, snapshot_image_url: `https://via.placeholder.com/150/aabbcc?text=Garden+${i + 1}` }));

  // --- 페이지네이션 계산 ---
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const itemsToShow = slots.slice(startIndex, endIndex);

  // --- 페이지 이동 함수 ---
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  // --- 데이터 로딩 함수 (API 연동 시 사용) ---
  // useEffect(() => { /* ... API 로딩 로직 ... */ }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 메인 컨텐츠 영역 (네비게이션 바와 분리) */}
      <View style={styles.container}>

        {/* 상단 컨텐츠 영역 (그리드 + 페이지네이션 + 상단 여백) */}
        {/* <<< contentArea 스타일에 paddingTop 추가 >>> */}
        <View style={[styles.contentArea, { paddingTop: TOP_SPACE }]}>
          {/* 로딩 및 에러 표시 */}
          {isLoading && <ActivityIndicator size="large" color="#00adf5" style={styles.loader} />}
          {error && !isLoading && <Text style={styles.errorText}>{error}</Text>}

          {/* 4개 박스 그리드 영역 (화면 채움) */}
          {!isLoading && !error && (
            <View style={styles.storageGridContainer}>
              {itemsToShow.map((item) => (
                <TouchableOpacity key={item.id} style={styles.storageSlotButton}>
                  <View style={styles.slotInnerContent}>
                    <Text style={styles.boxText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* 빈 공간 채우기 (선택적) */}
              {itemsToShow.length < ITEMS_PER_PAGE &&
                Array.from({ length: ITEMS_PER_PAGE - itemsToShow.length }).map((_, index) => (
                  <View key={`placeholder-${index}`} style={[styles.storageSlotButton, styles.placeholderBox]} />
              ))}
            </View>
          )}

          {/* 페이지네이션 컨트롤 */}
          {!isLoading && !error && totalItems > 0 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity onPress={goToPreviousPage} disabled={currentPage === 0} style={[styles.arrowButton, currentPage === 0 && styles.disabledArrow]}>
                <Text style={styles.arrowText}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>{`Page ${currentPage + 1} / ${totalPages}`}</Text>
              <TouchableOpacity onPress={goToNextPage} disabled={currentPage >= totalPages - 1} style={[styles.arrowButton, currentPage >= totalPages - 1 && styles.disabledArrow]}>
                <Text style={styles.arrowText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 하단 네비게이션 바 */}
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7ff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    // <<< container의 paddingTop 제거 (contentArea로 이동) >>>
  },
  contentArea: {
    flex: 1,
    // <<< 여기에 paddingTop 추가하여 상단 여백 생성 >>>
    // paddingTop 값은 TOP_SPACE 상수로 조절 가능
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: 'red',
    fontSize: 16,
    padding: 20,
  },
  storageGridContainer: {
    flex: 1, // 페이지네이션 제외한 contentArea의 남은 공간 모두 차지
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
  },
  storageSlotButton: {
    width: '50%',
    height: '50%',
    padding: 8,
  },
  slotInnerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  boxText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  placeholderBox: {
    padding: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#eef7ff',
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  disabledArrow: {
    opacity: 0.3,
  },
  pageIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default StorageScreen;