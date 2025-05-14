// src/screens/DeepDiagnosisResultScreen.js
import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // 버튼 등에 사용 가능
import IMAGES from '../constants/images'; // 이미지 경로
import AsyncStorage from '@react-native-async-storage/async-storage'; // 날짜 기록 등 필요시
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils'; // 날짜 유틸

// 상수 정의 (SimpleDiagnosisScreen과 유사하게)
const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';
const EMOTION_LOG_PREFIX = '@emotionLog_'; // 달력과 공유할 키 접두사

// 감정 키를 이름으로 매핑 (필요시 확장)
const emotionToKeyMap = { /* ... SimpleDiagnosisScreen과 동일 ... */ };
const keyToEmotionNameMap = { /* ... HomeScreen과 동일 ... */ };


const DeepDiagnosisResultScreen = ({ route, navigation }) => {
  const { primaryEmotion, secondaryEmotions, diagnosisMessages, conversationId } = route.params;

  const handleConfirm = async () => {
    // 1. 오늘 날짜로 진단 완료 기록 (AsyncStorage)
    try {
      const currentAppDate = await getAppCurrentDate();
      const formattedCurrentAppDate = formatDateToYYYYMMDD(currentAppDate);
      await AsyncStorage.setItem(LAST_DIAGNOSIS_DATE_KEY, formattedCurrentAppDate);

      // 대표 감정 (또는 3개 감정 모두)을 로그로 기록할 수 있음
      // 여기서는 가장 우선순위 높은 감정만 기록하는 예시
      if (primaryEmotion && primaryEmotion.key) {
        const emotionLogKey = `${EMOTION_LOG_PREFIX}${formattedCurrentAppDate}`;
        await AsyncStorage.setItem(emotionLogKey, primaryEmotion.key);
      }
    } catch (error) {
      console.error("Error saving diagnosis data:", error);
      // 사용자에게 알릴 필요는 없을 수 있음 (백그라운드 작업)
    }

    // 2. HomeScreen으로 결과 전달 및 이동
    // HomeScreen에서 이 데이터를 어떻게 사용할지에 따라 전달하는 params 구조 결정
    // 예시: 우선순위 높은 감정 1개와 전체 대화 기록 전달
    navigation.navigate('MainTabs', {
      screen: 'Home',
      params: {
        diagnosisResult: `심층 진단을 통해 '${primaryEmotion.name}'(와)과 같은 감정을 확인했어요.`, // 결과 메시지
        emotionKey: primaryEmotion.key, // 대표 감정 키
        // 또는 여러 감정 정보를 전달할 수도 있음
        // topEmotionsForGarden: [primaryEmotion, ...secondaryEmotions],
        diagnosisCompletedToday: true,
        diagnosisType: 'deep', // 진단 유형 구분 (선택적)
        diagnosisMessages: diagnosisMessages, // 전체 대화 내용
        conversationId: conversationId, // (선택적)
      },
      merge: true, // 이전 파라미터와 병합
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>심층 진단 결과</Text>

        {/* 가장 우선순위 높은 감정 */}
        {primaryEmotion && (
          <View style={styles.primaryEmotionContainer}>
            {primaryEmotion.flowerImage && (
              <Image source={primaryEmotion.flowerImage} style={styles.primaryFlowerImage} resizeMode="contain" />
            )}
            <Text style={styles.primaryEmotionName}>{primaryEmotion.name || '감정 정보 없음'}</Text>
            {/* <Text style={styles.emotionScore}>점수: {primaryEmotion.score || 'N/A'}</Text> */}
          </View>
        )}

        {/* 나머지 두 감정 */}
        {secondaryEmotions && secondaryEmotions.length > 0 && (
          <View style={styles.secondaryEmotionsRow}>
            {secondaryEmotions.map((emotion, index) => (
              <View key={index} style={styles.secondaryEmotionContainer}>
                {emotion.flowerImage && (
                  <Image source={emotion.flowerImage} style={styles.secondaryFlowerImage} resizeMode="contain" />
                )}
                <Text style={styles.secondaryEmotionName}>{emotion.name || '감정 정보 없음'}</Text>
                {/* <Text style={styles.emotionScoreSmall}>점수: {emotion.score || 'N/A'}</Text> */}
              </View>
            ))}
          </View>
        )}

        {/* (선택적) 간단한 요약 메시지 또는 설명 */}
        <Text style={styles.summaryText}>
          대화를 통해 위와 같은 주요 감정들이 나타났습니다. 이 감정들을 바탕으로 당신의 정원에 새로운 변화가 생길 거예요.
        </Text>

      </ScrollView>
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
          <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.confirmButtonGradient}>
            <Text style={styles.confirmButtonText}>정원으로 돌아가기</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 120, // 하단 버튼 고려한 패딩
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  primaryEmotionContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: '90%',
  },
  primaryFlowerImage: {
    width: 180, // 크게
    height: 180, // 크게
    marginBottom: 15,
  },
  primaryEmotionName: {
    fontSize: 22, // 크게
    fontWeight: '600',
    color: '#444',
  },
  secondaryEmotionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  secondaryEmotionContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    width: '45%', // 화면 너비의 약 45%
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  secondaryFlowerImage: {
    width: 100, // 작게
    height: 100, // 작게
    marginBottom: 10,
  },
  secondaryEmotionName: {
    fontSize: 16, // 작게
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
  emotionScore: { // (선택적) 점수 표시용
    fontSize: 16,
    color: '#777',
    marginTop: 5,
  },
  emotionScoreSmall: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#eef7ff', // 배경과 통일 또는 구분되는 색
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  confirmButton: {}, // LinearGradient가 스타일을 담당하므로 TouchableOpacity 자체는 비워도 됨
  confirmButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DeepDiagnosisResultScreen;