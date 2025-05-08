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

// --- 한글 언어 설정 (동일) ---
LocaleConfig.locales['ko'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: "오늘"
};
LocaleConfig.defaultLocale = 'ko';

// --- 상수 정의 (동일) ---
const ESTIMATED_NAV_BAR_HEIGHT = 110;
const TOP_PADDING = 60;
const MARGIN_RATIO_5_WEEKS = 0.11;
const MARGIN_RATIO_6_WEEKS = 0.08;
const MIN_MARGIN = 0.001;
const MAX_MARGIN = 250;
const DAY_CELL_BASE_HEIGHT = 32;
const DAY_TEXT_FONT_SIZE = 16;

// --- Helper Function: 주 계산 (동일) ---
const getWeeksInMonthDisplay = (year, month, firstDayOfWeek = 0) => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const firstDayWeekday = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
    const totalDays = lastOfMonth.getDate();
    const totalCells = firstDayWeekday + totalDays;
    const weeks = Math.ceil(totalCells / 7);
    return weeks;
};

// --- 사용자 정의 Day 컴포넌트 (동일) ---
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';
    const isSelected = state === 'selected';
    const totalCellHeight = DAY_CELL_BASE_HEIGHT + dayPaddingBottom;
    const textStyle = [ styles.dayText, isToday && styles.todayText, isSelected && styles.selectedText, isDisabled && styles.disabledText, ];
    const wrapperStyle = [ styles.dayWrapper, { height: totalCellHeight, paddingBottom: dayPaddingBottom, }, isSelected && styles.selectedWrapper(totalCellHeight), ];
    const dotStyle = [ styles.dot, { bottom: DAY_CELL_BASE_HEIGHT * 0.15 }, marking?.dotColor ? { backgroundColor: marking.dotColor } : {} ];

    return (
        <TouchableOpacity style={wrapperStyle} onPress={() => !isDisabled && onPress(date)} onLongPress={() => !isDisabled && onLongPress(date)} activeOpacity={isDisabled ? 1 : 0.2} disabled={isDisabled} >
            <Text style={textStyle}> {date.day} </Text>
            {marking?.marked && (<View style={dotStyle} />)}
        </TouchableOpacity>
    );
});

// --- Android LayoutAnimation 활성화 (동일) ---
if (Platform.OS === 'android') {
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

  // unmountOnBlur:true에 의해 화면이 재마운트될 때 이 초기값이 적용됩니다.
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  // console.log('CalendarScreen: currentCalendarDate state initialized or updated to:', currentCalendarDate.toISOString());

  useEffect(() => {
    console.log(`CalendarScreen MOUNTED. Initial currentCalendarDate: ${currentCalendarDate.toISOString().split('T')[0]}`);
    return () => {
      console.log('CalendarScreen UNMOUNTED');
    };
  }, []);

  const availableHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
  const calendarHeight = Math.max(availableHeight - 20, 250);
  const yearForDisplay = currentCalendarDate.getFullYear();
  const monthForDisplay = currentCalendarDate.getMonth() + 1;
  const numberOfWeeks = getWeeksInMonthDisplay(yearForDisplay, monthForDisplay);
  const paddingRatio = numberOfWeeks === 6 ? MARGIN_RATIO_6_WEEKS : MARGIN_RATIO_5_WEEKS;
  let calculatedPadding = calendarHeight * paddingRatio;
  const dynamicDayPaddingBottom = Math.max(MIN_MARGIN, Math.min(calculatedPadding, MAX_MARGIN));

  const handleDayPress = (day) => {
    console.log('선택된 날짜:', day);
  };

  const handleDayLongPress = (day) => {
    console.log('길게 선택된 날짜:', day);
  };

  const handleMonthChange = useCallback((monthData) => {
    console.log('Calendar: onMonthChange triggered. New month data:', monthData);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newDate = new Date(monthData.year, monthData.month - 1, 1);
    setCurrentCalendarDate(newDate); // 이 상태 업데이트는 달력 내부의 월 이동을 반영합니다.
    console.log('CalendarScreen: currentCalendarDate state updated by onMonthChange to:', newDate.toISOString());
  }, []);

  // current prop에 전달할 날짜 문자열 (YYYY-MM-DD 형식)
  // 이 값은 currentCalendarDate 상태에 따라 변경됩니다.
  const currentDateString = currentCalendarDate.toISOString().split('T')[0];
  // console.log(`CalendarScreen rendering. current prop for Calendar: ${currentDateString}`);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        <View style={styles.calendarWrapper}>
          <Calendar
            style={{
               height: calendarHeight,
               backgroundColor: '#eef7ff',
            }}
            // ★★★ key prop 제거 ★★★
            // current prop만 사용하여 달력에 현재 표시할 날짜를 명시적으로 전달합니다.
            // unmountOnBlur:true로 화면이 재마운트되면, currentCalendarDate가 오늘 날짜로 초기화되고,
            // 이 current prop도 그에 맞게 설정되어 달력이 오늘 달을 보여줍니다.
            // 사용자가 달력 내에서 월을 변경하면 onMonthChange가 currentCalendarDate를 업데이트하고,
            // 이 변경된 currentCalendarDate가 current prop을 통해 달력에 반영됩니다.
            current={currentDateString}
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
            } else {
              console.error("handleNavigate is not a function in CalendarScreen");
            }
          }}
          isTransitioning={isTransitioning}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

// --- 스타일 정의 (동일) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  calendarWrapper: { width: '100%', paddingTop: TOP_PADDING },
  dayWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2,
  },
  dayText: {
      fontSize: DAY_TEXT_FONT_SIZE,
      color: '#2d4150'
  },
  todayText: { color: '#00adf5', fontWeight: 'bold' },
  selectedWrapper: (cellHeight) => ({
    backgroundColor: '#00adf5',
    borderRadius: cellHeight / 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: (DAY_CELL_BASE_HEIGHT - DAY_TEXT_FONT_SIZE) / 2,
  }),
  selectedText: { color: '#ffffff' },
  disabledText: { color: '#d9e1e8' },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00adf5',
    position: 'absolute',
    bottom: DAY_CELL_BASE_HEIGHT * 0.15,
    alignSelf: 'center',
  },
});

export default CalendarScreen;