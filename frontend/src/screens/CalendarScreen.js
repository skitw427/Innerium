// src/screens/CalendarScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';

// --- 한글 언어 설정 ---
LocaleConfig.locales['ko'] = { /* ... 이전과 동일 ... */
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: "오늘"
};
LocaleConfig.defaultLocale = 'ko';
// --- 한글 언어 설정 끝 ---

// --- 상수 정의 ---
const ESTIMATED_NAV_BAR_HEIGHT = 110;
const TOP_PADDING = 60;
const MARGIN_RATIO_5_WEEKS = 0.11; // 5주 달 비율
const MARGIN_RATIO_6_WEEKS = 0.08; // 6주 달 비율
const MIN_MARGIN = 0.001;
const MAX_MARGIN = 250;
const DAY_CELL_BASE_HEIGHT = 32; // <<< 날짜 숫자 영역의 기본 높이 >>>
const DAY_TEXT_FONT_SIZE = 16;   // <<< 날짜 텍스트 폰트 크기 (스타일과 일치) >>>

// --- Helper Function: 주 계산 ---
const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => { /* ... 이전과 동일 ... */
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
    const totalDays = lastOfMonth.getDate();
    const totalCells = firstDayWeekday + totalDays;
    const weeks = Math.ceil(totalCells / 7);
    return weeks;
};

// --- 사용자 정의 Day 컴포넌트 ---
// dayPaddingBottom prop 이름 변경 (의미 명확화)
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';
    const isSelected = state === 'selected';

    // 셀의 총 높이 계산
    const totalCellHeight = DAY_CELL_BASE_HEIGHT + dayPaddingBottom;

    const textStyle = [
        styles.dayText,
        isToday && styles.todayText,
        isSelected && styles.selectedText,
        isDisabled && styles.disabledText,
    ];

    // wrapper 스타일: 계산된 높이 적용, paddingBottom 추가
    const wrapperStyle = [
        styles.dayWrapper, // 기본 정렬(flex-start, paddingTop) 포함
        {
            height: totalCellHeight, // <<< 계산된 전체 높이 적용 >>>
            paddingBottom: dayPaddingBottom, // <<< 숫자 아래 내부 패딩 적용 >>>
        },
        isSelected && styles.selectedWrapper(totalCellHeight), // <<< 선택 시 배경 원 크기 조절 위해 높이 전달 >>>
    ];

    const dotStyle = [
        styles.dot,
        // 점의 bottom 위치는 전체 높이와 상관없이 숫자 영역 기준으로 계산
        { bottom: DAY_CELL_BASE_HEIGHT * 0.15 }, // 예: 기본 높이의 15% 지점 (값 조절 가능)
        marking?.dotColor ? { backgroundColor: marking.dotColor } : {}
    ];

    return (
        // 이제 이 TouchableOpacity는 숫자 + 아래 패딩 영역 전체를 포함
        <TouchableOpacity
            style={wrapperStyle}
            onPress={() => !isDisabled && onPress(date)}
            onLongPress={() => !isDisabled && onLongPress(date)}
            activeOpacity={isDisabled ? 1 : 0.2}
            disabled={isDisabled}
        >
            {/* Text는 wrapper의 paddingTop에 의해 상단 영역에 위치 */}
            <Text style={textStyle}>
                {date.day}
            </Text>
            {marking?.marked && (
                <View style={dotStyle} />
            )}
        </TouchableOpacity>
    );
});

