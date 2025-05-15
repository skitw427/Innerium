// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 화면 컴포넌트 import
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StorageScreen from '../screens/StorageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SimpleDiagnosisScreen from '../screens/SimpleDiagnosisScreen';
import DeepDiagnosisScreen from '../screens/DeepDiagnosisScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // 사용자 정의 네비게이션 바 사용
      }}
      backBehavior="initialRoute" // 또는 "history" 등 필요에 따라
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          unmountOnBlur: false, // 홈 화면은 상태 유지 (기존과 동일)
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: '캘린더',
          unmountOnBlur: true, // 다른 화면들은 필요에 따라 true 유지 가능
        }}
      />
      <Tab.Screen
        name="Storage"
        component={StorageScreen}
        options={{
          title: '보관함',
          unmountOnBlur: true, // 다른 화면들은 필요에 따라 true 유지 가능
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          // unmountOnBlur: true, // 이 줄을 주석 처리하거나
          unmountOnBlur: false,   // false로 변경합니다.
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
      <Stack.Screen
        name="DeepDiagnosis"
        component={DeepDiagnosisScreen}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;