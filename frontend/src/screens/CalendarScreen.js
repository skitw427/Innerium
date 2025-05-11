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
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';

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
const DAY_CELL_BASE_HEIGHT = 32; // 이 값은 이제 텍스트를 담는 영역의 최소 높이 정도로 해석
const DAY_TEXT_FONT_SIZE = 16;
const TODAY_TEXT_COLOR = '#00adf5'; // "오늘" 날짜 텍스트 색상 (기존 todayText 색상)

// --- Helper Function: 주 계산 ---
const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
    const totalDays = lastOfMonth.getDate();
    const totalCells = firstDayWeekday + totalDays;
    const weeks = Math.ceil(totalCells / 7);
    return weeks;
};

// --- Helper Function: 날짜 셀 하단 패딩 계산 ---
const calculateDayPadding = (year, month, currentCalendarHeight) => {
    if (currentCalendarHeight <= 0) return MIN_MARGIN;
    const numberOfWeeks = getWeeksInMonthDisplay(year, month);
    const paddingRatio = numberOfWeeks === 6 ? MARGIN_RATIO_6_WEEKS : MARGIN_RATIO_5_WEEKS;
    const calculatedPadding = currentCalendarHeight * paddingRatio;
    return Math.max(MIN_MARGIN, Math.min(calculatedPadding, MAX_MARGIN));
};

// --- 사용자 정의 Day 컴포넌트 (수정됨) ---
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isDisabled = state === 'disabled';
    // '오늘' 표시는 marking.isToday 플래그와 customStyles.text를 통해 제어
    const isAppToday = marking?.isToday === true; // 앱 기준 "오늘"인지 여부

    const validPadding = typeof dayPaddingBottom === 'number' && !isNaN(dayPaddingBottom) ? dayPaddingBottom : MIN_MARGIN;
    // 전체 셀 높이는 텍스트 영역 + 동적 패딩. dayWrapper에 직접 height를 주지 않고, 내부 Text와 paddingBottom으로 높이 결정
    // const totalCellHeight = DAY_CELL_BASE_HEIGHT + validPadding; // 이 방식 대신 flex-start 와 paddingBottom 활용

    let textStyle = [
        styles.dayText, // 기본 텍스트 스타일
        isDisabled && styles.disabledText,
        isAppToday && styles.todayText, // 앱 기준 "오늘"이면 todayText 스타일 적용
    ];

    // customStyles.text가 있으면 isAppToday 스타일 위에 덮어씀 (혹은 병합)
    if (marking?.customStyles?.text) {
        textStyle.push(marking.customStyles.text);
    }

    // wrapperStyle은 패딩과 정렬을 담당
    // DAY_CELL_BASE_HEIGHT를 width로 사용하던 부분을 제거하고, 텍스트 크기에 맞춰 자연스럽게 너비가 잡히도록 함
    // 또는, 기존처럼 고정 너비를 원하면 styles.dayWrapper에 width: DAY_CELL_BASE_HEIGHT 추가
    let wrapperStyle = [
        styles.dayWrapper, // 기본 wrapper 스타일 (paddingTop, alignItems, justifyContent 등)
        { paddingBottom: validPadding }, // 동적 패딩 적용
        // height: totalCellHeight, // 직접 height 지정 대신 내부 컨텐츠와 패딩으로 높이 결정
    ];

    // 선택된 날짜에 대한 배경 스타일 (텍스트 색상 변경이 아니라 배경을 원할 경우)
    // 현재 요구사항은 텍스트 색상 변경이므로, 이 부분은 필요 없을 수 있음
    if (state === 'selected' && !isAppToday && marking?.selectedColor) { // 오늘이 아닌 날짜가 선택된 경우
        // wrapperStyle.push({ backgroundColor: marking.selectedColor, borderRadius: DAY_CELL_BASE_HEIGHT / 4 }); // 예시: 약간 둥근 배경
        // textStyle.push({ color: 'white' }); // 선택 시 텍스트 색상 변경
    }
    // 만약 markingType='custom'이고, selected 상태를 customStyles로 제어한다면,
    // customStyles.container를 wrapperStyle에 적용할 수 있음.
    // 하지만 여기서는 "오늘" 표시에만 customStyles.text를 사용하고, 선택은 라이브러리 기본 동작에 맡기거나 다른 방식으로 처리.


    // 점 스타일: paddingBottom을 고려하여 위치 조정
    const dotStyle = [
        styles.dot,
        { bottom: validPadding * 0.3 + DAY_TEXT_FONT_SIZE * 0.1 }, // 패딩과 폰트 크기에 비례하여 점 위치 조정
        marking?.dotColor ? { backgroundColor: marking.dotColor } : {}
    ];


    return (
        <TouchableOpacity
            style={wrapperStyle}
            onPress={() => !isDisabled && onPress(date)}
            onLongPress={() => !isDisabled && onLongPress(date)}
            activeOpacity={isDisabled ? 1 : 0.2}
            disabled={isDisabled}
        >
            <Text style={textStyle}> {date.day} </Text>
            {/* "오늘"로 표시된 날짜에는 점을 표시하지 않거나, 다른 스타일의 점을 표시할 수 있음 */}
            {marking?.marked && !isAppToday && (<View style={dotStyle} />)}
        </TouchableOpacity>
    );
});

