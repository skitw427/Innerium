// frontend/App.js (프로젝트 루트에 있는 파일)

import React from 'react';
// React Navigation의 핵심 컨테이너
import { NavigationContainer } from '@react-navigation/native';
// SafeArea 처리를 위한 Provider
import { SafeAreaProvider } from 'react-native-safe-area-context';
// 방금 만든 네비게이션 구조 컴포넌트를 import (경로 주의: './src/...')
import AppNavigator from './src/navigation/AppNavigator';

// 앱의 최상위 진입점 컴포넌트
export default function App() {
  return (
    // SafeAreaProvider가 앱 전체를 감싸서 안전 영역 정보를 제공합니다.
    <SafeAreaProvider>
      {/* NavigationContainer가 네비게이션 상태를 관리합니다. */}
      <NavigationContainer>
        {/* AppNavigator가 실제 화면 전환 로직을 렌더링합니다. */}
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// 이 파일에는 더 이상 StyleSheet나 다른 컴포넌트 정의가 필요 없습니다.
// 매우 간결하게 유지됩니다.