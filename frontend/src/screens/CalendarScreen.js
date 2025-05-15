// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, SafeAreaView, useWindowDimensions, Text, TouchableOpacity,
  Platform, UIManager, LayoutAnimation, ActivityIndicator, Image,
  Modal, FlatList,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import IMAGES from '../constants/images';
import { getMonthlyRecords } from '../api/apiClient';

LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: "오늘"
};
LocaleConfig.defaultLocale = 'ko';

const ESTIMATED_NAV_BAR_HEIGHT = 100;
const TOP_PADDING = 60;
const MARGIN_RATIO_5_WEEKS = 0.11;
const MARGIN_RATIO_6_WEEKS = 0.08;
const MIN_MARGIN = 5;
const MAX_MARGIN = 250;
const DAY_CELL_BASE_HEIGHT = 32;
const DAY_TEXT_FONT_SIZE = 16;
const TODAY_TEXT_COLOR = '#00adf5';
const EMOTION_LOG_PREFIX = '@emotionLog_';
const CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY = '@CalendarScreen_InitialSyncDone_v1';

const keyToEmotionNameMap = {
  H: '행복', Ax: '불안', R: '평온', S: '슬픔',
  Ag: '분노', F: '두려움', Dr: '갈망', Dg: '역겨움',
};

const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
  const totalDays = lastOfMonth.getDate();
  const totalCells = firstDayWeekday + totalDays;
  return Math.ceil(totalCells / 7);
};

const calculateDayPadding = (year, month, currentCalendarHeight) => {
  if (currentCalendarHeight <= 0) return MIN_MARGIN;
  const numberOfWeeks = getWeeksInMonthDisplay(year, month);
  const paddingRatio = numberOfWeeks === 6 ? MARGIN_RATIO_6_WEEKS : MARGIN_RATIO_5_WEEKS;
  const calculatedPadding = currentCalendarHeight * paddingRatio;
  const MIN_EFFECTIVE_PADDING = 5;
  return Math.max(MIN_EFFECTIVE_PADDING, Math.min(calculatedPadding, MAX_MARGIN));
};

