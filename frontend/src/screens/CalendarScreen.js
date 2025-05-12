// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  SafeAreaView,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import IMAGES from '../constants/images';

// --- 한글 언어 설정 ---
LocaleConfig.locales['ko'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: "오늘"
};
LocaleConfig.defaultLocale = 'ko';

// --- 상수 정의 ---
const ESTIMATED_NAV_BAR_HEIGHT = 110;
const TOP_PADDING = 60;
const MARGIN_RATIO_5_WEEKS = 0.11;
const MARGIN_RATIO_6_WEEKS = 0.08;
const MIN_MARGIN = 0.001;
const MAX_MARGIN = 250;
const DAY_CELL_BASE_HEIGHT = 32;
const DAY_TEXT_FONT_SIZE = 16;
const TODAY_TEXT_COLOR = '#00adf5';
const EMOTION_LOG_PREFIX = '@emotionLog_';

// --- Helper Functions ---
const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
    const totalDays = lastOfMonth.getDate();
    const totalCells = firstDayWeekday + totalDays;
    const weeks = Math.ceil(totalCells / 7);
    return weeks;
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
  // year와 month가 유효한 숫자인지 확인
  if (typeof year !== 'number' || isNaN(year) || typeof month !== 'number' || isNaN(month) || month < 1 || month > 12) {
      console.error('[getDaysInMonth] Invalid year or month provided:', year, month);
      return []; // 유효하지 않으면 빈 배열 반환
  }
  const date = new Date(year, month - 1, 1);
  const days = [];
  while (date.getMonth() === month - 1) {
    days.push(formatDateToYYYYMMDD(new Date(date)));
    date.setDate(date.getDate() + 1);
  }
  return days;
};


// --- 사용자 정의 Day 컴포넌트 ---
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isDisabled = state === 'disabled';
    const isAppToday = marking?.isToday === true;
    const emotionKeyForDay = marking?.emotionKey;

    const emotionIconSource = (isAppToday && emotionKeyForDay && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKeyForDay])
                             ? IMAGES.emotionIcon[emotionKeyForDay]
                             : null;
    const emotionIconSourceForOtherDays = (!isAppToday && emotionKeyForDay && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKeyForDay])
                                     ? IMAGES.emotionIcon[emotionKeyForDay]
                                     : null;

    const validPadding = typeof dayPaddingBottom === 'number' && !isNaN(dayPaddingBottom) ? dayPaddingBottom : MIN_MARGIN;
    const calculatedIconSize = Math.max(10, validPadding * 0.4); // 아이콘 크기 (이전 요청대로 0.4 유지)

    let textStyle = [ styles.dayText, isDisabled && styles.disabledText, isAppToday && styles.todayText, ];
    if (marking?.customStyles?.text) { textStyle.push(marking.customStyles.text); }
    let wrapperStyle = [ styles.dayWrapper, { paddingBottom: validPadding }, ];
    const dotStyle = [ styles.dot, { bottom: validPadding * 0.3 + DAY_TEXT_FONT_SIZE * 0.1 }, marking?.dotColor ? { backgroundColor: marking.dotColor } : {} ];

    return (
        <TouchableOpacity
            style={wrapperStyle}
            onPress={() => !isDisabled && onPress(date)}
            onLongPress={() => !isDisabled && onLongPress(date)}
            activeOpacity={isDisabled ? 1 : 0.2}
            disabled={isDisabled}
        >
            <Text style={textStyle}> {date.day} </Text>
            {marking?.marked && !isAppToday && (<View style={dotStyle} />)}

            {(emotionIconSource || emotionIconSourceForOtherDays) && (
              <Image
                source={emotionIconSource || emotionIconSourceForOtherDays}
                style={[
                  styles.emotionIcon,
                  {
                    width: calculatedIconSize,
                    height: calculatedIconSize,
                    bottom: validPadding * 0.4, // 아이콘 위치 (이전 요청대로 0.4 유지)
                  }
                ]}
                resizeMode="contain"
              />
            )}
        </TouchableOpacity>
    );
});

