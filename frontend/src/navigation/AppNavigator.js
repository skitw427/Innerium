// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // 탭 네비게이터 import

// --- 화면 컴포넌트 Import ---
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StorageScreen from '../screens/StorageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SimpleDiagnosisScreen from '../screens/SimpleDiagnosisScreen';

// --- 아이콘 사용 시 필요한 import (예시) ---
// import Ionicons from 'react-native-vector-icons/Ionicons';

// --- 네비게이터 인스턴스 생성 ---
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- 하단 탭 네비게이터를 렌더링하는 컴포넌트 ---
const MainTabs = () => {
  return (
    <Tab.Navigator
      // --- 탭 네비게이터 옵션 ---
      screenOptions={{
        unmountOnBlur: false, // 상태 유지를 위해 false
        headerShown: false,   // 탭 내 화면들의 헤더 숨김
        // --- ★★★ 기본 탭 바 UI 숨기기 ★★★ ---
        tabBarStyle: { display: 'none' },
        // ------------------------------------
        // 아이콘/레이블 설정은 이제 사용되지 않으므로 주석 처리 또는 삭제 가능
        // tabBarIcon: ({ focused, color, size }) => { /* ... 아이콘 로직 ... */ },
        // tabBarActiveTintColor: 'tomato',
        // tabBarInactiveTintColor: 'gray',
      }}
      // --- 뒤로가기 버튼 동작 ---
      backBehavior="initialRoute"
    >
      {/* --- 탭 화면 정의 (컴포넌트는 여전히 필요) --- */}
      {/* 이름(name)은 navigation.navigate 호출 시 사용됩니다. */}
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '캘린더' }} />
      <Tab.Screen name="Storage" component={StorageScreen} options={{ title: '보관함' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
};

// --- 앱의 전체 네비게이션 구조 (StackNavigator) ---
const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 메인 하단 탭 네비게이터 그룹 */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      {/* 탭 바깥 화면 */}
      <Stack.Screen name="SimpleDiagnosis" component={SimpleDiagnosisScreen} />
      {/* 다른 스택 화면들... */}
    </Stack.Navigator>
  );
};

export default AppNavigator;