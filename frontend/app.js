// frontend/App.js (이전 제공 코드 재확인)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet, Button } from 'react-native'; // 로딩 및 에러 표시용

import AppNavigator from './src/navigation/AppNavigator'; // 경로 확인!
import { GardenProvider } from './src/context/GardenContext';
import { AuthProvider, useAuth } from './src/context/AuthContext'; // AuthContext import

const AppContent = () => {
  const { isLoading, isLoggedIn, refreshAuth } = useAuth();

  if (isLoading) {
    return (
      // View 안에 Text 컴포넌트 외 다른 텍스트 없음 확인
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>앱을 준비 중입니다...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      // View 안에 Text, Button 컴포넌트 외 다른 텍스트 없음 확인
      <View style={styles.container}>
        <Text style={styles.errorText}>앱을 사용하려면 인증이 필요합니다.</Text>
        <Text style={styles.infoText}>네트워크 연결을 확인 후 다시 시도해주세요.</Text>
        <Button title="다시 시도" onPress={() => refreshAuth()} />
      </View>
    );
  }

  // GardenProvider, AppNavigator 외 다른 텍스트 없음 확인
  return (
    <GardenProvider>
      <AppNavigator />
    </GardenProvider>
  );
};

export default function App() {
  return (
    // Provider, Container 컴포넌트 사이에 다른 텍스트 없음 확인
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  }
});