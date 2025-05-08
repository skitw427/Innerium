// frontend/App.js (프로젝트 루트에 있는 파일)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ★★★ AppNavigator 대신 MainTabNavigator를 import ★★★
import AppNavigator from './src/navigation/AppNavigator'; // 경로 확인!
import { GardenProvider } from './src/context/GardenContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <GardenProvider>
        <NavigationContainer>
          {/* ★★★ AppNavigator 대신 MainTabNavigator를 렌더링 ★★★ */}
          <AppNavigator />
        </NavigationContainer>
      </GardenProvider>
    </SafeAreaProvider>
  );
}