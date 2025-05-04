// 예시: src/navigation/MainTabNavigator.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// ... 다른 화면 import ...

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      // ★★★ 이 부분을 추가하거나 수정합니다 ★★★
      backBehavior="initialRoute" // 다른 탭에서 뒤로가기 시 첫 번째 탭(Home)으로 이동

      screenOptions={
        {/* ... 기존 screenOptions 설정 ... */}
      }
    >
      {/* ... Tab.Screen 설정 ... */}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;