const getDaysInMonth = (year, month) => {
  if (typeof year !== 'number' || isNaN(year) || typeof month !== 'number' || isNaN(month) || month < 1 || month > 12) {
    return [];
  }
  const date = new Date(year, month - 1, 1);
  const days = [];
  while (date.getMonth() === month - 1) {
    days.push(formatDateToYYYYMMDD(new Date(date)));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
  const isDisabled = state === 'disabled';
  const isAppToday = marking?.isToday === true;
  const emotionKeyForDay = marking?.emotionKey;
  const emotionIconSource = emotionKeyForDay && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKeyForDay]
    ? IMAGES.emotionIcon[emotionKeyForDay]
    : null;
  
  const validPadding = typeof dayPaddingBottom === 'number' && !isNaN(dayPaddingBottom) ? dayPaddingBottom : MIN_MARGIN;
  const calculatedIconSize = Math.max(10, validPadding * 0.4); 

  const upwardOffsetRatio = 0.1;
  const centralBottomPosition = Math.max(0, (validPadding - calculatedIconSize) / 2);
  let newBottomPosition = centralBottomPosition + (validPadding * upwardOffsetRatio);
  const maxPossibleBottom = Math.max(0, validPadding - calculatedIconSize);
  const iconBottomPosition = Math.max(0, Math.min(newBottomPosition, maxPossibleBottom));
  
  let textStyle = [ styles.dayText, isDisabled && styles.disabledText, isAppToday && styles.todayText, ];
  if (state === 'disabled' && !marking?.isToday) { // 이전/다음 달의 날짜 스타일 (오늘이 아닌 경우)
      textStyle.push(styles.otherMonthDayText);
  } else if (marking?.customStyles?.text) { 
    textStyle.push(marking.customStyles.text); 
  }

  let wrapperStyle = [ styles.dayWrapper, { paddingBottom: validPadding }, ];

  return (
    <TouchableOpacity
      style={wrapperStyle}
      onPress={() => onPress(date)} // isDisabled 검사는 Calendar의 onDayPress에서 처리하는 것이 좋음. 혹은 여기서도 가능.
      onLongPress={() => !isDisabled && onLongPress && onLongPress(date)}
      activeOpacity={isDisabled || !emotionIconSource ? 1 : 0.7}
      // disabled={isDisabled} // Calendar onDayPress에서 state를 보고 판단하도록 함
    >
      <Text style={textStyle}> {date.day} </Text>
      {emotionIconSource && (
        <Image
          source={emotionIconSource}
          style={[
            styles.emotionIcon,
            { 
              width: calculatedIconSize, 
              height: calculatedIconSize, 
              bottom: iconBottomPosition,
            }
          ]}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CalendarScreen = ({ navigation }) => {
  const [currentAppDateString, setCurrentAppDateString] = useState(null);
  const [calendarFocusDateString, setCalendarFocusDateString] = useState(null);
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: null, month: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingMonthByPress, setIsChangingMonthByPress] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const screenTransition = useScreenTransition() || {};
  const isTransitioning = screenTransition.isTransitioning === true;
  const handleNavigate = screenTransition.handleNavigate || (() => {});
  const { width, height: windowHeight } = useWindowDimensions();

  const [isDateInfoModalVisible, setIsDateInfoModalVisible] = useState(false);
  const [selectedDateData, setSelectedDateData] = useState(null);
  const [showChatHistoryInModal, setShowChatHistoryInModal] = useState(false);
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const chatHistoryFlatListRef = useRef(null);

  const [pendingPopupDateString, setPendingPopupDateString] = useState(null);

  const updateMarkingsForMonth = useCallback(async (year, month, appTodayString) => {
    if (!year || !month) return;
    const daysInMonthArray = getDaysInMonth(year, month);
    let newMarkingsForCurrentMonth = {};

    try {
      const keysToFetch = daysInMonthArray.map(day => `${EMOTION_LOG_PREFIX}${day}`);
      const storedData = await AsyncStorage.multiGet(keysToFetch);

      if (Array.isArray(storedData)) {
        storedData.forEach(([key, value]) => {
          if (value !== null) {
            const dateString = key.replace(EMOTION_LOG_PREFIX, '');
            try {
              const parsedData = JSON.parse(value);
              newMarkingsForCurrentMonth[dateString] = { ...newMarkingsForCurrentMonth[dateString], ...parsedData };
            } catch (e) {
              if (typeof value === 'string' && IMAGES.emotionIcon[value]) {
                newMarkingsForCurrentMonth[dateString] = {
                  emotionKey: value, emotionName: keyToEmotionNameMap[value] || '정보 없음',
                  messages: [], creationDate: dateString,
                };
              }
            }
          }
        });
      }

      const apiResponse = await getMonthlyRecords(year, month);
      const serverRecords = apiResponse.data?.monthly_records;
      if (Array.isArray(serverRecords)) {
        serverRecords.forEach(record => {
          const dateStr = record.record_date;
          const emotionKeyFromServer = record.emotion_type.name;
          if (!newMarkingsForCurrentMonth[dateStr] && emotionKeyFromServer) {
            newMarkingsForCurrentMonth[dateStr] = {
              emotionKey: emotionKeyFromServer,
              emotionName: record.emotionName || keyToEmotionNameMap[emotionKeyFromServer] || '정보 없음',
              messages: record.messages || [],
              creationDate: record.creationDate || dateStr,
            };
          } else if (newMarkingsForCurrentMonth[dateStr] && emotionKeyFromServer && !newMarkingsForCurrentMonth[dateStr].emotionKey) {
            newMarkingsForCurrentMonth[dateStr].emotionKey = emotionKeyFromServer;
            if(!newMarkingsForCurrentMonth[dateStr].emotionName) newMarkingsForCurrentMonth[dateStr].emotionName = record.emotionName || keyToEmotionNameMap[emotionKeyFromServer] || '정보 없음';
          }
        });
      }
    } catch (error) {
      console.error("[CalendarScreen] Error updating markings for month:", error);
    }
    
    setMarkedDates(prevMarkedDates => {
      // 이전 달의 마킹 데이터는 유지하고, 현재 로드된 달의 마킹만 덮어쓰거나 병합
      const updatedMarkedDates = { ...prevMarkedDates };
      daysInMonthArray.forEach(dayStr => { // 이전 달에서 가져온 마킹이 있다면 삭제
          if(updatedMarkedDates[dayStr] && !newMarkingsForCurrentMonth[dayStr]) {
              delete updatedMarkedDates[dayStr];
          }
      });
      Object.assign(updatedMarkedDates, newMarkingsForCurrentMonth);


      // 오늘 날짜 처리: 모든 isToday 플래그를 먼저 제거 후, 현재 appTodayString에만 설정
      Object.keys(updatedMarkedDates).forEach(dateKey => {
        if (updatedMarkedDates[dateKey]?.isToday) {
          delete updatedMarkedDates[dateKey].isToday;
          if (Object.keys(updatedMarkedDates[dateKey]).length === 0) { // 내용이 없으면 키 자체를 삭제
            delete updatedMarkedDates[dateKey];
          }
        }
      });
      if (appTodayString && updatedMarkedDates[appTodayString]) {
        updatedMarkedDates[appTodayString].isToday = true;
      } else if (appTodayString) {
        updatedMarkedDates[appTodayString] = { isToday: true };
      }
      return updatedMarkedDates;
    });
  }, [keyToEmotionNameMap]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadInitialData = async () => {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const appDate = await getAppCurrentDate();
          if (!isActive) { setIsLoading(false); return; }

          const formattedAppDate = formatDateToYYYYMMDD(appDate);
          const initialYear = appDate.getFullYear();
          const initialMonth = appDate.getMonth() + 1;

          setCurrentAppDateString(formattedAppDate);
          setCalendarFocusDateString(formattedAppDate);
          setCurrentYearMonth({ year: initialYear, month: initialMonth });

          const initialSyncStatus = await AsyncStorage.getItem(CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY);
          if (initialSyncStatus !== 'true') {
             try {
                 const response = await getMonthlyRecords(initialYear, initialMonth);
                 const serverRecords = response.data?.monthly_records;
                 if (Array.isArray(serverRecords)) {
                     const recordsToStoreFromAPI = [];
                     for (const record of serverRecords) {
                         const detailKey = `${EMOTION_LOG_PREFIX}${record.record_date}`;
                         const existingDetail = await AsyncStorage.getItem(detailKey);
                         const apiEmotionKey = record.emotion_type?.name;
                         const apiEmotionName = record.emotionName || (apiEmotionKey ? keyToEmotionNameMap[apiEmotionKey] : null) || '정보 없음';
                         const apiMessages = record.messages || []; 
                         const apiCreationDate = record.creationDate || record.record_date;
                         if (!existingDetail && apiEmotionKey) {
                             recordsToStoreFromAPI.push([ detailKey, JSON.stringify({ emotionKey: apiEmotionKey, emotionName: apiEmotionName, messages: apiMessages, creationDate: apiCreationDate, }) ]);
                         }
                     }
                     if (recordsToStoreFromAPI.length > 0) await AsyncStorage.multiSet(recordsToStoreFromAPI);
                 }
                 if (isActive) await AsyncStorage.setItem(CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY, 'true');
             } catch (apiError) { console.error("[CalendarScreen] API 호출 실패 (최초 동기화):", apiError); }
          }
          await updateMarkingsForMonth(initialYear, initialMonth, formattedAppDate);
        } catch (error) {
          console.error("[CalendarScreen] Failed to load initial app date:", error);
          if (isActive) {
            const today = new Date(); const formattedToday = formatDateToYYYYMMDD(today);
            setCurrentAppDateString(formattedToday); setCalendarFocusDateString(formattedToday);
            setCurrentYearMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
            setMarkedDates({ [formattedToday]: { isToday: true } });
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      loadInitialData();
      return () => { isActive = false; };
    }, [updateMarkingsForMonth, keyToEmotionNameMap])
  );

  const handleMonthChange = useCallback(async (monthData) => {
    // Calendar 내부 스와이프 또는 화살표 클릭 시 호출
    if (isLoading) return; // 이미 로딩 중이면 중복 방지

    const newYear = monthData.year;
    const newMonth = monthData.month;

    if (newYear === currentYearMonth.year && newMonth === currentYearMonth.month) {
      return; // 같은 월이면 변경 없음
    }

    setIsLoading(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // calendarFocusDateString은 Calendar 내부적으로 monthData.dateString으로 업데이트 됨.
    setCurrentYearMonth({ year: newYear, month: newMonth });
    await updateMarkingsForMonth(newYear, newMonth, currentAppDateString);
    setIsLoading(false);
  }, [isLoading, currentYearMonth, updateMarkingsForMonth, currentAppDateString]);

  const handleDayPress = useCallback(async (day) => {
    // day: { dateString, day, month, year, timestamp }
    // `day.state` (e.g., 'disabled' for other month days) can be checked if needed.
    // Calendar's `onDayPress` is called for all pressable days, including other month days.
    if (isChangingMonthByPress || isLoading) return;

    const targetYear = day.year;
    const targetMonth = day.month;

    if (targetMonth !== currentYearMonth.month || targetYear !== currentYearMonth.year) {
      // 다른 달의 날짜를 클릭
      setIsChangingMonthByPress(true);
      setIsLoading(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setCalendarFocusDateString(day.dateString); // 캘린더 이동
      setCurrentYearMonth({ year: targetYear, month: targetMonth }); // 내부 상태 업데이트
      
      await updateMarkingsForMonth(targetYear, targetMonth, currentAppDateString); // 새 월 데이터 로드
      
      setPendingPopupDateString(day.dateString); // 팝업 대기
      setIsLoading(false);
      setIsChangingMonthByPress(false);
    } else {
      // 현재 달의 날짜를 클릭
      const dateInfo = markedDates[day.dateString];
      if (dateInfo && dateInfo.emotionKey) {
        setSelectedDateData({
          id: day.dateString,
          emotionKey: dateInfo.emotionKey,
          emotionName: dateInfo.emotionName || keyToEmotionNameMap[dateInfo.emotionKey] || '정보 없음',
          messages: dateInfo.messages || [],
          creationDate: dateInfo.creationDate || day.dateString,
        });
        setShowChatHistoryInModal(false);
        setIsDateInfoModalVisible(true);
      }
    }
  }, [isChangingMonthByPress, isLoading, currentYearMonth, markedDates, updateMarkingsForMonth, currentAppDateString, keyToEmotionNameMap]);

  useEffect(() => {
    if (pendingPopupDateString && !isLoading && !isChangingMonthByPress) {
      const dateInfo = markedDates[pendingPopupDateString];
      if (dateInfo && dateInfo.emotionKey) {
        setSelectedDateData({
          id: pendingPopupDateString,
          emotionKey: dateInfo.emotionKey,
          emotionName: dateInfo.emotionName || keyToEmotionNameMap[dateInfo.emotionKey] || '정보 없음',
          messages: dateInfo.messages || [],
          creationDate: dateInfo.creationDate || pendingPopupDateString,
        });
        setShowChatHistoryInModal(false);
        setIsDateInfoModalVisible(true);
      }
      setPendingPopupDateString(null);
    }
  }, [markedDates, pendingPopupDateString, isLoading, isChangingMonthByPress, keyToEmotionNameMap]);

  const calendarHeight = useMemo(() => Math.max(windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT, 250), [windowHeight]);
  const dynamicDayPaddingBottom = useMemo(() => {
    if (currentYearMonth.year && currentYearMonth.month) {
      return calculateDayPadding(currentYearMonth.year, currentYearMonth.month, calendarHeight);
    }
    return MIN_MARGIN;
  }, [currentYearMonth, calendarHeight]);

  const handleDateInfoModalClose = () => {
      setIsDateInfoModalVisible(false);
      setSelectedDateData(null);
      setShowChatHistoryInModal(false);
  };

  const handleToggleChatHistoryInModal = () => {
      setShowChatHistoryInModal(prevState => !prevState);
  };

  const renderChatHistoryItem = ({ item }) => (
     <View style={[ styles.chatMessageOuterContainer, item.sender === 'bot' ? styles.chatBotRowContainer : styles.chatUserRowContainer ]}>
       <View style={[ styles.chatMessageBubble, item.sender === 'bot' ? styles.chatBotBubble : styles.chatUserBubble ]}>
         <Text style={styles.chatMessageText}>{item.text}</Text>
       </View>
     </View>
  );

  useEffect(() => {
      if (isDateInfoModalVisible && showChatHistoryInModal) {
          if (selectedDateData && selectedDateData.messages) {
              setIsLoadingChatHistory(true);
              const timer = setTimeout(() => { setIsLoadingChatHistory(false); }, 50);
              return () => clearTimeout(timer);
          } else { setIsLoadingChatHistory(false); }
      } else { setIsLoadingChatHistory(false); }
  }, [isDateInfoModalVisible, showChatHistoryInModal, selectedDateData]);

  if (!calendarFocusDateString && isLoading) { // 초기 로딩 시
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4a90e2" /><Text style={styles.loadingText}>달력 정보를 불러오는 중...</Text></View>
        <View style={styles.navigationBarPlacement}><NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} /></View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <View style={[styles.mainContentContainer, { paddingHorizontal: width * 0.05 }]}>
          <View style={styles.calendarPositioningContainer}>
            {(isLoading || isChangingMonthByPress) && calendarFocusDateString && (<View style={styles.monthChangeLoadingOverlay}><ActivityIndicator size="small" color="#4a90e2" /></View>)}
            <View style={{ height: calendarHeight, overflow: 'hidden' }}>
              {calendarFocusDateString && (
                <Calendar
                  key={calendarFocusDateString} // 월 이동 시 캘린더를 강제로 다시 그리도록 key 변경
                  style={{ height: calendarHeight, backgroundColor: '#eef7ff' }}
                  current={calendarFocusDateString}
                  dayComponent={(dayProps) => (<CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} />)}
                  onDayPress={handleDayPress}
                  onMonthChange={handleMonthChange}
                  markingType={'custom'}
                  markedDates={markedDates}
                  enableSwipeMonths={true}
                  pastScrollRange={12}
                  futureScrollRange={12}
                  hideExtraDays={false} // 다른 달 날짜 표시
                  theme={{ arrowColor: 'orange', calendarBackground: 'transparent', 'stylesheet.calendar.header': { dayTextAtIndex0: { color: 'red' }, dayTextAtIndex6: { color: 'blue' }, }, }}
                />
              )}
            </View>
          </View>
        </View>
        <View style={styles.navigationBarPlacement}><NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} /></View>
      </View>
      {/* Modal UI (이전과 동일) */}
      {selectedDateData && ( <Modal visible={isDateInfoModalVisible} transparent={true} animationType="fade" onRequestClose={handleDateInfoModalClose}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleDateInfoModalClose}><TouchableOpacity activeOpacity={1} style={[styles.infoModalContainer, { height: windowHeight * 0.6, maxHeight: 500 }]}><View style={styles.infoModalContent}>{showChatHistoryInModal ? (<><Text style={styles.infoModalTitle}>대화 기록</Text><View style={styles.chatHistoryContainer}>{isLoadingChatHistory ? (<View style={styles.chatLoadingContainer}><ActivityIndicator size="small" color="#2196F3" /><Text style={styles.chatLoadingText}>대화 기록 불러오는 중...</Text></View>) : ((selectedDateData.messages && selectedDateData.messages.length > 0) ? (<FlatList ref={chatHistoryFlatListRef} data={selectedDateData.messages} renderItem={renderChatHistoryItem} keyExtractor={(item, index) => item.id || `chat-msg-${index}-${Date.now()}`} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }} ListEmptyComponent={ <View style={styles.emptyChatContainer}><Text style={styles.emptyChatText}>대화 기록이 없습니다.</Text></View> } extraData={selectedDateData.messages} initialNumToRender={10} windowSize={5} removeClippedSubviews={Platform.OS === 'android'} />) : (<View style={styles.emptyChatContainer}><Text style={styles.emptyChatText}>대화 기록을 불러올 수 없습니다.</Text></View>))}</View><View style={styles.infoModalButtonArea}><TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.infoModalButton}><Text style={styles.infoModalButtonText}>기본 정보 보기</Text></TouchableOpacity><TouchableOpacity onPress={handleDateInfoModalClose} style={[styles.infoModalButton, styles.infoModalCloseButton]}><Text style={styles.infoModalButtonText}>닫기</Text></TouchableOpacity></View></>) : (<><Text style={styles.infoModalTitle}>{selectedDateData.creationDate || '날짜 정보 없음'}</Text><View style={styles.infoModalMainContent}><View style={styles.emotionDisplayArea}>{selectedDateData.emotionKey && IMAGES.emotionIcon[selectedDateData.emotionKey] && (<Image source={IMAGES.emotionIcon[selectedDateData.emotionKey]} style={styles.infoModalEmotionIcon} resizeMode="contain" />)}<Text style={styles.infoModalEmotionName}>{selectedDateData.emotionName}</Text></View></View><View style={styles.infoModalButtonArea}>{selectedDateData.messages && selectedDateData.messages.length > 0 && (<TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.infoModalButton}><Text style={styles.infoModalButtonText}>대화 기록 보기</Text></TouchableOpacity>)}<TouchableOpacity onPress={handleDateInfoModalClose} style={[styles.infoModalButton, styles.infoModalCloseButton, !(selectedDateData.messages && selectedDateData.messages.length > 0) && { alignSelf: 'center', width: '50%'}]}><Text style={styles.infoModalButtonText}>닫기</Text></TouchableOpacity></View></>)}</View></TouchableOpacity></TouchableOpacity></Modal>)}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (기존 스타일과 동일) ...
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1, justifyContent: 'space-between' },
  mainContentContainer: { flex: 1, width: '100%', position: 'relative', zIndex: 1, },
  calendarPositioningContainer: { width: '100%', paddingTop: TOP_PADDING, position: 'relative' },
  navigationBarPlacement: { width: '100%', position: 'relative', zIndex: 0, },
  dayWrapper: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, },
  dayText: { fontSize: DAY_TEXT_FONT_SIZE, color: '#2d4150', },
  otherMonthDayText: { color: '#b0bec5' }, // 이전/다음 달 날짜 색상
  todayText: { color: TODAY_TEXT_COLOR, fontWeight: 'bold', },
  disabledText: { color: '#d9e1e8' }, // Calendar 내부에서 사용 (일반적으로 비활성화된 날짜)
  emotionIcon: { position: 'absolute', alignSelf: 'center', zIndex: 10, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4a90e2' },
  monthChangeLoadingOverlay: { position: 'absolute', top: TOP_PADDING, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(238, 247, 255, 0.5)', zIndex: 20, },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  infoModalContainer: { width: '85%', maxWidth: 380, backgroundColor: 'white', borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, overflow: 'hidden', },
  infoModalContent: { width: '100%', flex: 1, flexDirection: 'column', paddingHorizontal: 20, paddingVertical: 15, },
  infoModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15, flexShrink: 0, },
  infoModalMainContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 10, },
  emotionDisplayArea: { alignItems: 'center', },
  infoModalEmotionIcon: { width: 80, height: 80, marginBottom: 10, },
  infoModalEmotionName: { fontSize: 18, color: '#444', fontWeight: '500', textAlign: 'center', },
  infoModalButtonArea: { width: '100%', alignItems: 'center', paddingTop: 15, flexDirection: 'column', gap: 10, flexShrink: 0, },
  infoModalButton: { backgroundColor: '#2196F3', paddingVertical: 10, borderRadius: 8, width: '90%', alignItems: 'center', },
  infoModalCloseButton: { backgroundColor: '#757575', },
  infoModalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
  chatHistoryContainer: { flex: 1, width: '100%', paddingHorizontal: 5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', },
  chatLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  chatLoadingText: { marginTop: 8, fontSize: 14, color: '#666', },
  emptyChatContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  emptyChatText: { fontSize: 15, color: '#888', },
  chatMessageOuterContainer: { flexDirection: 'row', marginVertical: 5, maxWidth: '100%', },
  chatBotRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', paddingRight: '15%', },
  chatUserRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', paddingLeft: '15%', },
  chatMessageBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, maxWidth: '100%', },
  chatBotBubble: { backgroundColor: '#e5e5ea', borderTopLeftRadius: 0, alignSelf: 'flex-start', },
  chatUserBubble: { backgroundColor: '#dcf8c6', borderTopRightRadius: 0, alignSelf: 'flex-end', },
  chatMessageText: { fontSize: 15, color: '#000', lineHeight: 20, },
});

export default CalendarScreen;