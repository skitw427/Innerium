// src/screens/DeepDiagnosisScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { converseWithAI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useHeaderHeight } from '@react-navigation/elements';
import IMAGES from '../constants/images'; // IMAGES 임포트 추가

const DeepDiagnosisScreen = ({ navigation }) => {
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [apiResultData, setApiResultData] = useState(null); // API 결과 저장용 상태

  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const { isLoggedIn } = useAuth();
  const headerHeight = useHeaderHeight();

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  useEffect(() => {
    startConversation();
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setTimeout(() => scrollToBottom(true), 50));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setTimeout(() => scrollToBottom(false), 0));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages]);

  const startConversation = async () => {
    setIsLoading(true);
    setIsError(false);
    setApiResultData(null); // 이전 결과 초기화
    setMessages([{ id: makeId(), sender: 'bot', text: '심층 진단을 시작합니다. 현재 어떤 감정을 느끼고 계신가요? 자세히 말씀해주실수록 좋습니다.' }]);
    try {
      const response = await converseWithAI({ action: 'start' });
      const { conversation_id, ai_message, is_complete, top_emotions } = response.data;

      setConversationId(conversation_id);
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);

      if (is_complete) {
        setApiResultData(response.data); // 전체 API 결과 저장
        addCompletionMessageAndButton();
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      handleApiError(error, "대화 시작 중 오류가 발생했습니다.");
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: "죄송합니다. 지금은 진단을 시작할 수 없습니다. 잠시 후 다시 시도해주세요." }]);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading || isDiagnosisComplete || !conversationId) {
      if (isDiagnosisComplete) Alert.alert("알림", "진단이 이미 완료되었습니다.");
      return;
    }

    const newUserMessage = { id: makeId(), sender: 'user', text: userInput.trim() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    const currentInput = userInput.trim();
    setUserInput('');
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await converseWithAI({
        conversation_id: conversationId,
        user_message: currentInput,
      });
      const { ai_message, is_complete, top_emotions } = response.data; // top_emotions 포함 가정

      setMessages(prevMessages => [...prevMessages, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);

      if (is_complete) {
        setApiResultData(response.data); // API 결과 저장
        addCompletionMessageAndButton();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      handleApiError(error, "메시지 전송 중 오류가 발생했습니다.");
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: "죄송합니다. 메시지를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요." }]);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiError = (error, defaultMessage) => {
    // ... (기존 코드와 동일)
    let displayMessage = defaultMessage;
    if (error.response) {
      displayMessage = `서버 오류: ${error.response.status}. 잠시 후 다시 시도해주세요.`;
      if (error.response.data && error.response.data.message) {
        displayMessage = error.response.data.message;
      }
    } else if (error.request) {
      displayMessage = "네트워크 연결을 확인해주세요.";
    }
    console.error("API Error Details:", error);
  };

  const addCompletionMessageAndButton = () => {
    setMessages(prev => [
      ...prev,
      { id: makeId(), sender: 'bot', text: '진단이 완료되었습니다. 결과를 확인하시겠습니까?' },
    ]);
  };

  const handleViewDeepDiagnosisResult = () => {
    if (!apiResultData || !apiResultData.top_emotions || apiResultData.top_emotions.length < 1) {
      Alert.alert(
        "결과 없음",
        "진단 결과를 가져오지 못했습니다. 다시 시도해주세요.",
        [{ text: "확인" }]
      );
      // 필요하다면 여기서 재시도 로직 호출 또는 이전 화면으로 이동
      // navigation.goBack();
      return;
    }

    const { top_emotions } = apiResultData;

    // API 응답에서 감정 정보를 추출하여 DeepDiagnosisResultScreen으로 전달할 데이터 구성
    // 첫 번째 감정을 primaryEmotion으로, 나머지를 secondaryEmotions로 구성
    const primaryEmotionData = top_emotions[0];
    const secondaryEmotionsData = top_emotions.slice(1, 3); // 최대 2개까지

    const resultScreenParams = {
      primaryEmotion: {
        key: primaryEmotionData.key,
        name: primaryEmotionData.name,
        // IMAGES.flowers[감정키][꽃이미지키] 형태로 접근한다고 가정
        flowerImage: IMAGES.flowers?.[primaryEmotionData.key]?.[primaryEmotionData.flower_image_key] || IMAGES.defaultFlower, // 기본 꽃 이미지 추가
        score: primaryEmotionData.score, // (선택적)
      },
      secondaryEmotions: secondaryEmotionsData.map(emo => ({
        key: emo.key,
        name: emo.name,
        flowerImage: IMAGES.flowers?.[emo.key]?.[emo.flower_image_key] || IMAGES.defaultFlower,
        score: emo.score,
      })),
      diagnosisMessages: messages,
      conversationId: conversationId,
    };
    
    console.log("Navigating to DeepDiagnosisResult with params:", JSON.stringify(resultScreenParams, null, 2));
    navigation.navigate('DeepDiagnosisResult', resultScreenParams);
  };

  const handleRetry = () => {
    setMessages([]);
    setConversationId(null);
    setIsDiagnosisComplete(false);
    setUserInput('');
    setApiResultData(null);
    startConversation();
  };

  const kavOffset = Platform.select({
    ios: headerHeight,
    android: headerHeight,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={kavOffset}
      >
        <View style={styles.outerContainer}>
          <FlatList
            ref={flatListRef}
            style={styles.chatListStyle}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.messageOuterContainer,
                item.sender === 'bot' ? styles.botRowContainer : styles.userRowContainer
              ]}>
                <View style={[
                  styles.messageBubble,
                  item.sender === 'bot' ? styles.botBubble : styles.userBubble
                ]}>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.chatContentContainer}
            ListFooterComponent={isLoading && messages.length > 0 ? <ActivityIndicator style={{ marginVertical: 10 }} size="small" color="#007AFF" /> : null}
          />

          <View style={styles.inputAreaContainer}>
            {isError && !isLoading && (
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>대화 재시도</Text>
              </TouchableOpacity>
            )}
            {!isError && isDiagnosisComplete && !isLoading && (
                 <TouchableOpacity onPress={handleViewDeepDiagnosisResult} style={styles.actionButton}>
                    <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.actionButtonGradient}>
                        <Text style={styles.actionButtonText}>결과 보기</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
            {!isDiagnosisComplete && !isError && (
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="메시지를 입력하세요..."
                  placeholderTextColor="#8e8e93"
                  multiline
                  editable={!isLoading && !isDiagnosisComplete}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  style={[styles.sendButton, (userInput.trim() === '' || isLoading) && styles.sendButtonDisabled]}
                  disabled={userInput.trim() === '' || isLoading}
                >
                  <Text style={styles.sendButtonText}>전송</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef7ff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    paddingTop: 40,
  },
  chatListStyle: {
    flex: 1,
  },
  chatContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexGrow: 1,
  },
  messageOuterContainer: { flexDirection: 'row', marginVertical: 6, },
  botRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', paddingRight: '20%'},
  userRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', paddingLeft: '20%'},
  messageBubble: { maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, },
  botBubble: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginLeft: 5, },
  userBubble: { backgroundColor: '#a8d8ff', borderTopRightRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginRight: 5, },
  messageText: { fontSize: 16, color: '#333', lineHeight: 22, },
  inputAreaContainer: {
    borderTopWidth: 1,
    borderTopColor: '#dcdcdc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8f8f8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 5,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cce4ff',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  actionButtonGradient: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeepDiagnosisScreen;