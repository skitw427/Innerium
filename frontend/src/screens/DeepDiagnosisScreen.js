// src/screens/DeepDiagnosisScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { converseWithAI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const DeepDiagnosisScreen = ({ navigation }) => {
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState(false);
  const [isError, setIsError] = useState(false);

  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = async () => {
    setIsLoading(true);
    setIsError(false);
    // 초기 안내 메시지를 setMessages의 첫 번째 요소로 설정하여 바로 보이도록 수정
    setMessages([{ id: makeId(), sender: 'bot', text: '심층 진단을 시작합니다. 현재 어떤 감정을 느끼고 계신가요? 자세히 말씀해주실수록 좋습니다.' }]);
    try {
      const response = await converseWithAI({ action: 'start' });
      const { conversation_id, ai_message, is_complete } = response.data;

      setConversationId(conversation_id);
      // 첫 API 응답 메시지는 기존 메시지 배열에 추가
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);
      if (is_complete) {
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

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading || isDiagnosisComplete || !conversationId) {
      if (isDiagnosisComplete) Alert.alert("알림", "진단이 이미 완료되었습니다.");
      return;
    }

    const newUserMessage = { id: makeId(), sender: 'user', text: userInput.trim() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setUserInput('');
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await converseWithAI({
        conversation_id: conversationId,
        user_message: newUserMessage.text,
      });
      const { ai_message, is_complete } = response.data;

      setMessages(prevMessages => [...prevMessages, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);

      if (is_complete) {
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
    Alert.alert(
      "결과 확인",
      "심층 진단 결과 요약 기능은 현재 준비 중입니다. 전체 대화 내용을 바탕으로 정원에 특별한 요소가 추가될 예정입니다.",
      [
        { text: "확인", onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleRetry = () => {
    setMessages([]);
    setConversationId(null);
    setIsDiagnosisComplete(false);
    setUserInput('');
    startConversation();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.outerContainer}>
          {/* 상단 여백 추가 */}
          <View style={styles.topSpacing} />

          <View style={styles.chatListContainer}>
            <FlatList
              ref={flatListRef}
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
              contentContainerStyle={styles.chatContainer}
              ListFooterComponent={isLoading && messages.length > 0 ? <ActivityIndicator style={{ marginVertical: 10 }} size="small" color="#007AFF" /> : null}
            />
          </View>

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
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1, justifyContent: 'space-between' },
  // 상단 여백 스타일 추가
  topSpacing: { height: 40 },
  chatListContainer: { flex: 1 },
  chatContainer: { paddingVertical: 10, paddingHorizontal: 10, flexGrow: 1 },
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