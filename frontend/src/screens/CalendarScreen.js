// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Image, // Image 컴포넌트 import
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';
import IMAGES from '../constants/images'; // 이미지 상수 import
import { getMonthlyRecords } from '../api/apiClient';

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
const ESTIMATED_NAV_BAR_HEIGHT = 110; // 네비게이션 바 추정 높이
const TOP_PADDING = 60; // 달력 상단 여백
const MARGIN_RATIO_5_WEEKS = 0.11; // 5주 표시 월의 날짜 하단 패딩 비율
const MARGIN_RATIO_6_WEEKS = 0.08; // 6주 표시 월의 날짜 하단 패딩 비율
const MIN_MARGIN = 5; // 최소 패딩 값 (음수 방지 및 기본값)
const MAX_MARGIN = 250; // 최대 패딩 값 (과도한 크기 방지)
const DAY_CELL_BASE_HEIGHT = 32; // 날짜 셀 기본 높이 (패딩 제외)
const DAY_TEXT_FONT_SIZE = 16; // 날짜 텍스트 크기
const TODAY_TEXT_COLOR = '#00adf5'; // '오늘' 날짜 텍스트 색상
const EMOTION_LOG_PREFIX = '@emotionLog_'; // 감정 로그 AsyncStorage 키 접두사

// --- Helper Functions ---
// 특정 년/월이 달력에서 몇 주를 차지하는지 계산
const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => {
    const firstOfMonth = new Date(year, month - 1, 1); // 해당 월의 1일
    const lastOfMonth = new Date(year, month, 0); // 해당 월의 마지막 날
    const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7; // 1일의 요일 (0: firstDayOfWeek ~ 6)
    const totalDays = lastOfMonth.getDate(); // 해당 월의 총 일수
    const totalCells = firstDayWeekday + totalDays; // 달력에 표시될 총 셀 수 (빈 칸 포함)
    const weeks = Math.ceil(totalCells / 7); // 주 수 계산
    return weeks;
};

// 년/월과 달력 높이를 기반으로 동적 하단 패딩 계산
const calculateDayPadding = (year, month, currentCalendarHeight) => {
    if (currentCalendarHeight <= 0) return MIN_MARGIN; // 유효하지 않은 높이면 최소 마진 반환
    const numberOfWeeks = getWeeksInMonthDisplay(year, month); // 해당 월의 주 수 계산
    // 주 수에 따라 다른 비율 적용
    const paddingRatio = numberOfWeeks === 6 ? MARGIN_RATIO_6_WEEKS : MARGIN_RATIO_5_WEEKS;
    const calculatedPadding = currentCalendarHeight * paddingRatio; // 비율에 따른 패딩 계산
    const MIN_EFFECTIVE_PADDING = 5; // 최소 유효 패딩값 (너무 작아지지 않도록)
    // 최소/최대 범위 내의 패딩 값 반환
    return Math.max(MIN_EFFECTIVE_PADDING, Math.min(calculatedPadding, MAX_MARGIN));
};

// 특정 년/월의 모든 날짜 문자열(YYYY-MM-DD) 배열 반환
const getDaysInMonth = (year, month) => {
  // 입력값 유효성 검사
  if (typeof year !== 'number' || isNaN(year) || typeof month !== 'number' || isNaN(month) || month < 1 || month > 12) {
      console.error('[getDaysInMonth] Invalid year or month provided:', year, month);
      return []; // 유효하지 않으면 빈 배열 반환
  }
  const date = new Date(year, month - 1, 1); // 해당 월 1일로 시작
  const days = [];
  // 월이 바뀌기 전까지 반복
  while (date.getMonth() === month - 1) {
    days.push(formatDateToYYYYMMDD(new Date(date))); // YYYY-MM-DD 형식으로 추가
    date.setDate(date.getDate() + 1); // 날짜 1일 증가
  }
  return days;
};