// --- Android LayoutAnimation 활성화 ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CalendarScreen 컴포넌트 ---
const CalendarScreen = ({ navigation }) => {
  // State 정의
  const [currentAppDateString, setCurrentAppDateString] = useState(null);
  const [calendarFocusDateString, setCalendarFocusDateString] = useState(null);
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: null, month: null });
  const [isLoading, setIsLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const screenTransition = useScreenTransition() || {};
  const isTransitioning = screenTransition.isTransitioning === true;
  const handleNavigate = screenTransition.handleNavigate || (() => {});
  const { width, height: windowHeight } = useWindowDimensions();

  // 감정 마킹 업데이트 함수
  const updateMarkingsForMonth = useCallback(async (year, month, appTodayDate) => {
    if (!year || !month || !appTodayDate) {
        console.warn("[CalendarScreen] updateMarkingsForMonth called with invalid args:", year, month, appTodayDate);
        return; // 필수 값 없으면 중단
    }

    setIsLoading(true);
    const daysInMonth = getDaysInMonth(year, month);

    // --- ★★★ 방어 코드: daysInMonth가 배열인지 확인 ★★★ ---
    if (!Array.isArray(daysInMonth)) {
      console.error('[CalendarScreen] getDaysInMonth did not return an array for', year, month);
      setMarkedDates({ [appTodayDate]: { isToday: true } }); // 최소 마킹
      setIsLoading(false);
      return; // 함수 중단
    }
    // --- ★★★ ---

    // keysToFetch 생성 전에 daysInMonth가 비어있는지 확인 (선택적이지만 안전)
    if (daysInMonth.length === 0) {
        console.warn("[CalendarScreen] No days found for month:", year, month);
        setMarkedDates({ [appTodayDate]: { isToday: true } }); // 최소 마킹
        setIsLoading(false);
        return;
    }

    const keysToFetch = daysInMonth.map(day => `${EMOTION_LOG_PREFIX}${day}`);
    let newMarkedDates = {};

    try {
      // 1. 오늘 날짜 기본 마킹
      newMarkedDates[appTodayDate] = { isToday: true };

      // 2. 해당 월의 모든 감정 로그 가져오기
      const storedData = await AsyncStorage.multiGet(keysToFetch);

      // 3. 가져온 데이터로 마킹 객체 구성
      if (Array.isArray(storedData)) {
          storedData.forEach(([key, value]) => {
            if (value !== null) { // 감정 로그가 있는 경우
              const dateString = key.replace(EMOTION_LOG_PREFIX, '');
              if (newMarkedDates[dateString]) {
                 newMarkedDates[dateString].emotionKey = value;
              } else {
                 newMarkedDates[dateString] = { emotionKey: value };
              }
            }
          });
      } else {
          console.error('[CalendarScreen] AsyncStorage.multiGet did not return an array.');
      }

      setMarkedDates(newMarkedDates);

    } catch (error) {
      console.error("[CalendarScreen] Failed to update markings:", error);
      setMarkedDates({ [appTodayDate]: { isToday: true } }); // 에러 시 최소 마킹
    } finally {
       setIsLoading(false);
    }
  }, []); // 의존성 배열 비움

  // 화면 포커스 시 초기 데이터 로드
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
            setIsLoading(false);
          }
        }
        // updateMarkingsForMonth 내부에서 로딩 종료하므로 여기서 별도 호출 불필요
      };
      loadInitialData();
      return () => { isActive = false; };
    }, [updateMarkingsForMonth])
  );

  // 월 변경 시 마킹 업데이트
  const handleMonthChange = useCallback((monthData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newYear = monthData.year;
    const newMonth = monthData.month;
    setCurrentYearMonth({ year: newYear, month: newMonth });

    // 월 변경 시에도 앱의 '오늘' 날짜(currentAppDateString)는 유지하며 마킹 업데이트
    if (currentAppDateString) {
      updateMarkingsForMonth(newYear, newMonth, currentAppDateString);
    } else {
        console.warn("[CalendarScreen] handleMonthChange: currentAppDateString is not set yet.");
    }
  }, [currentAppDateString, updateMarkingsForMonth]);

  // 계산된 값들
  const calendarHeight = useMemo(() => {
    const calculatedHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
    return Math.max(calculatedHeight, 250);
  }, [windowHeight]);

  const dynamicDayPaddingBottom = useMemo(() => {
    if (currentYearMonth.year && currentYearMonth.month) {
        return calculateDayPadding(currentYearMonth.year, currentYearMonth.month, calendarHeight);
    }
    return MIN_MARGIN;
  }, [currentYearMonth, calendarHeight]);

  // 핸들러 함수
  const handleDayPress = (day) => { console.log('선택된 날짜:', day.dateString); };
  const handleDayLongPress = (day) => { /* console.log('길게 선택된 날짜:', day); */ };

  // 로딩 화면
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

  // 캘린더 렌더링
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <View style={[styles.mainContentContainer, { paddingHorizontal: width * 0.05 }]}>
          <View style={styles.calendarPositioningContainer}>
            <View style={{ height: calendarHeight, overflow: 'hidden' }}>
              <Calendar
                key={calendarFocusDateString}
                style={{ height: calendarHeight, backgroundColor: '#eef7ff' }}
                current={calendarFocusDateString}
                dayComponent={(dayProps) => (
                  <CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} />
                )}
                onDayPress={handleDayPress}
                onDayLongPress={handleDayLongPress}
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
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1, justifyContent: 'space-between' },
  mainContentContainer: { flex: 1, width: '100%' },
  calendarPositioningContainer: { width: '100%', paddingTop: TOP_PADDING },
  navigationBarPlacement: { width: '100%' },
  dayWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2,
  },
  dayText: {
    fontSize: DAY_TEXT_FONT_SIZE,
    color: '#2d4150',
  },
  todayText: {
    color: TODAY_TEXT_COLOR,
    fontWeight: 'bold',
  },
  disabledText: { color: '#d9e1e8' },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TODAY_TEXT_COLOR,
    position: 'absolute',
    alignSelf: 'center',
  },
  emotionIcon: {
    position: 'absolute',
    alignSelf: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4a90e2' },
});

export default CalendarScreen;