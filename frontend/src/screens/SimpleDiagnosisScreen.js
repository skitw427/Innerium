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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';

// 옵션 영역 높이 상수
const GRID_HEIGHT = 260;

// 감정 이름과 이미지 키 매핑
const emotionToKeyMap = {
  '행복': 'H', '불안': 'Ax', '평온': 'R', '슬픔': 'S',
  '분노': 'Ag', '두려움': 'F', '갈망': 'Dr', '역겨움': 'Dg',
};

// AsyncStorage 키 정의
const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';

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
    const chunkedOptions = chunk(options, 2); // options는 [firstEmotion, secondEmotion] 형태
    return (
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => ( // 실제로는 row가 하나일 것
          <View style={[styles.priorityButtonRow]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt) => {
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
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const [messages, setMessages] = useState([ { id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }, ]);
  const [degreeSelected, setDegreeSelected] = useState(false);
  const [currentSelectedEmotion, setCurrentSelectedEmotion] = useState(''); // 현재 선택/처리 중인 감정 (첫번째 또는 두번째)
  const [firstEmotion, setFirstEmotion] = useState(''); // 확정된 첫번째 감정
  const [currentSelectedDegree, setCurrentSelectedDegree] = useState(null); // 현재 선택/처리 중인 정도
  const [firstDegree, setFirstDegree] = useState(null); // 확정된 첫번째 감정의 정도
  const [secondEmotion, setSecondEmotion] = useState(''); // 확정된 두번째 감정 (또는 '없음')
  const [secondDegree, setSecondDegree] = useState(null); // 확정된 두번째 감정의 정도
  const [prioritySelectedEmotion, setPrioritySelectedEmotion] = useState(''); // 우선순위 질문에서 선택된 감정

  const [askingSecondEmotion, setAskingSecondEmotion] = useState(false);
  const [askingPriorityQuestion, setAskingPriorityQuestion] = useState(false);
  const [availableEmotions] = useState([ '행복', '불안', '평온', '슬픔', '분노', '두려움', '갈망', '역겨움', ]);
  const [finished, setFinished] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const filterAvailableEmotions = () => availableEmotions.filter(e => e !== firstEmotion);

  const handleEmotionSelect = (option) => {
    setAskingPriorityQuestion(false);
    setCurrentSelectedEmotion(option); // 현재 선택된 감정 업데이트

    if (askingSecondEmotion) { // 두 번째 감정 선택 단계
      if (option === '없음') {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setSecondEmotion('없음'); // 두 번째 감정 '없음'으로 확정
        setSecondDegree(null);
        setFinished(true);
        setAskingSecondEmotion(false);
        setDegreeSelected(false);
      } else {
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
        setDegreeSelected(true); // 정도 선택 단계로
      }
    } else { // 첫 번째 감정 선택 단계
      setFirstEmotion(option); // 첫 번째 감정 확정
      setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
      setDegreeSelected(true);
      setAskingSecondEmotion(false);
    }
   };

  const handleDegreeSelect = (value) => {
    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue < 1 || numericValue > 7) {
        console.error("Invalid degree value selected:", value);
        return;
    }
    setCurrentSelectedDegree(numericValue); // 현재 선택된 정도 업데이트
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: `${numericValue}` },]);

    if (askingSecondEmotion) { // 두 번째 감정의 정도 선택 후
      setSecondEmotion(currentSelectedEmotion); // 두 번째 감정 확정
      setSecondDegree(numericValue);           // 두 번째 감정의 정도 확정

      if (numericValue === firstDegree) { // 첫 번째 감정의 정도와 같다면
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '두 감정 중 오늘 더 크게 느낀 감정은 무엇인가요?' },]);
        setAskingPriorityQuestion(true);
        setDegreeSelected(false); // 우선순위 선택 버튼 보이도록
        setAskingSecondEmotion(false);
      } else { // 정도가 다르면 바로 결과
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setFinished(true);
        setDegreeSelected(false);
        setAskingSecondEmotion(false);
      }
    } else { // 첫 번째 감정의 정도 선택 후
      setFirstDegree(numericValue); // 첫 번째 감정의 정도 확정
      setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요?' },]);
      setAskingSecondEmotion(true); // 두 번째 감정 질문 단계로
      setDegreeSelected(false); // 감정 선택 버튼 보이도록
      setCurrentSelectedEmotion(''); // 다음 감정 선택을 위해 초기화
      setCurrentSelectedDegree(null);
    }
   };

  const handlePrioritySelect = (priorityEmotion) => {
    setPrioritySelectedEmotion(priorityEmotion); // ★★★ 우선순위 선택된 감정 저장 ★★★
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
    setDegreeSelected(false);
    setCurrentSelectedEmotion(''); setFirstEmotion(''); setSecondEmotion(''); setPrioritySelectedEmotion('');
    setCurrentSelectedDegree(null); setFirstDegree(null); setSecondDegree(null);
    setAskingSecondEmotion(false); setAskingPriorityQuestion(false); setFinished(false);
    setIsSubmittingResult(false);
  };

  const handleReturnToSecondEmotionChoice = () => {
    setMessages(prev => {
        const firstEmotionConfirmationIndex = prev.findIndex(m => m.sender === 'user' && m.text === `${firstDegree}`);
        const historyToKeep = prev.slice(0, firstEmotionConfirmationIndex + 2);
        return [ ...historyToKeep, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요? (다시 선택)' }, ];
    });
    setCurrentSelectedEmotion(''); setSecondEmotion(''); setPrioritySelectedEmotion('');
    setCurrentSelectedDegree(null); setSecondDegree(null);
    setDegreeSelected(false);
    setAskingSecondEmotion(true);
    setAskingPriorityQuestion(false);
    setFinished(false);
   };

  const handleViewResult = async () => {
    if (isSubmittingResult) return;
    setIsSubmittingResult(true);

    let primaryEmotion = "감정 정보 없음"; // 최종 주요 감정

    if (firstEmotion && firstDegree !== null) {
      // 시나리오 1: 두 번째 감정이 '없음'이거나 선택되지 않은 경우
      if (secondEmotion === '없음' || !secondEmotion) {
        primaryEmotion = firstEmotion;
      }
      // 시나리오 2: 두 번째 감정도 선택된 경우
      else if (secondEmotion && secondDegree !== null) {
        if (firstDegree > secondDegree) {
          primaryEmotion = firstEmotion;
        } else if (secondDegree > firstDegree) {
          primaryEmotion = secondEmotion;
        } else { // firstDegree === secondDegree (점수가 같은 경우)
          // ★★★ 우선순위 질문에서 선택된 감정을 사용 ★★★
          if (prioritySelectedEmotion) {
            primaryEmotion = prioritySelectedEmotion;
          } else {
            // 이 경우는 우선순위 질문이 스킵되었거나 (로직 오류) 사용자가 선택하지 않은 극히 드문 경우.
            // 정책에 따라 첫 번째 감정 또는 다른 값을 기본값으로 사용.
            primaryEmotion = firstEmotion; // 예: 첫 번째 감정을 기본으로
            console.warn("Priority emotion was expected but not set. Defaulting to first emotion.");
          }
        }
      }
    }

    let resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`;
    if (primaryEmotion === "감정 정보 없음") {
        if (firstEmotion) { // 첫번째 감정이라도 있으면 그걸로 표시
            resultAlertMessage = `오늘 주로 느낀 감정은 '${firstEmotion}'입니다.`;
            primaryEmotion = firstEmotion;
        } else {
            resultAlertMessage = "감정 정보를 확인할 수 없습니다.";
        }
    }

    const emotionKey = emotionToKeyMap[primaryEmotion] || null;

    console.log("--- 진단 결과 데이터 ---");
    console.log("첫번째 감정:", firstEmotion, "| 정도:", firstDegree);
    console.log("두번째 감정:", secondEmotion, "| 정도:", secondDegree);
    console.log("우선순위 선택 감정:", prioritySelectedEmotion);
    console.log("주요 감정:", primaryEmotion, "| 이미지 키:", emotionKey);
    console.log("------------------------");

    try {
      const currentAppDate = await getAppCurrentDate();
      const formattedCurrentAppDate = formatDateToYYYYMMDD(currentAppDate);
      await AsyncStorage.setItem(LAST_DIAGNOSIS_DATE_KEY, formattedCurrentAppDate);
      console.log(`[SimpleDiagnosisScreen] Saved last diagnosis date: ${formattedCurrentAppDate}`);

      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: {
          diagnosisResult: resultAlertMessage,
          emotionKey: emotionKey,
          diagnosisCompletedToday: true,
        }
      });
    } catch (error) {
      console.error("Error saving last diagnosis date or navigating:", error);
      Alert.alert("오류", "결과 처리 중 문제가 발생했습니다.");
      setIsSubmittingResult(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={styles.outerContainer}>
          <View style={styles.topSpacing} />
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
              {/* 우선순위 질문 시 옵션은 확정된 firstEmotion과 현재 선택된 currentSelectedEmotion (두번째 감정) */}
              {!degreeSelected && askingPriorityQuestion && (
                renderPriorityOptions( [firstEmotion, currentSelectedEmotion], handlePrioritySelect, 'priority' )
              )}
            </>
          )}
          {finished && (
            <View style={[styles.optionsContainer, styles.resultButtonContainer, { height: GRID_HEIGHT }]}>
              <TouchableOpacity
                onPress={handleViewResult}
                disabled={isSubmittingResult}
                style={isSubmittingResult ? styles.disabledResultButton : {}}
                activeOpacity={isSubmittingResult ? 1 : 0.7}
              >
                <LinearGradient
                  colors={isSubmittingResult ? ['#BDBDBD', '#9E9E9E'] : ['#4CAF50', '#8BC34A']}
                  style={styles.resultButtonGradient}
                >
                  <Text style={styles.resultButtonText}>
                    {isSubmittingResult ? "처리 중..." : "결과 보기"}
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
  priorityButtonRow: { flexDirection: 'row', width: '100%', alignItems: 'center', flex: 1, justifyContent: 'center' },
  optionButton: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, minHeight: 45, paddingVertical: 12, },
  optionButtonEmpty: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, elevation: 0, shadowOpacity: 0, marginHorizontal: 5, minHeight: 45, },
  priorityButtonWrapper: { flex: 0.5, marginHorizontal: 5, justifyContent: 'center', alignItems: 'center', },
  priorityOptionButtonActual: { width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, paddingVertical: 12, minHeight: 45, },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500', textAlign: 'center', },
  resultButtonContainer: { justifyContent: 'center', alignItems: 'center', },
  resultButtonGradient: {
    borderRadius: 10, paddingVertical: 18, paddingHorizontal: 40, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, minWidth: 150,
    alignItems: 'center', justifyContent: 'center',
  },
  resultButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', },
  disabledResultButton: { opacity: 0.6, },
});

export default SimpleDiagnosisScreen;