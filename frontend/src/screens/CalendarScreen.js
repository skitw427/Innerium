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

const ESTIMATED_NAV_BAR_HEIGHT = 130; // 네비게이션 바의 실제 높이와 패딩을 고려한 값
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

  // --- 아이콘 위치 조정 로직 (비율 기반) ---
  // upwardOffsetRatio: 아이콘을 얼마나 위로 올릴지에 대한 비율입니다.
  // 0.0 이면 기존 중앙 정렬에 가깝고, 값이 커질수록 아이콘이 위로 올라갑니다.
  // 0.05 ~ 0.2 사이의 값을 사용해 보시는 것을 추천합니다. (예: 0.1은 패딩 높이의 10%만큼 더 올림)
  const upwardOffsetRatio = 0.1; // <<< 이 값을 조절하여 아이콘 위치를 변경하세요.

  // 1. 아이콘을 패딩 영역 내에 수직 중앙 정렬했을 때의 기본 bottom 값 계산
  const centralBottomPosition = Math.max(0, (validPadding - calculatedIconSize) / 2);

  // 2. 기본 중앙 위치에서 (패딩 높이 * upwardOffsetRatio) 만큼 추가로 올림
  let newBottomPosition = centralBottomPosition + (validPadding * upwardOffsetRatio);

  // 3. 아이콘이 패딩 영역의 상단을 넘지 않도록 최대 bottom 값을 계산
  const maxPossibleBottom = Math.max(0, validPadding - calculatedIconSize);

  // 4. 최종 bottom 값은 0 (패딩 바닥)과 maxPossibleBottom 사이로 제한
  const iconBottomPosition = Math.max(0, Math.min(newBottomPosition, maxPossibleBottom));
  // --- 아이콘 위치 조정 로직 끝 ---
  
  let textStyle = [ styles.dayText, isDisabled && styles.disabledText, isAppToday && styles.todayText, ];
  if (marking?.customStyles?.text) { textStyle.push(marking.customStyles.text); }
  let wrapperStyle = [ styles.dayWrapper, { paddingBottom: validPadding }, ];

  return (
    <TouchableOpacity
      style={wrapperStyle}
      onPress={() => !isDisabled && onPress(date)}
      onLongPress={() => !isDisabled && onLongPress && onLongPress(date)}
      activeOpacity={isDisabled || !emotionIconSource ? 1 : 0.7}
      disabled={isDisabled}
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
              bottom: iconBottomPosition, // 계산된 비율 기반 bottom 값 적용
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

  const updateMarkingsForMonth = useCallback(async (year, month, appTodayDate) => {
    if (!year || !month || !appTodayDate) return;
    const daysInMonth = getDaysInMonth(year, month);
    if (!Array.isArray(daysInMonth) || daysInMonth.length === 0) {
      setMarkedDates(prev => ({ ...prev, [appTodayDate]: { ...(prev[appTodayDate] || {}), isToday: true } }));
      return;
    }

    const keysToFetch = daysInMonth.map(day => `${EMOTION_LOG_PREFIX}${day}`);
    let newMarkedDates = {};

    try {
      const storedData = await AsyncStorage.multiGet(keysToFetch);
      if (Array.isArray(storedData)) {
        storedData.forEach(([key, value]) => {
          if (value !== null) {
            const dateString = key.replace(EMOTION_LOG_PREFIX, '');
            try {
              const parsedData = JSON.parse(value);
              newMarkedDates[dateString] = { ...newMarkedDates[dateString], ...parsedData, };
            } catch (e) {
              console.error(`[CalendarScreen] Failed to parse stored data for ${dateString}:`, e);
              if (typeof value === 'string' && IMAGES.emotionIcon[value]) {
                 newMarkedDates[dateString] = {
                     emotionKey: value, emotionName: keyToEmotionNameMap[value] || '정보 없음',
                     messages: [], creationDate: dateString,
                 };
              }
            }
          }
        });
      }

      try {
         const apiResponse = await getMonthlyRecords(year, month);
         const serverRecords = apiResponse.data?.monthly_records;
         if (Array.isArray(serverRecords)) {
             serverRecords.forEach(record => {
                 const dateStr = record.record_date;
                 const emotionKeyFromServer = record.emotion_type.name;
                 if (!newMarkedDates[dateStr] && emotionKeyFromServer) {
                     newMarkedDates[dateStr] = {
                         emotionKey: emotionKeyFromServer,
                         emotionName: record.emotionName || keyToEmotionNameMap[emotionKeyFromServer] || '정보 없음',
                         messages: record.messages || [],
                         creationDate: record.creationDate || dateStr,
                     };
                 } else if (newMarkedDates[dateStr] && emotionKeyFromServer && !newMarkedDates[dateStr].emotionKey) {
                      newMarkedDates[dateStr].emotionKey = emotionKeyFromServer;
                      if(!newMarkedDates[dateStr].emotionName) newMarkedDates[dateStr].emotionName = record.emotionName || keyToEmotionNameMap[emotionKeyFromServer] || '정보 없음';
                 }
             });
         }
      } catch (apiErr) {
         console.error("[CalendarScreen] Failed to fetch or process API monthly records:", apiErr);
      }

      setMarkedDates(prevMarkedDates => {
        const mergedMarkedDates = { ...prevMarkedDates, ...newMarkedDates };
        if (appTodayDate && mergedMarkedDates[appTodayDate]) {
          mergedMarkedDates[appTodayDate].isToday = true;
        } else if (appTodayDate) {
          mergedMarkedDates[appTodayDate] = { isToday: true };
        }
        return mergedMarkedDates;
      });

    } catch (error) {
      console.error("[CalendarScreen] Failed to update markings:", error);
      if (appTodayDate) {
        setMarkedDates(prev => ({ ...prev, [appTodayDate]: { ...(prev[appTodayDate] || {}), isToday: true } }));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadInitialData = async () => {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const appDate = await getAppCurrentDate();
          if (!isActive) return;

          const formattedAppDate = formatDateToYYYYMMDD(appDate);
          const initialYear = appDate.getFullYear();
          const initialMonth = appDate.getMonth() + 1;

          setCurrentAppDateString(formattedAppDate);
          setCalendarFocusDateString(formattedAppDate);
          setCurrentYearMonth({ year: initialYear, month: initialMonth });

          const initialSyncStatus = await AsyncStorage.getItem(CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY);
          if (initialSyncStatus !== 'true') {
             console.log(`[CalendarScreen] '${CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY}' 확인: 최초 동기화 필요.`);
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
                             recordsToStoreFromAPI.push([
                                 detailKey,
                                 JSON.stringify({
                                     emotionKey: apiEmotionKey,
                                     emotionName: apiEmotionName,
                                     messages: apiMessages,
                                     creationDate: apiCreationDate,
                                 })
                             ]);
                         }
                     }
                     if (recordsToStoreFromAPI.length > 0) {
                         await AsyncStorage.multiSet(recordsToStoreFromAPI);
                         console.log("[CalendarScreen] API 데이터를 (필요시) AsyncStorage에 저장 완료.");
                     }
                 }
                 if (isActive) {
                     await AsyncStorage.setItem(CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY, 'true');
                     console.log(`[CalendarScreen] '${CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY}'에 'true' 저장 완료.`);
                 }
             } catch (apiError) {
                 console.error("[CalendarScreen] API 호출 또는 데이터 저장 실패 (최초 동기화):", apiError);
             }
          } else {
            console.log(`[CalendarScreen] '${CALENDAR_SCREEN_INITIAL_SYNC_DONE_KEY}' 확인: 이미 최초 동기화 완료됨.`);
          }
          await updateMarkingsForMonth(initialYear, initialMonth, formattedAppDate);
        } catch (error) {
          console.error("[CalendarScreen] Failed to load initial app date:", error);
          if (isActive) {
            const today = new Date();
            const formattedToday = formatDateToYYYYMMDD(today);
            setCurrentAppDateString(formattedToday);
            setCalendarFocusDateString(formattedToday);
            setCurrentYearMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
            setMarkedDates({ [formattedToday]: { isToday: true } });
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      loadInitialData();
      return () => { isActive = false; };
    }, [updateMarkingsForMonth])
  );

  const handleMonthChange = useCallback((monthData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newYear = monthData.year;
    const newMonth = monthData.month;
    const newFocusDateString = monthData.dateString;
    setCurrentYearMonth({ year: newYear, month: newMonth });
    setCalendarFocusDateString(newFocusDateString);
    if (currentAppDateString) {
      updateMarkingsForMonth(newYear, newMonth, currentAppDateString);
    }
  }, [currentAppDateString, updateMarkingsForMonth]);

  const calendarHeight = useMemo(() => Math.max(windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT, 250), [windowHeight]);
  const dynamicDayPaddingBottom = useMemo(() => {
    if (currentYearMonth.year && currentYearMonth.month) {
      return calculateDayPadding(currentYearMonth.year, currentYearMonth.month, calendarHeight);
    }
    return MIN_MARGIN;
  }, [currentYearMonth, calendarHeight]);

  const handleDayPress = useCallback((day) => {
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
      } else {
         console.log('해당 날짜에 표시할 감정 기록이 없습니다:', day.dateString);
      }
  }, [markedDates]);

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
              const timer = setTimeout(() => {
                  setIsLoadingChatHistory(false);
              }, 50);
              return () => clearTimeout(timer);
          } else {
              setIsLoadingChatHistory(false);
          }
      } else {
          setIsLoadingChatHistory(false);
      }
  }, [isDateInfoModalVisible, showChatHistoryInModal, selectedDateData]);

  if (isLoading || !calendarFocusDateString) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>달력 정보를 불러오는 중...</Text>
        </View>
        <View style={styles.navigationBarPlacement}>
          <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <View style={[styles.mainContentContainer, { paddingHorizontal: width * 0.05 }]}>
          <View style={styles.calendarPositioningContainer}>
            <View style={{ height: calendarHeight, overflow: 'hidden' }}>
              <Calendar
                style={{ height: calendarHeight, backgroundColor: '#eef7ff' }}
                current={calendarFocusDateString}
                dayComponent={(dayProps) => (
                  <CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} onPress={handleDayPress} />
                )}
                onMonthChange={handleMonthChange}
                markingType={'custom'}
                markedDates={markedDates}
                theme={{
                  arrowColor: 'orange',
                  calendarBackground: 'transparent',
                  'stylesheet.calendar.header': {
                    dayTextAtIndex0: { color: 'red' },
                    dayTextAtIndex6: { color: 'blue' },
                  },
                }}
              />
            </View>
          </View>
        </View>
        <View style={styles.navigationBarPlacement}>
          <NavigationBar onNavigate={(screen) => handleNavigate(navigation, screen)} isTransitioning={isTransitioning} />
        </View>
      </View>

      {selectedDateData && (
        <Modal visible={isDateInfoModalVisible} transparent={true} animationType="fade" onRequestClose={handleDateInfoModalClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleDateInfoModalClose}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.infoModalContainer, { height: windowHeight * 0.6, maxHeight: 500 }]}
                >
                    <View style={styles.infoModalContent}>
                        {showChatHistoryInModal ? (
                            <>
                                <Text style={styles.infoModalTitle}>대화 기록</Text>
                                <View style={styles.chatHistoryContainer}>
                                    {isLoadingChatHistory ? (
                                        <View style={styles.chatLoadingContainer}>
                                            <ActivityIndicator size="small" color="#2196F3" />
                                            <Text style={styles.chatLoadingText}>대화 기록 불러오는 중...</Text>
                                        </View>
                                    ) : (
                                        (selectedDateData.messages && selectedDateData.messages.length >= 0) ? (
                                            <FlatList
                                                ref={chatHistoryFlatListRef}
                                                data={selectedDateData.messages}
                                                renderItem={renderChatHistoryItem}
                                                keyExtractor={(item, index) => item.id || `chat-msg-${index}-${Date.now()}`}
                                                style={{ flex: 1 }}
                                                contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }}
                                                ListEmptyComponent={
                                                    <View style={styles.emptyChatContainer}>
                                                        <Text style={styles.emptyChatText}>대화 기록이 없습니다.</Text>
                                                    </View>
                                                }
                                                extraData={selectedDateData.messages}
                                                initialNumToRender={10}
                                                windowSize={5}
                                                removeClippedSubviews={Platform.OS === 'android'}
                                            />
                                        ) : (
                                            <View style={styles.emptyChatContainer}>
                                                <Text style={styles.emptyChatText}>대화 기록을 불러올 수 없습니다.</Text>
                                            </View>
                                        )
                                    )}
                                </View>
                                <View style={styles.infoModalButtonArea}>
                                    <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.infoModalButton}>
                                        <Text style={styles.infoModalButtonText}>기본 정보 보기</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDateInfoModalClose} style={[styles.infoModalButton, styles.infoModalCloseButton]}>
                                        <Text style={styles.infoModalButtonText}>닫기</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.infoModalTitle}>
                                    {selectedDateData.creationDate || '날짜 정보 없음'}
                                </Text>
                                <View style={styles.infoModalMainContent}>
                                    <View style={styles.emotionDisplayArea}>
                                        {selectedDateData.emotionKey && IMAGES.emotionIcon[selectedDateData.emotionKey] && (
                                            <Image source={IMAGES.emotionIcon[selectedDateData.emotionKey]} style={styles.infoModalEmotionIcon} resizeMode="contain" />
                                        )}
                                        <Text style={styles.infoModalEmotionName}>{selectedDateData.emotionName}</Text>
                                    </View>
                                </View>
                                <View style={styles.infoModalButtonArea}>
                                    {selectedDateData.messages && selectedDateData.messages.length > 0 && (
                                        <TouchableOpacity onPress={handleToggleChatHistoryInModal} style={styles.infoModalButton}>
                                            <Text style={styles.infoModalButtonText}>대화 기록 보기</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={handleDateInfoModalClose} style={[
                                        styles.infoModalButton,
                                        styles.infoModalCloseButton,
                                        !(selectedDateData.messages && selectedDateData.messages.length > 0) && { alignSelf: 'center', width: '50%'}
                                    ]}>
                                        <Text style={styles.infoModalButtonText}>닫기</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1, justifyContent: 'space-between' },
  mainContentContainer: { // 캘린더를 포함하는 메인 컨텐츠 영역
    flex: 1, 
    width: '100%',
    position: 'relative', // zIndex를 사용하기 위해 추가
    zIndex: 1,           // 네비게이션 바보다 위에 있도록 설정
  },
  calendarPositioningContainer: { width: '100%', paddingTop: TOP_PADDING },
  navigationBarPlacement: { // 네비게이션 바를 감싸는 영역
    width: '100%',
    position: 'relative', // zIndex 사용 또는 자식 컴포넌트의 쌓임 컨텍스트를 위해
    zIndex: 0,           // mainContentContainer보다 아래에 있도록 설정 (기본값이므로 명시적 0은 선택사항)
  },
  dayWrapper: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, },
  dayText: { fontSize: DAY_TEXT_FONT_SIZE, color: '#2d4150', },
  todayText: { color: TODAY_TEXT_COLOR, fontWeight: 'bold', },
  disabledText: { color: '#d9e1e8' },
  emotionIcon: { position: 'absolute', alignSelf: 'center', zIndex: 10, }, // 셀 내부에서 텍스트보다 위에 오도록 zIndex 유지
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4a90e2' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  infoModalContainer: {
    width: '85%', maxWidth: 380, backgroundColor: 'white', borderRadius: 15,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, overflow: 'hidden',
  },
  infoModalContent: {
    width: '100%', flex: 1, flexDirection: 'column',
    paddingHorizontal: 20, paddingVertical: 15,
  },
  infoModalTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#333',
    textAlign: 'center', marginBottom: 15, flexShrink: 0,
  },
  infoModalMainContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    width: '100%', paddingVertical: 10,
  },
  emotionDisplayArea: { alignItems: 'center', },
  infoModalEmotionIcon: {
    width: 80, height: 80, marginBottom: 10,
  },
  infoModalEmotionName: {
    fontSize: 18, color: '#444', fontWeight: '500', textAlign: 'center',
  },
  infoModalButtonArea: {
    width: '100%', alignItems: 'center', paddingTop: 15,
    flexDirection: 'column', gap: 10, flexShrink: 0,
  },
  infoModalButton: {
    backgroundColor: '#2196F3', paddingVertical: 10, borderRadius: 8,
    width: '90%', alignItems: 'center',
  },
  infoModalCloseButton: { backgroundColor: '#757575', },
  infoModalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
  chatHistoryContainer: {
    flex: 1, width: '100%', paddingHorizontal: 5,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee',
  },
  chatLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  chatLoadingText: { marginTop: 8, fontSize: 14, color: '#666', },
  emptyChatContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  emptyChatText: { fontSize: 15, color: '#888', },
  chatMessageOuterContainer: { flexDirection: 'row', marginVertical: 5, maxWidth: '100%', },
  chatBotRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', paddingRight: '15%', },
  chatUserRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', paddingLeft: '15%', },
  chatMessageBubble: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 1, maxWidth: '100%',
  },
  chatBotBubble: { backgroundColor: '#e5e5ea', borderTopLeftRadius: 0, alignSelf: 'flex-start', },
  chatUserBubble: { backgroundColor: '#dcf8c6', borderTopRightRadius: 0, alignSelf: 'flex-end', },
  chatMessageText: { fontSize: 15, color: '#000', lineHeight: 20, },
});

export default CalendarScreen;