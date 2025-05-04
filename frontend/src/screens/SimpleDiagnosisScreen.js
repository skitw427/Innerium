// src/screens/SimpleDiagnosisScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  FlatList,
  Alert, // 다른 용도로 사용될 수 있음
  KeyboardAvoidingView,
  Platform,
  // Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// --- API 함수 Import (결과 저장 시 필요) ---
// import { saveDailyRecord } from '../api/apiClient';
// import { getEmotionTypeId } from '../utils/emotionMapping';

// 옵션 영역 높이 상수
const GRID_HEIGHT = 260;

// --- ★★★ 감정 이름과 이미지 키 매핑 ★★★ ---
const emotionToKeyMap = {
  '행복': 'H',
  '불안': 'Ax',
  '평온': 'R',
  '슬픔': 'S',
  '분노': 'Ag',
  '두려움': 'F',
  '갈망': 'Dr',
  '역겨움': 'Dg',
};

// 배열을 주어진 크기로 나누는 유틸리티 함수
const chunk = (arr, size) => {
    const res = [];
    const tempArr = [...arr];
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
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => (
          <View style={[styles.buttonRow, rowIndex < chunkedOptions.length - 1 && styles.buttonRowMargin]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt, colIndex) =>
              opt === null ? (
                <View style={[styles.optionButton, styles.optionButtonEmpty]} key={`${keyPrefix}-b-${rowIndex}-empty-${colIndex}`} />
              ) : (
                <TouchableOpacity
                  key={`${keyPrefix}-b-${rowIndex}-${opt}`}
                  style={styles.optionButton}
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

// 우선순위 질문 단계 전용 버튼 렌더링 함수
const renderPriorityOptions = (options, onSelect, keyPrefix) => {
    const chunkedOptions = chunk(options, 2);
    return (
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => (
          <View style={[styles.priorityButtonRow]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt, colIndex) => {
              return (
                <View style={styles.priorityButtonWrapper} key={`${keyPrefix}-b-${rowIndex}-${opt}`}>
                  <TouchableOpacity
                    style={styles.priorityOptionButtonActual}
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
  const [emotion, setEmotion] = useState(''); // 현재 선택 중인 감정 (첫번째 또는 두번째)
  const [firstEmotion, setFirstEmotion] = useState(''); // 확정된 첫번째 감정
  const [degree, setDegree] = useState(null); // 현재 선택 중인 정도 (첫번째 또는 두번째)
  const [firstDegree, setFirstDegree] = useState(null); // 확정된 첫번째 감정의 정도
  const [askingSecondEmotion, setAskingSecondEmotion] = useState(false);
  const [askingPriorityQuestion, setAskingPriorityQuestion] = useState(false);
  const [availableEmotions, setAvailableEmotions] = useState([ '행복', '불안', '평온', '슬픔', '분노', '두려움', '갈망', '역겨움', ]); // 감정 목록 확인
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
    setAskingPriorityQuestion(false);
    if (askingSecondEmotion) {
      if (option === '없음') {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setEmotion('없음');
        setFinished(true); setAskingSecondEmotion(false); setDegreeSelected(false);
      } else {
        setEmotion(option);
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
        setDegreeSelected(true);
      }
      return;
    }
    setEmotion(option);
    setFirstEmotion(option);
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
    setDegreeSelected(true);
    setAskingSecondEmotion(false);
   };

  const handleDegreeSelect = (value) => {
    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue < 1 || numericValue > 7) {
        console.error("Invalid degree value selected:", value);
        return;
    }

    setDegree(numericValue);
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: `${numericValue}` },]);

    if (askingSecondEmotion) {
      if (numericValue === firstDegree) {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '두 감정 중 오늘 더 크게 느낀 감정은 무엇인가요?' },]);
        setAskingPriorityQuestion(true);
        setDegreeSelected(false);
        setAskingSecondEmotion(false);
      } else {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setFinished(true);
        setDegreeSelected(false);
        setAskingSecondEmotion(false);
      }
    } else {
      setFirstDegree(numericValue);
      setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요?' },]);
      setAskingSecondEmotion(true);
      setDegreeSelected(false);
    }
   };

  const handlePrioritySelect = (priorityEmotion) => {
    setMessages(prev => [
        ...prev,
        { id: makeId(), sender: 'user', text: priorityEmotion },
        { id: makeId(), sender: 'bot', text: `알겠습니다. ${priorityEmotion}을 더 크게 느끼셨군요. 결과가 나왔어요!` },
    ]);
    setFinished(true);
    setAskingPriorityQuestion(false);
    setDegreeSelected(false);
  };

  const handleFullRestart = () => {
    setMessages([{ id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }]);
    setDegreeSelected(false); setEmotion(''); setFirstEmotion(''); setDegree(null); setFirstDegree(null);
    setAskingSecondEmotion(false); setAskingPriorityQuestion(false); setFinished(false);
  };

  const handleReturnToSecondEmotionChoice = () => {
    setMessages(prev => {
        const historyToKeep = prev.slice(0, 4);
        return [ ...historyToKeep, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요?' }, ];
    });
    setEmotion(''); setDegree(null); setDegreeSelected(false); setAskingSecondEmotion(true);
    setAskingPriorityQuestion(false); setFinished(false);
   };

  // --- ★★★ 수정된 결과 처리 함수 (emotionKey 전달 추가) ★★★ ---
  const handleViewResult = () => {
    // 1. 상태값에서 최종 결과 추출 및 주요 감정 결정
    let finalFirstEmotion = firstEmotion;
    let finalFirstDegree = firstDegree;
    let finalSecondEmotion = emotion;
    let finalSecondDegree = degree;
    let primaryEmotion = '';

    if (finalFirstEmotion && finalFirstDegree !== null) { primaryEmotion = finalFirstEmotion; }
    else { primaryEmotion = "감정 정보 없음"; }

    if (finalSecondEmotion && finalSecondEmotion !== '없음' && finalSecondDegree !== null) {
        if (finalFirstDegree === finalSecondDegree) {
            const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
            if (lastUserMessage && (lastUserMessage.text === finalFirstEmotion || lastUserMessage.text === finalSecondEmotion)) { primaryEmotion = lastUserMessage.text; }
            else { console.warn("우선순위 감정 선택 메시지를 찾을 수 없습니다. 첫번째 감정을 사용합니다."); }
        } else if (finalFirstDegree !== null) {
             if (finalSecondDegree > finalFirstDegree) { primaryEmotion = finalSecondEmotion; }
        }
    }

    // 2. 결과 메시지 생성
    let resultAlertMessage = "진단 결과를 처리하는 중 오류가 발생했습니다.";
    if (primaryEmotion && primaryEmotion !== "감정 정보 없음") { resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`; }
    else if (primaryEmotion === "감정 정보 없음") { resultAlertMessage = "감정 정보를 확인할 수 없습니다."; }

    // --- ★★★ 주요 감정에 해당하는 이미지 키 찾기 ★★★ ---
    const emotionKey = emotionToKeyMap[primaryEmotion] || null;

    // 3. 결과 데이터 로깅
    console.log("--- 진단 결과 데이터 ---");
    console.log("첫번째 감정:", finalFirstEmotion, "| 정도:", finalFirstDegree);
    console.log("두번째 감정:", finalSecondEmotion, "| 정도:", finalSecondDegree);
    console.log("주요 감정:", primaryEmotion, "| 이미지 키:", emotionKey);
    console.log("------------------------");

    // --- API 호출 로직 (주석 처리됨) ---
    // const saveResult = async () => { /* ... API 호출 ... */ };
    // await saveResult();

    // --- ★★★ Home 화면으로 이동하며 메시지와 '이미지 키' 전달 ★★★ ---
    console.log("Navigating to Home with message and emotion key:", resultAlertMessage, emotionKey);
    navigation.navigate('Home', {
      diagnosisResult: resultAlertMessage,
      emotionKey: emotionKey // <<< 이미지 키 전달 >>>
    });
  };

  // --- UI 렌더링 ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
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
                <View style={[ styles.messageOuterContainer, item.sender === 'bot' ? styles.botRowContainer : styles.userRowContainer ]}>
                  <View style={[ styles.messageBubble, item.sender === 'bot' ? styles.botBubble : styles.userBubble ]}>
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
              {!degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( availableEmotions, handleEmotionSelect, handleFullRestart, 'emo1' )
              )}
              {degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleFullRestart, 'deg1' )
              )}
              {!degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [...filterAvailableEmotions(), '없음'], handleEmotionSelect, handleReturnToSecondEmotionChoice, 'emo2' )
              )}
              {degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleReturnToSecondEmotionChoice, 'deg2' )
              )}
              {!degreeSelected && askingPriorityQuestion && (
                renderPriorityOptions( [firstEmotion, emotion], handlePrioritySelect, 'priority' )
              )}
            </>
          )}

          {/* 결과 보기 버튼 */}
          {finished && (
            <View style={[styles.optionsContainer, styles.resultButtonContainer, { height: GRID_HEIGHT }]}>
              <TouchableOpacity onPress={handleViewResult}>
                <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.resultButtonGradient}>
                  <Text style={styles.resultButtonText}>결과 보기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- 스타일 정의 (기존과 동일) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' },
  outerContainer: { flex: 1 },
  topSpacing: { height: 40 },
  chatListContainer: { flex: 1 },
  chatContainer: { paddingBottom: 10, paddingHorizontal: 10, flexGrow: 1, },
  messageOuterContainer: { flexDirection: 'row', marginVertical: 6, },
  botRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', },
  userRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, },
  botBubble: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginLeft: 5, },
  userBubble: { backgroundColor: '#a8d8ff', borderTopRightRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginRight: 5, },
  messageText: { fontSize: 16, color: '#333', lineHeight: 22, textAlign: 'left', },
  optionsContainer: { width: '100%', paddingHorizontal: 15, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15, backgroundColor: '#eef7ff', justifyContent: 'center', },
  buttonRow: { flexDirection: 'row', width: '100%', flex: 1, },
  buttonRowMargin: { marginBottom: 10, },
  priorityButtonRow: { flexDirection: 'row', width: '100%', alignItems: 'center', },
  optionButton: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, minHeight: 45, paddingVertical: 12, },
  optionButtonEmpty: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, elevation: 0, shadowOpacity: 0, marginHorizontal: 5, minHeight: 45, },
  priorityButtonWrapper: { flex: 1, marginHorizontal: 5, justifyContent: 'center', alignItems: 'center', },
  priorityOptionButtonActual: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, paddingVertical: 10, paddingHorizontal: 15, minWidth: '60%', },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500', textAlign: 'center', },
  resultButtonContainer: { justifyContent: 'center', alignItems: 'center', },
  resultButtonGradient: { borderRadius: 10, paddingVertical: 18, paddingHorizontal: 40, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, },
  resultButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', },
});

export default SimpleDiagnosisScreen;