// --- Android LayoutAnimation 활성화 ---
if (Platform.OS === 'android') { /* ... 이전과 동일 ... */
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// --- CalendarScreen 컴포넌트 ---
const CalendarScreen = ({ navigation }) => {
  const screenTransition = useScreenTransition() || {};
  const isTransitioning = screenTransition.isTransitioning === true;
  const handleNavigate = screenTransition.handleNavigate || (() => {});

  const { width, height: windowHeight } = useWindowDimensions();
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // --- 캘린더 높이 계산 ---
  const availableHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
  const calendarHeight = Math.max(availableHeight - 20, 250);

  // --- 현재 월의 주(Week) 수 계산 ---
  const currentYear = currentCalendarDate.getFullYear();
  const currentMonth = currentCalendarDate.getMonth() + 1;
  const numberOfWeeks = getWeeksInMonthDisplay(currentYear, currentMonth);

  // --- 동적 Day Padding Bottom 계산 (이전 Margin 계산 로직 활용) ---
  const paddingRatio = numberOfWeeks === 6 ? MARGIN_RATIO_6_WEEKS : MARGIN_RATIO_5_WEEKS;
  // 주의: 이제 이 값은 셀 전체 높이가 아니라 '추가될 패딩' 값에 가까움
  //       calendarHeight 자체가 아니라, 각 행에 분배될 여유 공간으로 계산하는 것이 더 정확할 수 있음
  //       하지만 일단 비율 기반으로 유지
  let calculatedPadding = calendarHeight * paddingRatio;
  const dynamicDayPaddingBottom = Math.max(MIN_MARGIN, Math.min(calculatedPadding, MAX_MARGIN));


  // --- 이벤트 핸들러 ---
  const handleDayPress = (day) => { console.log('선택된 날짜:', day); };
  const handleDayLongPress = (day) => { console.log('길게 선택된 날짜:', day); };
  const handleMonthChange = useCallback((monthData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentCalendarDate(new Date(monthData.year, monthData.month - 1, 1));
  }, []);


  // --- 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        <View style={styles.calendarWrapper}>
          <Calendar
            style={{
               height: calendarHeight,
               backgroundColor: '#eef7ff',
            }}
            // dayComponent에 dynamicDayPaddingBottom 전달 (이름 변경됨)
            dayComponent={(dayProps) => (
              <CustomDayComponent {...dayProps} dayPaddingBottom={dynamicDayPaddingBottom} />
            )}
            onDayPress={handleDayPress}
            onDayLongPress={handleDayLongPress}
            onMonthChange={handleMonthChange}
            theme={{
              arrowColor: 'orange',
              calendarBackground: 'transparent',
            }}
          />
        </View>
        <NavigationBar
          onNavigate={(screen) => {
            if (typeof handleNavigate === 'function') {
              handleNavigate(navigation, screen);
            } else { console.error("handleNavigate is not a function"); }
          }}
          isTransitioning={isTransitioning}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  calendarWrapper: { width: '100%', paddingTop: TOP_PADDING },
  dayWrapper: {
    width: 32,
    // height는 동적으로 설정됨
    alignItems: 'center', // 가로 중앙 정렬
    // vvvvvv 세로 정렬 및 상단 패딩 조정 vvvvvv
    justifyContent: 'flex-start', // 내용을 위쪽으로 정렬
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, // 기본 높이 내에서 텍스트 세로 중앙 정렬 효과
    // ^^^^^^ 세로 정렬 및 상단 패딩 조정 ^^^^^^
    // marginBottom 제거
  },
  dayText: {
      fontSize: DAY_TEXT_FONT_SIZE, // 상수 사용
      color: '#2d4150'
  },
  todayText: { color: '#00adf5', fontWeight: 'bold' },
  // selectedWrapper는 함수 형태로 변경하여 동적 높이에 맞게 borderRadius 조절
  selectedWrapper: (cellHeight) => ({
    backgroundColor: '#00adf5',
    // 원 형태 유지를 위해 전체 높이의 절반을 borderRadius로 설정
    borderRadius: cellHeight / 2,
    // 중요: 선택 시 wrapper 크기가 커지므로 position absolute 사용
    position: 'absolute', // 다른 요소 위에 떠서 크기 변경 영향 최소화
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // 부모(TouchableOpacity)를 꽉 채우도록
    // 내부 컨텐츠(Text, Dot)는 부모의 정렬을 따름
    alignItems: 'center',
    justifyContent: 'flex-start', // dayWrapper와 동일하게
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2, // dayWrapper와 동일하게
  }),
  selectedText: { color: '#ffffff' },
  disabledText: { color: '#d9e1e8' },
  dot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#00adf5',
    position: 'absolute',
    // bottom 값은 고정된 숫자보다 기본 셀 높이 기준으로 설정하는 것이 더 안정적일 수 있음
    // bottom: 5, // 이전 값
    // 숫자가 위치한 영역(DAY_CELL_BASE_HEIGHT) 내의 아래쪽에 위치하도록 조정
    bottom: DAY_CELL_BASE_HEIGHT * 0.15, // 예: 기본 높이의 15% 지점 (조절 가능)
    alignSelf: 'center',
  },
});

export default CalendarScreen;