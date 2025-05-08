// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // 정확한 import 확인

// 화면 컴포넌트 import
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StorageScreen from '../screens/StorageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SimpleDiagnosisScreen from '../screens/SimpleDiagnosisScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator(); // createBottomTabNavigator() 호출 확인

const MainTabs = () => {
  return (
    <Tab.Navigator
      // screenOptions에서 unmountOnBlur를 전역으로 설정하지 마세요.
      // 각 스크린별로 설정하는 것이 더 명확합니다.
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // 사용자 정의 네비게이션 바 사용
      }}
      backBehavior="initialRoute" // 기본값은 'initialRoute' 또는 'history' (v6)
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          unmountOnBlur: false, // 홈 화면은 상태 유지
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ // ★★★ options 객체 확인 ★★★
          title: '캘린더',
          unmountOnBlur: true, // ★★★ 이 설정이 반드시 있어야 함 ★★★
        }}
      />
      <Tab.Screen
        name="Storage"
        component={StorageScreen}
        options={{
          title: '보관함',
          unmountOnBlur: true, // ★★★ 이 설정이 반드시 있어야 함 ★★★
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          unmountOnBlur: true, // ★★★ 이 설정이 반드시 있어야 함 ★★★
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="SimpleDiagnosis" component={SimpleDiagnosisScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;