// --- Android LayoutAnimation 활성화 ---
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const CalendarScreen = ({ navigation }) => {
  const screenTransition = useScreenTransition() || {};
  const isTransitioning = screenTransition.isTransitioning === true;
  const handleNavigate = screenTransition.handleNavigate || (() => {});

  const { width, height: windowHeight } = useWindowDimensions();

  const [targetMonthString, setTargetMonthString] = useState(null);
  const [yearForPadding, setYearForPadding] = useState(new Date().getFullYear());
  const [monthForPadding, setMonthForPadding] = useState(new Date().getMonth() + 1);
  const [isLoadingDate, setIsLoadingDate] = useState(true);
  const [markedDates, setMarkedDates] = useState({});

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      // console.log('[CalendarScreen] Focus effect triggered.');

      const loadCurrentAppDate = async () => {
        if (!isActive) return;
        setIsLoadingDate(true);
        try {
          const appDate = await getAppCurrentDate();
          if (isActive) {
            const formattedAppDate = formatDateToYYYYMMDD(appDate);
            // console.log(`[CalendarScreen] App Date Loaded: ${appDate.toString()}, Formatted: ${formattedAppDate}`);

            setTargetMonthString(formattedAppDate);
            setYearForPadding(appDate.getFullYear());
            setMonthForPadding(appDate.getMonth() + 1);

            // "오늘" 날짜에 대한 마킹 설정: 텍스트 색상 변경용
            const newMarkedDates = {
              [formattedAppDate]: { // 앱의 현재 날짜에 마킹
                isToday: true, // CustomDayComponent에서 이 플래그 사용
                // customStyles는 필요 시 추가적인 스타일 (예: 폰트 굵기)을 위해 사용할 수 있음
                // customStyles: {
                //   text: {
                //     fontWeight: 'bold', // 예: "오늘" 날짜 텍스트 굵게
                //     // color: TODAY_TEXT_COLOR, // isToday 플래그와 todayText 스타일로 처리
                //   },
                //   // container 스타일은 사용하지 않음 (원형 배경 X)
                // },
                // 다른 마킹 속성 (예: dotColor, marked 등)은 여기서 개별적으로 설정 가능
                // marked: true, // 점을 표시하고 싶다면
                // dotColor: 'red',
              },
              // 다른 이벤트 날짜 마킹은 여기에 추가
            };
            // console.log('[CalendarScreen] New markedDates:', JSON.stringify(newMarkedDates));
            setMarkedDates(newMarkedDates);
          }
        } catch (error) {
          console.error("[CalendarScreen] Failed to load app current date:", error);
          if (isActive) {
            const today = new Date();
            const formattedToday = formatDateToYYYYMMDD(today);
            setTargetMonthString(formattedToday);
            setYearForPadding(today.getFullYear());
            setMonthForPadding(today.getMonth() + 1);
            setMarkedDates({
              [formattedToday]: {
                isToday: true,
              },
            });
          }
        } finally {
          if (isActive) {
            setIsLoadingDate(false);
            // console.log('[CalendarScreen] Date loading finished.');
          }
        }
      };

      loadCurrentAppDate();

      return () => {
        isActive = false;
        // console.log('[CalendarScreen] Unfocus or unmount.');
      };
    }, [])
  );

  const calendarHeight = useMemo(() => {
    const calculatedHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
    return Math.max(calculatedHeight, 250);
  }, [windowHeight]);

  const dynamicDayPaddingBottom = useMemo(() => {
    return calculateDayPadding(yearForPadding, monthForPadding, calendarHeight);
  }, [yearForPadding, monthForPadding, calendarHeight]);

  const handleDayPress = (day) => {
    console.log('선택된 날짜:', day.dateString);
    // 선택된 날짜 마킹 로직 (예시)
    // const currentAppToday = targetMonthString;
    // let newMarked = { ...markedDates };

    // // 이전 선택 해제 (오늘이 아니고, selected 플래그가 있다면)
    // Object.keys(newMarked).forEach(dateStr => {
    //   if (dateStr !== currentAppToday && newMarked[dateStr]?.selected) {
    //     // newMarked[dateStr] = { ...newMarked[dateStr], selected: false, selectedColor: undefined };
    //     // 혹은, 선택 관련 customStyles를 제거
    //      const {selected, selectedColor, ...rest} = newMarked[dateStr];
    //      newMarked[dateStr] = rest;
    //      if (Object.keys(newMarked[dateStr]).length === 0) delete newMarked[dateStr];
    //   }
    // });

    // // 새 선택 마킹 (오늘이 아니라면)
    // if (day.dateString !== currentAppToday) {
    //   newMarked[day.dateString] = {
    //     ...(newMarked[day.dateString] || {}),
    //     selected: true,
    //     selectedColor: 'green', // 라이브러리 기본 선택 색상
    //     // 또는 customStyles로 선택 표시
    //     // customStyles: { text: { fontWeight: 'bold', color: 'green' } }
    //   };
    // }
    // setMarkedDates(newMarked);
  };

  const handleDayLongPress = (day) => { /* console.log('길게 선택된 날짜:', day); */ };

  const handleMonthChange = useCallback((monthData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setYearForPadding(monthData.year);
    setMonthForPadding(monthData.month);
    // console.log('[CalendarScreen] Month changed by user:', monthData.dateString);
  }, []);

  if (isLoadingDate || !targetMonthString) {
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
                key={targetMonthString} // targetMonthString 변경 시 Calendar 강제 리렌더
                style={{ height: calendarHeight, backgroundColor: '#eef7ff' }}
                current={targetMonthString}
                dayComponent={(dayProps) => (
                  <CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} />
                )}
                onDayPress={handleDayPress}
                onDayLongPress={handleDayLongPress}
                onMonthChange={handleMonthChange}
                // markingType을 'custom'으로 설정하면 markedDates의 customStyles를 사용할 수 있습니다.
                // 텍스트 색상만 변경하는 경우, customStyles.text를 활용할 수 있으므로 'custom'이 유용할 수 있습니다.
                // 또는, 'multi-dot'이나 다른 타입을 사용하고 isToday 플래그만으로 CustomDayComponent에서 처리해도 됩니다.
                // 여기서는 isToday 플래그를 주로 사용하고, 필요시 customStyles.text를 더하기 위해 'custom' 사용.
                markingType={'custom'}
                markedDates={markedDates}
                theme={{
                  arrowColor: 'orange',
                  calendarBackground: 'transparent',
                  'stylesheet.calendar.header': {
                    dayTextAtIndex0: { color: 'red' },
                    dayTextAtIndex6: { color: 'blue' },
                  },
                  // todayTextColor: TODAY_TEXT_COLOR, // Calendar 자체의 today 표시. CustomDayComponent 사용 시 이것보다 CustomDayComponent 내부 로직이 우선.
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1, justifyContent: 'space-between' },
  mainContentContainer: { flex: 1, width: '100%' },
  calendarPositioningContainer: { width: '100%', paddingTop: TOP_PADDING },
  navigationBarPlacement: { width: '100%' },

  dayWrapper: { // 날짜 셀의 TouchableOpacity 스타일
    // width: DAY_CELL_BASE_HEIGHT, // 고정 너비 사용 시 (텍스트가 중앙 정렬되도록)
    // height: DAY_CELL_BASE_HEIGHT, // 이 부분은 dynamicDayPaddingBottom으로 인해 전체 셀 높이가 결정되므로, 직접 height 고정은 주의.
                                    // 텍스트 컨텐츠를 위한 최소 높이 정도로 해석할 수 있음.
    alignItems: 'center', // 내부 Text를 수평 중앙 정렬
    justifyContent: 'flex-start', // Text를 상단에 배치 (paddingBottom으로 공간 확보)
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, // 텍스트 수직 정렬을 위한 상단 패딩 (기존 방식 유지)
                                                                 // DAY_CELL_BASE_HEIGHT를 기준 높이로 사용
  },
  dayText: { // 기본 날짜 텍스트 스타일
    fontSize: DAY_TEXT_FONT_SIZE,
    color: '#2d4150',
  },
  todayText: { // "오늘" 날짜 텍스트에 적용될 스타일 (isToday 플래그에 의해 적용)
    color: TODAY_TEXT_COLOR, // 지정된 "오늘" 텍스트 색상
    fontWeight: 'bold', // "오늘" 날짜 텍스트 굵게
  },
  // selectedWrapper, selectedText는 CustomDayComponent에서 직접 처리하거나 라이브러리 기본값 사용
  // selectedWrapper: (cellHeight) => ({...}),
  // selectedText: { ... },
  disabledText: { color: '#d9e1e8' },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TODAY_TEXT_COLOR, // 점 색상 (오늘 텍스트 색상과 동일하게 하거나 다르게 설정)
    position: 'absolute', // wrapper 내 절대 위치
    alignSelf: 'center', // 수평 중앙
    // bottom 위치는 CustomDayComponent 내부에서 동적으로 계산
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef7ff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4a90e2' },
});

export default CalendarScreen;