// --- 사용자 정의 Day 컴포넌트 ---
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isDisabled = state === 'disabled'; // 날짜 비활성화 여부 (다른 월 날짜 등)
    const isAppToday = marking?.isToday === true; // '오늘' 날짜 여부 (marking 객체에서 확인)
    const emotionKeyForDay = marking?.emotionKey; // 해당 날짜의 감정 키 (marking 객체에서 확인)

    // 감정 키에 해당하는 아이콘 소스 찾기
    const emotionIconSource = emotionKeyForDay && IMAGES.emotionIcon && IMAGES.emotionIcon[emotionKeyForDay]
                             ? IMAGES.emotionIcon[emotionKeyForDay]
                             : null;

    // 하단 패딩 값 유효성 검사 및 최소값 보장
    const validPadding = typeof dayPaddingBottom === 'number' && !isNaN(dayPaddingBottom) ? dayPaddingBottom : MIN_MARGIN;

    // 아이콘 크기 계산 (패딩 값에 비례, 최소 크기 10px)
    const calculatedIconSize = Math.max(10, validPadding * 0.4);

    // 날짜 텍스트 스타일 배열 (기본 + 상태별 스타일 + 커스텀 스타일)
    let textStyle = [ styles.dayText, isDisabled && styles.disabledText, isAppToday && styles.todayText, ];
    if (marking?.customStyles?.text) { textStyle.push(marking.customStyles.text); }

    // 날짜 셀 전체 래퍼 스타일 (기본 + 동적 패딩)
    let wrapperStyle = [ styles.dayWrapper, { paddingBottom: validPadding }, ];

    return (
        <TouchableOpacity
            style={wrapperStyle}
            onPress={() => !isDisabled && onPress(date)} // 비활성화 시 터치 이벤트 막음
            onLongPress={() => !isDisabled && onLongPress(date)} // 비활성화 시 터치 이벤트 막음
            activeOpacity={isDisabled ? 1 : 0.2} // 비활성화 시 터치 효과 없앰
            disabled={isDisabled} // 버튼 자체 비활성화
        >
            {/* 날짜 텍스트 */}
            <Text style={textStyle}> {date.day} </Text>

            {/* 감정 아이콘 (아이콘 소스가 있을 경우 렌더링) */}
            {emotionIconSource && (
              <Image
                source={emotionIconSource}
                style={[
                  styles.emotionIcon, // 기본 absolute 포지셔닝 스타일
                  {
                    width: calculatedIconSize,    // 계산된 너비
                    height: calculatedIconSize,   // 계산된 높이
                    // 아이콘 하단 위치 (패딩 값의 40% 지점)
                    bottom: validPadding * 0.4,
                  }
                ]}
                resizeMode="contain" // 이미지 비율 유지
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
  const [currentAppDateString, setCurrentAppDateString] = useState(null); // 앱 기준 '오늘' 날짜 (YYYY-MM-DD)
  const [calendarFocusDateString, setCalendarFocusDateString] = useState(null); // 달력이 현재 보여주는 월의 기준 날짜
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: null, month: null }); // 현재 달력 년/월 (패딩 계산용)
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [markedDates, setMarkedDates] = useState({}); // react-native-calendars 에 전달할 마킹 객체
  const screenTransition = useScreenTransition() || {}; // 화면 전환 훅 (NavigationBar 용)
  const isTransitioning = screenTransition.isTransitioning === true;
  const handleNavigate = screenTransition.handleNavigate || (() => {});
  const { width, height: windowHeight } = useWindowDimensions(); // 화면 크기 정보

  const isInitialCal = useRef(false);

  // 특정 월의 감정 마킹 정보 업데이트 함수
  const updateMarkingsForMonth = useCallback(async (year, month, appTodayDate) => {
    // 입력값 유효성 검사
    if (!year || !month || !appTodayDate) {
        console.warn("[CalendarScreen] updateMarkingsForMonth called with invalid args:", year, month, appTodayDate);
        return;
    }

    // setIsLoading(true); // 로딩 시작
    const daysInMonth = getDaysInMonth(year, month); // 해당 월의 모든 날짜 가져오기

    // getDaysInMonth 결과 유효성 검사
    if (!Array.isArray(daysInMonth)) {
      console.error('[CalendarScreen] getDaysInMonth did not return an array for', year, month);
      setMarkedDates({ [appTodayDate]: { isToday: true } }); // 최소한 오늘 날짜 마킹
      // setIsLoading(false);
      return;
    }
    if (daysInMonth.length === 0) { // 해당 월에 날짜가 없는 경우 (이론상 발생 어려움)
        console.warn("[CalendarScreen] No days found for month:", year, month);
        setMarkedDates({ [appTodayDate]: { isToday: true } });
        setIsLoading(false);
        return;
    }

    // AsyncStorage에서 가져올 키 목록 생성
    const keysToFetch = daysInMonth.map(day => `${EMOTION_LOG_PREFIX}${day}`);
    let newMarkedDates = {}; // 새로운 마킹 객체 초기화

    try {
      // AsyncStorage에서 해당 월의 모든 감정 로그 한 번에 가져오기
      const storedData = await AsyncStorage.multiGet(keysToFetch);

      // 가져온 데이터 처리
      if (Array.isArray(storedData)) {
          storedData.forEach(([key, value]) => { // key: @emotionLog_YYYY-MM-DD, value: emotionKey
            if (value !== null) { // 감정 로그가 있는 경우 (value = emotionKey)
              const dateString = key.replace(EMOTION_LOG_PREFIX, ''); // 날짜 문자열 추출
              // 기존 마킹 정보가 있으면 유지하고 emotionKey 추가, 없으면 새로 생성
              newMarkedDates[dateString] = {
                  ...newMarkedDates[dateString], // isToday 등 기존 정보 유지 위함
                  emotionKey: value,            // 감정 키 추가
              };
            }
          });
      } else {
          console.error('[CalendarScreen] AsyncStorage.multiGet did not return an array.');
      }

      // '오늘' 날짜에 isToday 플래그 추가 (다른 마킹 정보 덮어쓰지 않도록 마지막에)
      if (newMarkedDates[appTodayDate]) {
          newMarkedDates[appTodayDate].isToday = true;
      } else { // 오늘 날짜에 다른 마킹 정보가 없었으면 isToday만 설정
          newMarkedDates[appTodayDate] = { isToday: true };
      }

      // 최종 마킹 상태 업데이트
      setMarkedDates(newMarkedDates);

    } catch (error) {
      console.error("[CalendarScreen] Failed to update markings:", error);
      // 에러 발생 시 최소한 오늘 날짜는 표시
      setMarkedDates({ [appTodayDate]: { isToday: true } });
    } finally {
       // setIsLoading(false); // 로딩 종료
    }
  }, []); // 의존성 배열 비움 (함수 자체는 재생성되지 않음)

  // 화면 포커스 시 초기 데이터 로드
  useFocusEffect(
    useCallback(() => {
      let isActive = true; // 컴포넌트 언마운트 시 비동기 작업 중단 플래그
      const loadInitialData = async () => {
        if (!isActive) return;
        setIsLoading(true);
        try {
          const appDate = await getAppCurrentDate(); // 앱 기준 오늘 날짜 가져오기
          if (!isActive) return;

          const formattedAppDate = formatDateToYYYYMMDD(appDate);
          const initialYear = appDate.getFullYear();
          const initialMonth = appDate.getMonth() + 1;

          // 상태 초기화
          setCurrentAppDateString(formattedAppDate); // '오늘' 날짜 설정
          setCalendarFocusDateString(formattedAppDate); // 달력 초기 포커스 설정
          setCurrentYearMonth({ year: initialYear, month: initialMonth }); // 현재 년/월 설정

          if (!isInitialCal.current) {
            console.log("[CalendarScreen] 최초 동기화 시도:", initialYear, initialMonth);
            try {
              const response = await getMonthlyRecords(initialYear, initialMonth);
              // CalenderResDTO 형식의 응답 데이터 (response.data)
              const serverRecords = response.data?.monthly_records;

              if (Array.isArray(serverRecords)) {
                const recordsToStore = serverRecords.map(record => [
                  `${EMOTION_LOG_PREFIX}${record.record_date}`,
                  record.emotion_type.name // 감정 이름을 emotionKey로 사용
                ]);

                if (recordsToStore.length > 0) {
                  await AsyncStorage.multiSet(recordsToStore);
                  console.log("[CalendarScreen] API 데이터를 AsyncStorage에 저장 완료.");
                }
              } else {
                console.warn("[CalendarScreen] API 응답에 monthly_records가 없거나 형식이 올바르지 않습니다.");
              }
              // 성공적으로 동기화 완료 시 플래그 설정
              isInitialCal.current = true;

            } catch (apiError) {
              console.error("[CalendarScreen] API 호출 또는 데이터 저장 실패:", apiError);
              // API 실패 시에도 다음 단계 (로컬 데이터 로드)는 진행
            }
          }

          // 초기 월 마킹 정보 로드
          await updateMarkingsForMonth(initialYear, initialMonth, formattedAppDate);

        } catch (error) {
          console.error("[CalendarScreen] Failed to load initial app date:", error);
          // 에러 발생 시 시스템 오늘 날짜 기준으로 최소 설정
          if (isActive) {
            const today = new Date();
            const formattedToday = formatDateToYYYYMMDD(today);
            setCurrentAppDateString(formattedToday);
            setCalendarFocusDateString(formattedToday);
            setCurrentYearMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
            setMarkedDates({ [formattedToday]: { isToday: true } }); // 최소 마킹
            setIsLoading(false); // 로딩 종료
          } //finally {
            //if(isActive) setIsLoading(false); // 모든 작업 완료 후 로딩 종료
        //}
        }
        // updateMarkingsForMonth 내부에서 로딩 종료
      };
      loadInitialData();
      // 클린업 함수: 컴포넌트 언마운트 시 플래그 변경
      return () => { isActive = false; };
    }, [updateMarkingsForMonth]) // updateMarkingsForMonth가 변경되면 effect 재실행 (하지만 useCallback으로 감싸여 거의 변경되지 않음)
  );

  // 달력 월 변경 시 핸들러
  const handleMonthChange = useCallback((monthData) => {
    // 부드러운 레이아웃 전환 애니메이션 적용
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newYear = monthData.year;
    const newMonth = monthData.month;
    const newFocusDateString = monthData.dateString; // 변경된 월의 첫 날짜 (YYYY-MM-DD)

    console.log("Month changed to:", newFocusDateString); // 디버깅 로그

    // 현재 년/월 상태 업데이트 (패딩 계산용)
    setCurrentYearMonth({ year: newYear, month: newMonth });
    // 달력 포커스 날짜 업데이트 (이것이 실제 달력 표시 월을 변경)
    setCalendarFocusDateString(newFocusDateString);

    // 변경된 월의 마킹 정보 로드 (appTodayDate는 그대로 전달)
    if (currentAppDateString) {
      updateMarkingsForMonth(newYear, newMonth, currentAppDateString);
    } else {
        // currentAppDateString이 아직 설정되지 않은 극히 드문 경우 경고
        console.warn("[CalendarScreen] handleMonthChange: currentAppDateString is not set yet.");
    }
  }, [currentAppDateString, updateMarkingsForMonth]); // currentAppDateString 또는 updateMarkingsForMonth 변경 시 함수 재생성

  // 계산된 값 (Memoization)
  // 달력 영역의 실제 높이 계산
  const calendarHeight = useMemo(() => {
    const calculatedHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
    return Math.max(calculatedHeight, 250); // 최소 높이 보장
  }, [windowHeight]);

  // 현재 표시 월과 달력 높이에 따른 동적 하단 패딩 계산
  const dynamicDayPaddingBottom = useMemo(() => {
    if (currentYearMonth.year && currentYearMonth.month) {
        return calculateDayPadding(currentYearMonth.year, currentYearMonth.month, calendarHeight);
    }
    // 년/월 정보 없을 시 최소 마진 반환
    return MIN_MARGIN;
  }, [currentYearMonth, calendarHeight]);

  // 핸들러 함수
  const handleDayPress = (day) => { console.log('선택된 날짜:', day.dateString); };
  const handleDayLongPress = (day) => { /* console.log('길게 선택된 날짜:', day); */ };

  // 로딩 상태 화면
  if (isLoading || !calendarFocusDateString) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>달력 정보를 불러오는 중...</Text>
        </View>
        {/* 로딩 중에도 네비게이션 바는 표시 */}
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
        {/* 메인 컨텐츠 영역 */}
        <View style={[styles.mainContentContainer, { paddingHorizontal: width * 0.05 }]}>
          <View style={styles.calendarPositioningContainer}>
            {/* 달력 높이 고정 및 내부 스크롤 방지 */}
            <View style={{ height: calendarHeight, overflow: 'hidden' }}>
              <Calendar
                // key prop 제거 (불필요 및 성능 저하 유발)
                style={{ height: calendarHeight, backgroundColor: '#eef7ff' }} // 배경색 설정
                current={calendarFocusDateString} // 현재 표시할 월 기준 날짜 (상태값 사용)
                // 사용자 정의 Day 컴포넌트 사용
                dayComponent={(dayProps) => (
                  <CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} />
                )}
                onDayPress={handleDayPress}
                onDayLongPress={handleDayLongPress}
                onMonthChange={handleMonthChange} // 월 변경 시 콜백 연결
                markingType={'custom'} // dayComponent 사용 시 필수
                markedDates={markedDates} // 마킹 데이터 전달 (감정 키 포함)
                // 달력 테마 설정 (옵션)
                theme={{
                  arrowColor: 'orange', // 월 이동 화살표 색상
                  calendarBackground: 'transparent', // 달력 자체 배경 투명 처리
                  // 헤더 요일 텍스트 색상 변경 (예시)
                  'stylesheet.calendar.header': {
                    dayTextAtIndex0: { color: 'red' }, // 일요일
                    dayTextAtIndex6: { color: 'blue' }, // 토요일
                  },
                }}
              />
            </View>
          </View>
        </View>

        {/* 하단 네비게이션 바 */}
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
  safeArea: { flex: 1, backgroundColor: '#eef7ff' }, // 전체 화면 배경
  outerContainer: { flex: 1, justifyContent: 'space-between' }, // 메인 컨텐츠와 네비게이션 바 수직 배치
  mainContentContainer: { flex: 1, width: '100%' }, // 달력 포함 메인 영역
  calendarPositioningContainer: { width: '100%', paddingTop: TOP_PADDING }, // 달력 상단 여백 적용
  navigationBarPlacement: { width: '100%' }, // 네비게이션 바 위치 고정 (하단)
  dayWrapper: { // 날짜 셀 전체 영역 (TouchableOpacity)
    alignItems: 'center', // 내부 요소(텍스트, 아이콘) 수평 중앙 정렬
    justifyContent: 'flex-start', // 내부 요소 상단 정렬 (텍스트 위, 아이콘 아래 배치 위함)
    // height는 여기서 지정하지 않음 (패딩에 따라 유동적)
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, // 텍스트 상단 여백 (기본 높이 기준 중앙 정렬 효과)
    // paddingBottom은 CustomDayComponent prop으로 동적 적용됨
  },
  dayText: { // 날짜 숫자 텍스트
    fontSize: DAY_TEXT_FONT_SIZE,
    color: '#2d4150',
  },
  todayText: { // '오늘' 날짜 텍스트 스타일
    color: TODAY_TEXT_COLOR,
    fontWeight: 'bold',
  },
  disabledText: { color: '#d9e1e8' }, // 다른 월 날짜 텍스트 색상
  emotionIcon: { // 감정 아이콘 스타일
    position: 'absolute', // 다른 요소 위에 겹치도록 설정
    alignSelf: 'center',  // 부모(TouchableOpacity) 내에서 수평 중앙 정렬
    // width, height, bottom은 CustomDayComponent 내에서 인라인 스타일로 동적 적용
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' }, // 로딩 화면 컨테이너
  loadingText: { marginTop: 10, fontSize: 16, color: '#4a90e2' }, // 로딩 텍스트
});

export default CalendarScreen;