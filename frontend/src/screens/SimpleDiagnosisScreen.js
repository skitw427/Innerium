// src/screens/SimpleDiagnosisScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 옵션 영역 높이 상수
const GRID_HEIGHT = 260;

// 배열을 주어진 크기로 나누는 유틸리티 함수
const chunk = (arr, size) => {
    const res = [];
    const tempArr = [...arr];
    // 마지막 행이 size보다 작을 경우 null로 채움 (일반 버튼용)
    while (tempArr.length % size !== 0 && size > 1) {
        tempArr.push(null);
    }
    for (let i = 0; i < tempArr.length; i += size) {
      res.push(tempArr.slice(i, i + size));
    }
    return res;
};

// 일반 옵션 버튼 렌더링 함수
const renderOptionButtons = (options, onSelect, onRestart, keyPrefix) => {
    const chunkedOptions = chunk(options, 2);
    return (
      // 고정 높이 GRID_HEIGHT 적용
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => (
          // 각 행 스타일 (flex: 1 로 높이 분할, 마지막 행 제외하고 하단 마진)
          <View style={[styles.buttonRow, rowIndex < chunkedOptions.length - 1 && styles.buttonRowMargin]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt, colIndex) =>
              opt === null ? (
                // 빈 버튼 슬롯
                <View style={[styles.optionButton, styles.optionButtonEmpty]} key={`${keyPrefix}-b-${rowIndex}-empty-${colIndex}`} />
              ) : (
                // 실제 버튼
                <TouchableOpacity
                  key={`${keyPrefix}-b-${rowIndex}-${opt}`}
                  style={styles.optionButton} // 일반 버튼 스타일
                  onPress={() => (opt === '다시' ? onRestart() : onSelect(opt))}
                >
                  <Text style={styles.optionText}>
                    {opt === '다시' ? '다시 선택' : opt}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </View>
    );
};

// 우선순위 질문 단계 전용 버튼 렌더링 함수 ('다시' 버튼 없음)
const renderPriorityOptions = (options, onSelect, keyPrefix) => {
    // 항상 옵션 2개 -> 1행 2열
    const chunkedOptions = chunk(options, 2); // [[firstEmotion, emotion]]

    return (
      // 고정 높이 GRID_HEIGHT 적용
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => (
          // 버튼 행 (flex: 1 불필요, optionsContainer의 justifyContent로 중앙 정렬됨)
          <View style={[styles.priorityButtonRow]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt, colIndex) => {
              return (
                // 버튼 래퍼 (가로 공간 분할, 수직/수평 중앙 정렬)
                <View style={styles.priorityButtonWrapper} key={`${keyPrefix}-b-${rowIndex}-${opt}`}>
                  <TouchableOpacity
                    style={styles.priorityOptionButtonActual} // 짧은 버튼 스타일
                    onPress={() => onSelect(opt)}
                  >
                    <Text style={styles.optionText}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
};


const SimpleDiagnosisScreen = ({ navigation }) => {
  // --- 상태 변수들 ---
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const [messages, setMessages] = useState([ { id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }, ]);
  const [degreeSelected, setDegreeSelected] = useState(false);
  const [emotion, setEmotion] = useState('');
  const [firstEmotion, setFirstEmotion] = useState('');
  const [degree, setDegree] = useState(null);
  const [firstDegree, setFirstDegree] = useState(null);
  const [askingSecondEmotion, setAskingSecondEmotion] = useState(false);
  const [askingPriorityQuestion, setAskingPriorityQuestion] = useState(false);
  const [availableEmotions, setAvailableEmotions] = useState([ '기쁨', '즐거움', '평온', '슬픔', '분노', '두려움', '갈망', '역겨움', ]);
  const [finished, setFinished] = useState(false);
  const flatListRef = useRef(null);

  // --- useEffect: 메시지 변경 시 스크롤 맨 아래로 ---
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // --- 핸들러 함수들 ---
  const filterAvailableEmotions = () => availableEmotions.filter(e => e !== firstEmotion);

  const handleEmotionSelect = (option) => {
    setAskingPriorityQuestion(false); // 감정 선택 시 우선순위 질문 상태 초기화
    if (askingSecondEmotion) { // 두 번째 감정 선택 중
      if (option === '없음') {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '결과가 나왔어요!' },]);
        setFinished(true); setAskingSecondEmotion(false); setDegreeSelected(false);
      } else {
        setEmotion(option); // 두 번째 감정 상태 업데이트
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
        setDegreeSelected(true); // 정도 선택 단계로
      }
      return; // 함수 종료
    }
    // 첫 번째 감정 선택
    setEmotion(option); // 현재 감정 (첫 번째) 상태 업데이트
    setFirstEmotion(option); // 첫 번째 감정 기록
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
    setDegreeSelected(true); // 정도 선택 단계로
    setAskingSecondEmotion(false); // 아직 두 번째 감정 묻는 단계 아님
   };

  const handleDegreeSelect = (value) => {
    // '다시' 버튼 처리 (renderOptionButtons에서 '다시'를 onRestart로 연결하므로 여기서는 숫자만 처리)
    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue < 1 || numericValue > 7) {
        // '다시'가 아닌데 유효하지 않은 값 처리 (필요 시)
        console.error("Invalid degree value selected:", value);
        return;
    }

    setDegree(numericValue); // 현재 정도 상태 업데이트
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: `${numericValue}` },]);

    if (askingSecondEmotion) { // 두 번째 감정의 정도 입력 중
      if (numericValue === firstDegree) { // 첫 번째 감정 정도와 같으면
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '두 감정 중 오늘 더 크게 느낀 감정은 무엇인가요?' },]);
        setAskingPriorityQuestion(true); // 우선순위 질문 단계로
        setDegreeSelected(false); // 정도 선택 비활성화
        setAskingSecondEmotion(false); // 두 번째 감정 질문 완료
      } else { // 정도가 다르면 바로 결과
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '결과가 나왔어요!' },]);
        setFinished(true);
        setDegreeSelected(false);
        setAskingSecondEmotion(false);
      }
    } else { // 첫 번째 감정의 정도 입력 중
      setFirstDegree(numericValue); // 첫 번째 감정 정도 기록
      setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요?' },]);
      setAskingSecondEmotion(true); // 두 번째 감정 질문 단계로
      setDegreeSelected(false); // 정도 선택 비활성화
    }
   };

  const handlePrioritySelect = (priorityEmotion) => {
    // 우선순위 선택 결과 반영 메시지 추가
    setMessages(prev => [
        ...prev,
        { id: makeId(), sender: 'user', text: priorityEmotion },
        { id: makeId(), sender: 'bot', text: `알겠습니다. ${priorityEmotion}을 더 크게 느끼셨군요. 결과가 나왔어요!` },
    ]);
    setFinished(true); // 진단 완료
    setAskingPriorityQuestion(false); // 우선순위 질문 완료
    setDegreeSelected(false);
  };

  const handleFullRestart = () => {
    // 모든 상태 초기화 및 첫 질문 메시지 설정
    setMessages([{ id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }]);
    setDegreeSelected(false);
    setEmotion('');
    setFirstEmotion('');
    setDegree(null);
    setFirstDegree(null);
    setAskingSecondEmotion(false);
    setAskingPriorityQuestion(false);
    setFinished(false);
  };

  const handleReturnToSecondEmotionChoice = () => {
    // 두 번째 감정 '다시' 선택 시: 첫 번째 감정 입력 후 상태로 복귀
    setMessages(prev => {
        const historyToKeep = prev.slice(0, 4); // 초기 메시지 + 첫 감정 선택(user) + 정도 질문(bot) + 첫 정도 선택(user)
        return [ ...historyToKeep, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요?' }, ];
    });
    setEmotion(''); // 두 번째 감정 관련 상태 초기화
    setDegree(null);
    setDegreeSelected(false); // 감정 선택 단계이므로 false
    setAskingSecondEmotion(true); // 두 번째 감정 묻는 상태
    setAskingPriorityQuestion(false);
    setFinished(false);
   };

  const handleViewResult = () => {
    // 결과 데이터 정제 및 표시
    let finalFirstEmotion = firstEmotion;
    let finalFirstDegree = firstDegree;
    let finalSecondEmotion = emotion; // '없음' 일 수도 있음
    let finalSecondDegree = degree;

    let displayMessage = `첫번째 감정: ${finalFirstEmotion} (정도: ${finalFirstDegree})`;

    if (finalSecondEmotion && finalSecondEmotion !== '없음') {
        displayMessage += `\n두번째 감정: ${finalSecondEmotion} (정도: ${finalSecondDegree})`;
        // 우선순위 질문을 거쳤는지 확인 (정도가 같았는지)
        if (finalFirstDegree === finalSecondDegree && finalFirstDegree !== null) {
            // 마지막 사용자 응답 (우선순위 선택) 찾기
            const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
            // 마지막 응답이 우선순위 선택 결과인지 확인 (선택된 감정 이름과 일치)
            if (lastUserMessage && (lastUserMessage.text === finalFirstEmotion || lastUserMessage.text === finalSecondEmotion)) {
                 displayMessage += `\n(더 크게 느낀 감정: ${lastUserMessage.text})`;
                 // 필요하다면 여기서 finalFirst/Second 를 재정렬 가능
                 // if (lastUserMessage.text === finalSecondEmotion) {
                 //    [finalFirstEmotion, finalSecondEmotion] = [finalSecondEmotion, finalFirstEmotion];
                 //    [finalFirstDegree, finalSecondDegree] = [finalSecondDegree, finalFirstDegree];
                 // }
            }
        }
    } else {
        displayMessage += `\n두번째 감정: 없음`;
    }

    console.log("결과 보기 화면으로 이동 로직");
    Alert.alert(
        "진단 결과",
        displayMessage,
        [{ text: "확인", onPress: () => navigation.navigate('Home') }] // 확인 후 홈으로 이동
    );
  };

  // --- UI 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // iOS 상단바 높이 고려
      >
        <View style={styles.outerContainer}>
          {/* 상단 여백 */}
          <View style={styles.topSpacing} />

          {/* 채팅 메시지 목록 */}
          <View style={styles.chatListContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                // --- 행 컨테이너: 여기에 조건부 스타일 적용 ---
                <View style={[
                    styles.messageOuterContainer, // 공통 행 스타일
                    item.sender === 'bot' ? styles.botRowContainer : styles.userRowContainer // 봇/사용자별 정렬 스타일
                ]}>
                  {/* 말풍선 View */}
                  <View style={[ styles.messageBubble, item.sender === 'bot' ? styles.botBubble : styles.userBubble ]}>
                    {/* 텍스트 */}
                    <Text style={styles.messageText}>{item.text}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.chatContainer}
            />
          </View>

          {/* --- 옵션 버튼 영역 --- */}
          {!finished && (
            <>
              {/* 단계 1: 첫 번째 감정 선택 */}
              {!degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( availableEmotions, handleEmotionSelect, handleFullRestart, 'emo1' )
              )}
              {/* 단계 2: 첫 번째 감정 정도 선택 */}
              {degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleFullRestart, 'deg1' )
              )}
              {/* 단계 3: 두 번째 감정 선택 */}
              {!degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [...filterAvailableEmotions(), '없음'], handleEmotionSelect, handleReturnToSecondEmotionChoice, 'emo2' )
              )}
              {/* 단계 4: 두 번째 감정 정도 선택 */}
              {degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleReturnToSecondEmotionChoice, 'deg2' )
              )}
              {/* 단계 5: 우선순위 감정 선택 */}
              {!degreeSelected && askingPriorityQuestion && (
                renderPriorityOptions(
                    [firstEmotion, emotion], // 두 감정 전달
                    handlePrioritySelect,      // 선택 핸들러
                    'priority'                 // 키 접두사
                )
              )}
            </>
          )}

          {/* 단계 6: 진단 완료 시 결과 보기 버튼 */}
          {finished && (
            <View style={[styles.optionsContainer, styles.resultButtonContainer, { height: GRID_HEIGHT }]}>
              <TouchableOpacity onPress={handleViewResult}>
                <LinearGradient
                  colors={['#4CAF50', '#8BC34A']} // 그라데이션 색상
                  style={styles.resultButtonGradient}
                >
                  <Text style={styles.resultButtonText}>
                    결과 보기
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' }, // 배경색
  outerContainer: { flex: 1 }, // 전체 화면 컨테이너
  topSpacing: { height: 40 }, // 상단 여백
  chatListContainer: { flex: 1 }, // 채팅 목록 영역 (옵션 버튼 제외)
  chatContainer: { // FlatList 내부 컨텐츠 영역 스타일
    paddingBottom: 10,
    paddingHorizontal: 10,
    flexGrow: 1, // 내용 적어도 화면 채우도록
  },

  // --- 메시지 행 스타일 ---
  messageOuterContainer: { // 공통 행 스타일
    flexDirection: 'row', // 가로 배치
    marginVertical: 6,   // 행 간 수직 마진
  },
  botRowContainer: { // 봇 메시지 행 스타일 (왼쪽 정렬)
    justifyContent: 'flex-start', // 내용물(버블)을 행 시작점에 배치
    alignSelf: 'flex-start',    // 행 자체를 왼쪽으로 붙이고 내용 너비만큼만 차지
    // maxWidth: '100%', // 혹시 모르니 추가 (보통 필요 X)
  },
  userRowContainer: { // 사용자 메시지 행 스타일 (오른쪽 정렬)
    justifyContent: 'flex-end',  // 내용물(버블)을 행 끝점에 배치
    alignSelf: 'flex-end',     // 행 자체를 오른쪽으로 붙이고 내용 너비만큼만 차지
    // maxWidth: '100%',
  },

  // --- 말풍선 스타일 ---
  messageBubble: { // 공통 말풍선 스타일
    maxWidth: '75%', // 최대 너비 (화면의 75%)
    paddingHorizontal: 14, // 좌우 패딩
    paddingVertical: 10,   // 상하 패딩
    borderRadius: 18,    // 둥근 모서리
  },
  botBubble: { // 봇 말풍선 추가 스타일
    backgroundColor: '#FFFFFF', // 배경색
    borderTopLeftRadius: 0,   // 왼쪽 위 모서리 각지게
    elevation: 1,             // 그림자 (Android)
    shadowColor: '#000',      // 그림자 (iOS)
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginLeft: 5,            // 왼쪽 마진 (아바타 공간 등)
    // alignSelf: 'flex-start' 제거 또는 주석 처리 (상위에서 처리)
  },
  userBubble: { // 사용자 말풍선 추가 스타일
    backgroundColor: '#a8d8ff', // 배경색
    borderTopRightRadius: 0,  // 오른쪽 위 모서리 각지게
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginRight: 5,           // 오른쪽 마진
    // alignSelf: 'flex-end' 제거 또는 주석 처리 (상위에서 처리)
  },

  // --- 메시지 텍스트 스타일 ---
  messageText: {
    fontSize: 16,        // 글자 크기
    color: '#333',       // 글자 색상
    lineHeight: 22,      // 줄 높이
    textAlign: 'left',   // 텍스트 왼쪽 정렬 (명시적)
  },

  // --- 옵션 버튼 영역 스타일 ---
  optionsContainer: {
    width: '100%',           // 가로 전체 너비
    paddingHorizontal: 15, // 좌우 패딩
    paddingTop: 10,        // 상단 패딩
    paddingBottom: Platform.OS === 'ios' ? 25 : 15, // 하단 패딩 (iOS 노치 고려)
    backgroundColor: '#eef7ff', // 배경색
    justifyContent: 'center', // 내부 행들을 수직 중앙 정렬 (특히 우선순위 단계)
    // height: GRID_HEIGHT, // 고정 높이 적용됨 (렌더링 부분에서)
  },
  buttonRow: { // 일반 옵션 버튼 행
    flexDirection: 'row', // 가로 배치
    width: '100%',
    // alignItems: 'center', // 기본값 stretch 대신 center 사용 가능
    flex: 1, // 부모(optionsContainer)의 높이를 나눠 갖도록 함
  },
  buttonRowMargin: { // 마지막 행 제외하고 하단 마진
    marginBottom: 10,
  },
  priorityButtonRow: { // 우선순위 옵션 버튼 행
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center', // 짧은 버튼들을 수직 중앙 정렬
    // flex: 1 불필요 (한 행이므로)
    // marginBottom 불필요 (한 행이므로)
  },
  optionButton: { // 일반 옵션 버튼
    flex: 1, // 행 내에서 가로 공간 균등 분할
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    alignItems: 'center', // 내용물 수평 중앙
    justifyContent: 'center', // 내용물 수직 중앙
    marginHorizontal: 5, // 버튼 좌우 마진
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    minHeight: 45, // 최소 높이
    paddingVertical: 12, // 상하 패딩
  },
  optionButtonEmpty: { // 빈 버튼 슬롯 스타일
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    marginHorizontal: 5,
    minHeight: 45, // 다른 버튼과 높이 맞춤
  },
  priorityButtonWrapper: { // 우선순위 버튼 래퍼
    flex: 1, // 가로 공간 균등 분할
    marginHorizontal: 5, // 좌우 마진
    justifyContent: 'center', // 내부 TouchableOpacity 수직 중앙
    alignItems: 'center',     // 내부 TouchableOpacity 수평 중앙
  },
  priorityOptionButtonActual: { // 우선순위 버튼 실제 모양 (짧게)
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    paddingVertical: 10, // 세로 패딩 줄여서 높이 감소
    paddingHorizontal: 15, // 가로 패딩
    minWidth: '60%', // 최소 너비 (내용 짧아도 유지)
  },
  optionText: { // 버튼 텍스트 공통 스타일
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center', // 버튼 내 텍스트 중앙 정렬
  },

  // --- 결과 보기 버튼 영역 스타일 ---
  resultButtonContainer: { // 결과 버튼 컨테이너 (optionsContainer 기본 스타일에 추가)
    justifyContent: 'center', // 버튼 수직 중앙
    alignItems: 'center',     // 버튼 수평 중앙
  },
  resultButtonGradient: { // 결과 버튼 그라데이션 배경
    borderRadius: 10,
    paddingVertical: 18,   // 버튼 크기 (세로)
    paddingHorizontal: 40, // 버튼 크기 (가로)
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resultButtonText: { // 결과 보기 버튼 텍스트
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SimpleDiagnosisScreen;