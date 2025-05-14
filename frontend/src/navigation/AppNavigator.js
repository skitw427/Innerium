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
import DeepDiagnosisScreen from '../screens/DeepDiagnosisScreen'; // DeepDiagnosisScreen import 추가

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // 사용자 정의 네비게이션 바 사용
      }}
      backBehavior="initialRoute"
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
        options={{
          title: '캘린더',
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Storage"
        component={StorageScreen}
        options={{
          title: '보관함',
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          unmountOnBlur: true,
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
        name="DeepDiagnosis" // DeepDiagnosisScreen을 위한 스크린 이름
        component={DeepDiagnosisScreen} 
        // options={{ title: '심층 마음 진단' }} // 필요하다면 헤더 타이틀 설정 (현재 headerShown: false이므로 영향 없음)
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;