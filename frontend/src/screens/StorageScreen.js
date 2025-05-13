// src/screens/StorageScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
  Image, // ★★★ Image 컴포넌트 import 활성화 ★★★
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';

const ITEMS_PER_PAGE = 4;
const TOP_SPACE = 40;
const COMPLETED_GARDENS_KEY = '@completedGardens';

const StorageScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();

  const [currentPage, setCurrentPage] = useState(0);
  const [completedGardens, setCompletedGardens] = useState([]); // 이제 { timestamp, snapshotData } 객체 배열
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCompletedGardens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
      const loadedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
      setCompletedGardens(loadedGardens);
      setCurrentPage(0);
    } catch (e) {
      console.error('[StorageScreen] Failed to load completed gardens:', e);
      setError('보관함 정보를 불러오는 데 실패했습니다.');
      setCompletedGardens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompletedGardens();
    }, [loadCompletedGardens])
  );

  const actualTotalItems = completedGardens.length;
  const totalPages = Math.max(1, Math.ceil(actualTotalItems / ITEMS_PER_PAGE));
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const itemsToShow = completedGardens.slice(startIndex, endIndex); // 각 요소는 { timestamp, snapshotData }

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.contentArea, { paddingTop: TOP_SPACE }]}>
          {isLoading && (
            <View style={styles.centerMessageContainer}><ActivityIndicator size="large" color="#00adf5" /></View>
          )}
          {error && !isLoading && (
            <View style={styles.centerMessageContainer}><Text style={styles.errorText}>{error}</Text></View>
          )}
          {!isLoading && !error && actualTotalItems === 0 && (
            <View style={styles.centerMessageContainer}><Text style={styles.emptyText}>완료된 정원이 아직 없어요.</Text></View>
          )}

          {!isLoading && !error && actualTotalItems > 0 && (
            <View style={styles.storageGridContainer}>
              {itemsToShow.map((gardenItem, index) => { // gardenItem은 { timestamp, snapshotData }
                const slotIndex = startIndex + index + 1;
                return (
                  <TouchableOpacity key={gardenItem.timestamp} style={styles.storageSlotButton}>
                    {/* ★★★ slotInnerContent 제거 또는 스타일 변경하고 Image 직접 사용 ★★★ */}
                    {gardenItem.snapshotData ? (
                      <Image
                        source={{ uri: gardenItem.snapshotData }} // Data URI 사용
                        style={styles.gardenSnapshotImage} // 새 스타일 적용
                        resizeMode="cover" // 이미지가 뷰를 가득 채우도록
                      />
                    ) : (
                      // 스냅샷 데이터가 없는 경우 (이론상 없어야 함)
                      <View style={styles.slotInnerContent}>
                        <Text style={styles.boxText}>{`정원 ${slotIndex}`}</Text>
                        <Text style={styles.noSnapshotText}>이미지 없음</Text>
                      </View>
                    )}
                     {/* 정원 번호 텍스트를 이미지 위에 오버레이 (선택적) */}
                    <View style={styles.slotTextOverlay}>
                        <Text style={styles.boxTextOverlay}>{`정원 ${slotIndex}`}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!isLoading && !error && totalPages > 1 && (
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

        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7ff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1,
  },
  centerMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
  },
  storageGridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
    alignContent: 'flex-start',
  },
  storageSlotButton: { // TouchableOpacity가 전체 슬롯 영역
    width: '50%',
    height: '50%', // 또는 고정 높이
    padding: 8,
    position: 'relative', // 오버레이 텍스트를 위한 기준점
  },
  // ★★★ slotInnerContent 스타일은 스냅샷 없을 때 fallback용으로 남겨두거나 수정 ★★★
  slotInnerContent: { // 스냅샷 없을 때의 내용물 스타일
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // 스냅샷 없을 때 배경색
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  // ★★★ 스냅샷 이미지 스타일 추가 ★★★
  gardenSnapshotImage: {
    flex: 1, // 부모(TouchableOpacity)의 크기를 모두 차지
    borderRadius: 10, // 부모와 동일한 borderRadius
    // borderWidth: 1, // 선택적 테두리
    // borderColor: '#ccc', // 선택적 테두리 색상
  },
  boxText: { // 스냅샷 없을 때의 텍스트
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  noSnapshotText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  // ★★★ 이미지 위에 텍스트 오버레이 스타일 (선택적) ★★★
  slotTextOverlay: {
      position: 'absolute',
      bottom: 10, // 이미지 하단에서의 위치
      left: 10,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', // 반투명 배경
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderRadius: 5,
  },
  boxTextOverlay: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff', // 흰색 텍스트
      textAlign: 'center',
  },
  // ★★★ --- ★★★
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