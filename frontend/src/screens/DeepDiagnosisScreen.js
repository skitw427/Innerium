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
  Keyboard, // Keyboard 모듈 임포트
  StatusBar, // StatusBar 높이를 가져오기 위해 임포트 (Android)
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { converseWithAI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useHeaderHeight } from '@react-navigation/elements';

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
  const { isLoggedIn } = useAuth(); // 이 변수의 사용 여부 확인 (현재 코드상 직접적 사용 X)
  const headerHeight = useHeaderHeight();

  // 스크롤 맨 아래로 이동하는 함수
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  useEffect(() => {
    startConversation();

    // 키보드 이벤트 리스너 등록
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // 키보드가 나타났을 때, 약간의 지연 후 스크롤 (레이아웃 안정화)
        setTimeout(() => scrollToBottom(true), 50);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // 키보드가 사라졌을 때, 레이아웃이 원상태로 돌아온 후 스크롤할 수 있도록
        // 이 부분은 입력창이 딸려 올라왔을 때 제 위치로 복귀시키려는 시도입니다.
        // 필요하다면, 이 스크롤을 제거하거나 다른 방식으로 처리할 수 있습니다.
        setTimeout(() => scrollToBottom(false), 0);
      }
    );

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // 메시지 변경 시 스크롤 (초기 로딩 메시지 및 후속 메시지 포함)
    if (messages.length > 0) {
      // 약간의 지연을 주어 UI 렌더링 후 스크롤
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages]);


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

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading || isDiagnosisComplete || !conversationId) {
      if (isDiagnosisComplete) Alert.alert("알림", "진단이 이미 완료되었습니다.");
      return;
    }

    const newUserMessage = { id: makeId(), sender: 'user', text: userInput.trim() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    const currentInput = userInput.trim(); // 비동기 상태 업데이트 전 값 저장
    setUserInput('');
    setIsLoading(true);
    setIsError(false);
    // Keyboard.dismiss(); // 메시지 전송 후 키보드를 닫고 싶다면 주석 해제

    try {
      const response = await converseWithAI({
        conversation_id: conversationId,
        user_message: currentInput,
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

  // Android에서 KAV offset을 결정할 때 StatusBar 높이를 고려할 수 있습니다.
  // 많은 경우, 헤더가 StatusBar 아래에 위치하므로 headerHeight만으로 충분할 수 있습니다.
  // 만약 헤더가 투명하거나 StatusBar 뒤로 그려진다면, StatusBar 높이를 추가해야 할 수 있습니다.
  // 우선 headerHeight로 테스트하고, 문제가 지속되면 아래 androidSpecificOffset을 사용해보세요.
  // const androidSpecificOffset = headerHeight + (StatusBar.currentHeight || 0);
  const kavOffset = Platform.select({
    ios: headerHeight,
    android: headerHeight, // Android도 우선 headerHeight로 시도
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
            // 스크롤 시 키보드 내리기 (선택 사항)
            // keyboardDismissMode="on-drag" // iOS
            // onScrollBeginDrag={Keyboard.dismiss} // Android
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
                  onSubmitEditing={handleSendMessage} // 엔터키로 전송 (싱글라인에서 유용)
                  returnKeyType="send"
                  blurOnSubmit={false} // 멀티라인에서 엔터키는 줄바꿈, 전송은 버튼으로
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
    backgroundColor: '#eef7ff', // 앱 배경색
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    paddingTop: 40, // <<< 원하시는 상단 여백 (예: 40)
    // backgroundColor: 'rgba(0,0,0,0.05)', // 디버깅용 배경색
  },
  chatListStyle: {
    flex: 1, // FlatList가 inputAreaContainer를 제외한 모든 공간을 차지
    // backgroundColor: 'rgba(0,255,0,0.1)', // 디버깅용 배경색
  },
  chatContentContainer: {
    paddingHorizontal: 10,
    // paddingTop: 10, // outerContainer의 paddingTop과 중복될 수 있으므로 필요시 조절
    paddingBottom: 10, // 마지막 메시지와 입력창 사이 여백
    flexGrow: 1, // 중요: 메시지가 적을 때도 FlatList가 컨텐츠 영역을 채우도록 함
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
    backgroundColor: '#f8f8f8', // 입력창 영역 배경색
    // backgroundColor: 'rgba(255,0,0,0.1)', // 디버깅용 배경색
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 5, // TextInput과 SendButton 주변 여백
    minHeight: 40, // 최소 높이 보장
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, // 플랫폼별 패딩 조절
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#000',
    maxHeight: 100, // 여러 줄 입력 시 최대 높이
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
    backgroundColor: '#cce4ff', // 비활성화 시 색상
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5, // 버튼 상하 여백
  },
  actionButtonGradient: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2, // Android 그림자
    minWidth: 150, // 버튼 최소 너비
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#FF3B30', // 재시도 버튼 색상
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