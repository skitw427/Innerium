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
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';

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
const ESTIMATED_NAV_BAR_HEIGHT = 110; // 실제 NavigationBar 높이에 따라 조절
const TOP_PADDING = 60;
const MARGIN_RATIO_5_WEEKS = 0.11;
const MARGIN_RATIO_6_WEEKS = 0.08;
const MIN_MARGIN = 0.001;
const MAX_MARGIN = 250;
const DAY_CELL_BASE_HEIGHT = 32;
const DAY_TEXT_FONT_SIZE = 16;

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

// --- 사용자 정의 Day 컴포넌트 ---
const CustomDayComponent = React.memo(({ date, state, marking, onPress, onLongPress, dayPaddingBottom }) => {
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';
    const isSelected = state === 'selected';
    const validPadding = typeof dayPaddingBottom === 'number' && !isNaN(dayPaddingBottom) ? dayPaddingBottom : MIN_MARGIN;
    const totalCellHeight = DAY_CELL_BASE_HEIGHT + validPadding;
    const textStyle = [ styles.dayText, isToday && styles.todayText, isSelected && styles.selectedText, isDisabled && styles.disabledText, ];
    const wrapperStyle = [ styles.dayWrapper, { height: totalCellHeight, paddingBottom: validPadding, }, isSelected && styles.selectedWrapper(totalCellHeight), ];
    const dotStyle = [ styles.dot, { bottom: DAY_CELL_BASE_HEIGHT * 0.15 }, marking?.dotColor ? { backgroundColor: marking.dotColor } : {} ];

    return (
        <TouchableOpacity style={wrapperStyle} onPress={() => !isDisabled && onPress(date)} onLongPress={() => !isDisabled && onLongPress(date)} activeOpacity={isDisabled ? 1 : 0.2} disabled={isDisabled} >
            <Text style={textStyle}> {date.day} </Text>
            {marking?.marked && (<View style={dotStyle} />)}
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

  const [targetMonthString, setTargetMonthString] = useState(new Date().toISOString().split('T')[0]);
  const initialDateForPadding = new Date(targetMonthString);
  const [yearForPadding, setYearForPadding] = useState(initialDateForPadding.getFullYear());
  const [monthForPadding, setMonthForPadding] = useState(initialDateForPadding.getMonth() + 1);

  useEffect(() => {
    // console.log(`CalendarScreen MOUNTED. Initial targetMonthString: ${targetMonthString}`);
    // return () => { console.log('CalendarScreen UNMOUNTED'); };
  }, []);

  const calendarHeight = useMemo(() => {
    const calculatedHeight = windowHeight - TOP_PADDING - ESTIMATED_NAV_BAR_HEIGHT;
    return Math.max(calculatedHeight, 250);
  }, [windowHeight]);

  const dynamicDayPaddingBottom = useMemo(() => {
    return calculateDayPadding(yearForPadding, monthForPadding, calendarHeight);
  }, [yearForPadding, monthForPadding, calendarHeight]);

  const handleDayPress = (day) => { /* console.log('선택된 날짜:', day); */ };
  const handleDayLongPress = (day) => { /* console.log('길게 선택된 날짜:', day); */ };

  const handleMonthChange = useCallback((monthData) => {
    const { year, month, dateString } = monthData;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setYearForPadding(year);
    setMonthForPadding(month);
    setTargetMonthString(dateString);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <View style={[styles.mainContentContainer, { paddingHorizontal: width * 0.05 }]}>
          <View style={styles.calendarPositioningContainer}>
            <View style={{ height: calendarHeight, overflow: 'hidden' }}>
              <Calendar
                style={{
                   height: calendarHeight,
                   backgroundColor: '#eef7ff',
                }}
                current={targetMonthString}
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
          </View>
        </View>

        <View style={styles.navigationBarPlacement}>
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
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
  },
  calendarPositioningContainer: {
    width: '100%',
    paddingTop: TOP_PADDING,
  },
  navigationBarPlacement: {
    width: '100%',
  },
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