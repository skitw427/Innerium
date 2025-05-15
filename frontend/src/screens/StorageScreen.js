// src/screens/StorageScreen.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  useWindowDimensions, // 추가
  ActivityIndicator,
  Alert,
  Image,
  FlatList, // FlatList 추가
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
  const { width: windowWidth } = useWindowDimensions(); // 화면 너비 가져오기

  const [currentPage, setCurrentPage] = useState(0);
  const [completedGardens, setCompletedGardens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null); // FlatList 참조

  const loadCompletedGardens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const completedGardensString = await AsyncStorage.getItem(COMPLETED_GARDENS_KEY);
      const loadedGardens = completedGardensString ? JSON.parse(completedGardensString) : [];
      setCompletedGardens(loadedGardens);
      setCurrentPage(0); // 로드 시 첫 페이지로
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

  // FlatList에 사용할 페이지별 데이터 생성
  const pagedData = useMemo(() => {
    if (!completedGardens || completedGardens.length === 0) return [];
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push({
        id: `page-${i}`,
        items: completedGardens.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE),
        pageIndex: i, // 각 페이지의 인덱스 정보 추가
      });
    }
    return pages;
  }, [completedGardens, totalPages]);


  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      const nextPage = currentPage + 1;
      flatListRef.current?.scrollToIndex({ animated: true, index: nextPage });
      // onViewableItemsChanged가 currentPage를 업데이트하므로 여기서 직접 setCurrentPage 안 함
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      flatListRef.current?.scrollToIndex({ animated: true, index: prevPage });
      // onViewableItemsChanged가 currentPage를 업데이트하므로 여기서 직접 setCurrentPage 안 함
    }
  };

  // 스와이프로 페이지 변경 시 currentPage 상태 업데이트
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      // viewableItems[0].item은 pagedData의 요소 {id, items, pageIndex}
      const visiblePageIndex = viewableItems[0].item.pageIndex;
      if (visiblePageIndex !== currentPage) {
        setCurrentPage(visiblePageIndex);
      }
    }
  }, [currentPage]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // 아이템이 50% 이상 보여야 인식
    waitForInteraction: true,
  }).current;

  const renderPageItem = ({ item }) => { // item은 {id, items, pageIndex}
    const pageItems = item.items;
    const pageBaseIndex = item.pageIndex * ITEMS_PER_PAGE;

    return (
      <View style={[styles.pageContainer, { width: windowWidth }]}>
        <View style={styles.storageGridContainer}>
          {pageItems.map((gardenItem, index) => {
            const slotIndex = pageBaseIndex + index + 1;
            return (
              <TouchableOpacity
                key={gardenItem.timestamp}
                style={styles.storageSlotButton}
                activeOpacity={0.7}
              >
                {gardenItem.snapshotData ? (
                  <Image
                    source={{ uri: gardenItem.snapshotData }}
                    style={styles.gardenSnapshotImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.slotInnerContent}>
                    <Text style={styles.boxText}>{`정원 ${slotIndex}`}</Text>
                    <Text style={styles.noSnapshotText}>이미지 없음</Text>
                  </View>
                )}
                <View style={styles.slotTextOverlay}>
                  <Text style={styles.boxTextOverlay}>{`정원 ${slotIndex}`}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {/* 페이지당 아이템 수가 ITEMS_PER_PAGE보다 적을 경우 빈 슬롯 채우기 (선택 사항) */}
          {Array(ITEMS_PER_PAGE - pageItems.length).fill(0).map((_, i) => (
             <View key={`empty-${i}`} style={[styles.storageSlotButton, styles.emptySlotPlaceholder]} />
          ))}
        </View>
      </View>
    );
  };


  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fullScreenCenter}>
          <ActivityIndicator size="large" color="#00adf5" />
        </View>
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fullScreenCenter}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (actualTotalItems === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fullScreenCenter}>
          <Text style={styles.emptyText}>완료된 정원이 아직 없어요.</Text>
        </View>
        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.contentArea, { paddingTop: TOP_SPACE }]}>
          <FlatList
            ref={flatListRef}
            data={pagedData}
            renderItem={renderPageItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={1} // 성능 최적화
            windowSize={3} // 현재, 이전, 다음 페이지만 렌더링 (성능 최적화)
            getItemLayout={(data, index) => ( // 성능 최적화
              { length: windowWidth, offset: windowWidth * index, index }
            )}
          />

          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                onPress={goToPreviousPage}
                disabled={currentPage === 0}
                style={[styles.arrowButton, currentPage === 0 && styles.disabledArrow]}
              >
                <Text style={styles.arrowText}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>{`Page ${currentPage + 1} / ${totalPages}`}</Text>
              <TouchableOpacity
                onPress={goToNextPage}
                disabled={currentPage >= totalPages - 1}
                style={[styles.arrowButton, currentPage >= totalPages - 1 && styles.disabledArrow]}
              >
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
  fullScreenCenter: { // 로딩, 에러, 빈 상태를 위한 스타일
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
  pageContainer: { // 각 페이지를 감싸는 View, 화면 너비를 가짐
    flex: 1,
    // backgroundColor: 'lightblue', // 디버깅용
  },
  storageGridContainer: { // 한 페이지 내부의 2x2 그리드
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5, // 그리드 내부 패딩
    alignContent: 'flex-start', // 중요: 아이템들을 상단부터 채움
  },
  storageSlotButton: {
    width: '50%', // 그리드 컨테이너 너비의 50%
    height: '50%', // 그리드 컨테이너 높이의 50%
    padding: 8,
    position: 'relative',
  },
  emptySlotPlaceholder: { // 빈 슬롯을 위한 스타일 (내용 없이 공간만 차지)
    backgroundColor: 'transparent', // 또는 매우 연한 회색 등
  },
  slotInnerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  gardenSnapshotImage: {
    flex: 1,
    borderRadius: 10,
  },
  boxText: {
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
  slotTextOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 5,
    // 슬롯 패딩 고려해서 위치 조정
    margin: 8, // storageSlotButton의 padding과 동일하게
  },
  boxTextOverlay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#eef7ff', // SafeArea 배경색과 일치
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