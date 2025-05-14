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
import { converseWithAI } from '../api/apiClient'; // API 클라이언트에서 심층 진단 함수 import
import { useAuth } from '../context/AuthContext'; // 사용자 토큰 접근을 위해 (필요하다면)

const DeepDiagnosisScreen = ({ navigation }) => {
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // AI 응답 대기 중 로딩 상태
  const [conversationId, setConversationId] = useState(null); // 대화 ID 저장
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState(false); // AI가 진단 완료를 알렸는지 여부
  const [isError, setIsError] = useState(false); // API 에러 발생 여부

  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const { isLoggedIn } = useAuth(); // 현재는 직접 사용하진 않지만, 추후 인증 로직 강화 시 필요할 수 있음

  // --- 초기 메시지 설정 및 대화 시작 ---
  useEffect(() => {
    // 화면이 처음 로드될 때 AI와 대화 시작
    startConversation();
  }, []);

  const startConversation = async () => {
    setIsLoading(true);
    setIsError(false);
    setMessages([{ id: makeId(), sender: 'bot', text: '심층 진단을 시작합니다. 현재 어떤 감정을 느끼고 계신가요? 자세히 말씀해주실수록 좋습니다.' }]); // 초기 안내 메시지
    try {
      const response = await converseWithAI({ action: 'start' });
      const { conversation_id, ai_message, is_complete } = response.data;

      setConversationId(conversation_id);
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);
      if (is_complete) {
        // 시작하자마자 완료될 경우는 거의 없겠지만, 방어 코드
        addCompletionMessageAndButton();
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      handleApiError(error, "대화 시작 중 오류가 발생했습니다.");
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: "죄송합니다. 지금은 진단을 시작할 수 없습니다. 잠시 후 다시 시도해주세요." }]);
      setIsError(true); // 에러 상태로 설정
    } finally {
      setIsLoading(false);
    }
  };

  // --- 메시지 목록 변경 시 자동 스크롤 ---
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // --- 사용자 메시지 전송 핸들러 ---
  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading || isDiagnosisComplete || !conversationId) {
      if (isDiagnosisComplete) Alert.alert("알림", "진단이 이미 완료되었습니다.");
      return;
    }

    const newUserMessage = { id: makeId(), sender: 'user', text: userInput.trim() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setUserInput(''); // 입력창 비우기
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await converseWithAI({
        conversation_id: conversationId,
        user_message: newUserMessage.text,
      });
      const { ai_message, is_complete } = response.data; // conversation_id는 동일하게 유지됨

      setMessages(prevMessages => [...prevMessages, { id: makeId(), sender: 'bot', text: ai_message }]);
      setIsDiagnosisComplete(is_complete);

      if (is_complete) {
        addCompletionMessageAndButton();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      handleApiError(error, "메시지 전송 중 오류가 발생했습니다.");
      // 실패 시 사용자에게 피드백
      setMessages(prev => [...prev, { id: makeId(), sender: 'bot', text: "죄송합니다. 메시지를 처리하는 중 문제가 발생했습니다. 다시 시도해주세요." }]);
      setIsError(true);
    } finally {
      setIsLoading(false);
      // 메시지 전송 후 키보드가 다시 올라오도록 (선택적)
      // textInputRef.current?.focus();
    }
  };

  // --- API 에러 공통 처리 ---
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
    // 사용자에게 Alert 대신 메시지로 전달하거나, 특정 UI에 표시할 수 있음
    // Alert.alert("오류", displayMessage);
    console.error("API Error Details:", error);
  };


  // --- 진단 완료 시 메시지 및 버튼 추가 ---
  const addCompletionMessageAndButton = () => {
    setMessages(prev => [
      ...prev,
      { id: makeId(), sender: 'bot', text: '진단이 완료되었습니다. 결과를 확인하시겠습니까?' },
    ]);
    // 입력창 비활성화 및 결과 보기 버튼 표시를 위해 isDiagnosisComplete 상태 사용
  };

  // --- 결과 보기 핸들러 ---
  const handleViewDeepDiagnosisResult = () => {
    // TODO: 심층 진단 결과를 어떻게 보여줄지, HomeScreen으로 어떤 데이터를 전달할지 정의 필요
    // 예시: 대화 내용 전체를 전달하거나, AI가 요약한 결과를 전달할 수 있음
    Alert.alert(
      "결과 확인",
      "심층 진단 결과 요약 기능은 현재 준비 중입니다. 전체 대화 내용을 바탕으로 정원에 특별한 요소가 추가될 예정입니다.", // 임시 메시지
      [
        { text: "확인", onPress: () => navigation.goBack() } // 일단 이전 화면으로 돌아가기
      ]
    );
    // navigation.navigate('MainTabs', {
    //   screen: 'Home',
    //   params: {
    //     deepDiagnosisConversationId: conversationId,
    //     deepDiagnosisMessages: messages,
    //     // 필요한 경우 AI가 요약한 결과 또는 특정 플래그 추가
    //   },
    //   merge: true,
    // });
  };

  // --- 재시도 핸들러 ---
  const handleRetry = () => {
    setMessages([]); // 메시지 초기화
    setConversationId(null);
    setIsDiagnosisComplete(false);
    setUserInput('');
    startConversation(); // 대화 다시 시작
  };

  // --- JSX 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0} // 헤더 높이 등을 고려하여 조정
      >
        <View style={styles.outerContainer}>
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

          {/* 하단 입력 영역 */}
          <View style={styles.inputAreaContainer}>
            {isError && !isLoading && ( // 에러 발생 시 재시도 버튼 표시 (로딩 중이 아닐 때만)
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>대화 재시도</Text>
              </TouchableOpacity>
            )}
            {!isError && isDiagnosisComplete && !isLoading && ( // 진단 완료 시 결과 보기 버튼
                 <TouchableOpacity onPress={handleViewDeepDiagnosisResult} style={styles.actionButton}>
                    <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.actionButtonGradient}>
                        <Text style={styles.actionButtonText}>결과 보기</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
            {!isDiagnosisComplete && !isError && ( // 진단 중이고 에러가 아닐 때 입력창 표시
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="메시지를 입력하세요..."
                  placeholderTextColor="#8e8e93"
                  multiline
                  editable={!isLoading && !isDiagnosisComplete} // 로딩 중이거나 진단 완료 시 입력 불가
                  onSubmitEditing={handleSendMessage} // 엔터키로 전송 (멀티라인에서는 동작 방식 다를 수 있음)
                  returnKeyType="send" // 키보드의 엔터키를 '전송'으로
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
  outerContainer: { flex: 1, justifyContent: 'space-between' }, // 상단 채팅, 하단 입력 영역 분리
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
    paddingHorizontal: 5, // 내부 TextInput과 버튼 사이 간격 조절
    minHeight: 40, // 최소 높이
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#000',
    maxHeight: 100, // 여러 줄 입력 시 최대 높이 제한
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
  actionButton: { // 결과 보기 또는 재시도 버튼 공통 스타일
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5, // 버튼 영역이므로 패딩 약간
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
  retryButton: { // 재시도 버튼 스타일
    backgroundColor: '#FF3B30', // 에러 상황이므로 붉은 계열
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center', // 중앙 정렬
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeepDiagnosisScreen;