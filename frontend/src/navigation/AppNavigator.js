// src/navigation/AppNavigator.js
import React from 'react';
// Stack 네비게이터 생성을 위한 함수 import
import { createStackNavigator } from '@react-navigation/stack';

// 분리된 각 화면 컴포넌트들을 import 합니다. 경로는 실제 파일 위치에 맞게 조정하세요.
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StorageScreen from '../screens/StorageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SimpleDiagnosisScreen from '../screens/SimpleDiagnosisScreen';

// Stack 네비게이터 인스턴스 생성
const Stack = createStackNavigator();

// 앱의 네비게이션 구조를 정의하는 컴포넌트
const AppNavigator = () => {
  return (
    // Stack.Navigator가 네비게이션 스택을 관리합니다.
    <Stack.Navigator
      // initialRouteName: 앱 시작 시 보여줄 첫 화면의 이름
      initialRouteName="Home"
      // screenOptions: 모든 화면에 공통으로 적용될 옵션
      screenOptions={{
        headerShown: false, // 모든 화면에서 헤더(상단 제목 표시줄) 숨김
      }}
    >
      {/* 각 화면을 Stack.Screen 컴포넌트로 등록합니다. */}
      {/* name: 화면을 식별하는 고유한 이름 (navigation.navigate에서 사용) */}
      {/* component: 해당 이름과 매칭될 화면 컴포넌트 */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Storage" component={StorageScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SimpleDiagnosis" component={SimpleDiagnosisScreen} />
      {/* 필요하다면 다른 화면들도 여기에 추가 */}
      {/* 예: <Stack.Screen name="Result" component={ResultScreen} /> */}
    </Stack.Navigator>
  );
};

// AppNavigator 컴포넌트를 export하여 App.js에서 사용할 수 있게 합니다.
export default AppNavigator;