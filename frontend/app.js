import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // 올바른 SafeAreaProvider 사용 중
import { View, ActivityIndicator, Text, StyleSheet, Button } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { GardenProvider, useGarden } from './src/context/GardenContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const AppContent = () => {
  const { isLoading: isAuthLoading, isLoggedIn, refreshAuth } = useAuth();

  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>앱을 준비 중입니다...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>앱을 사용하려면 인증이 필요합니다.</Text>
        <Text style={styles.infoText}>네트워크 연결을 확인 후 다시 시도해주세요.</Text>
        <Button title="다시 시도" onPress={refreshAuth} /> {/* () => refreshAuth() 대신 직접 전달 */}
      </View>
    );
  }

  return (
    <GardenProvider>
      <MainApp />
    </GardenProvider>
  );
};

const MainApp = () => {
  const { isLoadingGarden, gardenError, refreshCurrentGarden } = useGarden();

  if (isLoadingGarden) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.statusText}>정원 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (gardenError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>정원 정보를 가져오지 못했습니다.</Text>
        <Text style={styles.infoText}>{gardenError}</Text>
        {/* 수정된 부분: 불필요한 중괄호와 화살표 함수 제거 */}
        <Button title="다시 시도" onPress={refreshCurrentGarden} />
      </View>
    );
  }
  return <AppNavigator />;
};

export default function App() {
  return (
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