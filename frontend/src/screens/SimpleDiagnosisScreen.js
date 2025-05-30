// src/screens/SimpleDiagnosisScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { saveDailyRecord } from '../api/apiClient';
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
// LinearGradient는 "결과 보기" 버튼에 더 이상 사용되지 않으므로 제거합니다.
// import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppCurrentDate, formatDateToYYYYMMDD } from '../utils/dateUtils';

// 옵션 영역 높이 상수
const GRID_HEIGHT = 260;

// 감정 이름과 이미지 키 매핑
const emotionToKeyMap = {
  '행복': 'H', '불안': 'Ax', '평온': 'R', '슬픔': 'S',
  '분노': 'Ag', '두려움': 'F', '갈망': 'Dr', '역겨움': 'Dg',
};

const emotionNameToIdMap = {
  '분노': 1,
  '불안': 2,
  '역겨움': 3,
  '갈망': 4,
  '두려움': 5,
  '행복': 6,
  '평온': 7,
  '슬픔': 8,
};
// AsyncStorage 키 정의
const LAST_DIAGNOSIS_DATE_KEY = '@lastDiagnosisDate';
const EMOTION_LOG_PREFIX = '@emotionLog_'; // 달력과 공유할 키 접두사

// 배열을 주어진 크기로 나누는 유틸리티 함수
const chunk = (arr, size) => {
    const res = [];
    const tempArr = [...arr];
    // 배열 길이가 size의 배수가 아니면 null을 추가하여 맞춤 (단, size가 1보다 클 때)
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
                // 빈 공간을 채우기 위한 투명 뷰
                <View style={[styles.optionButton, styles.optionButtonEmpty]} key={`${keyPrefix}-b-${rowIndex}-empty-${colIndex}`} />
              ) : (
                <TouchableOpacity
                  key={`${keyPrefix}-b-${rowIndex}-${opt}`}
                  style={styles.optionButton}
                  onPress={() => (opt === '다시' ? onRestart() : onSelect(opt))}
                >
                  <Text style={styles.optionText}>
                    {/* '다시' 옵션은 텍스트를 다르게 표시 */}
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
    // options는 [firstEmotion, secondEmotion] 형태의 배열
    const chunkedOptions = chunk(options, 2); // 결과는 항상 [[firstEmotion, secondEmotion]]
    return (
      <View style={[styles.optionsContainer, { height: GRID_HEIGHT }]}>
        {chunkedOptions.map((row, rowIndex) => ( // 실제로는 row가 하나
          <View style={[styles.priorityButtonRow]} key={`${keyPrefix}-r-${rowIndex}`}>
            {row.map((opt) => {
              // 옵션이 null이 아닐 경우에만 버튼 렌더링 (chunk 로직 대비)
              if (opt === null) return null;
              return (
                // 각 버튼을 감싸는 View 추가 (flex: 0.5 적용 위함)
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
  // 고유 ID 생성 함수
  const makeId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // State 정의
  const [messages, setMessages] = useState([ { id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }, ]);
  const [degreeSelected, setDegreeSelected] = useState(false); // 현재 정도 선택 단계인지 여부
  const [currentSelectedEmotion, setCurrentSelectedEmotion] = useState(''); // 현재 선택/처리 중인 감정
  const [firstEmotion, setFirstEmotion] = useState(''); // 확정된 첫번째 감정
  const [currentSelectedDegree, setCurrentSelectedDegree] = useState(null); // 현재 선택/처리 중인 정도
  const [firstDegree, setFirstDegree] = useState(null); // 확정된 첫번째 감정의 정도
  const [secondEmotion, setSecondEmotion] = useState(''); // 확정된 두번째 감정 (또는 '없음')
  const [secondDegree, setSecondDegree] = useState(null); // 확정된 두번째 감정의 정도
  const [prioritySelectedEmotion, setPrioritySelectedEmotion] = useState(''); // 우선순위 질문에서 선택된 감정

  const [askingSecondEmotion, setAskingSecondEmotion] = useState(false); // 두 번째 감정 질문 단계인지 여부
  const [askingPriorityQuestion, setAskingPriorityQuestion] = useState(false); // 우선순위 질문 단계인지 여부
  const [availableEmotions] = useState([ '행복', '불안', '평온', '슬픔', '분노', '두려움', '갈망', '역겨움', ]); // 선택 가능한 감정 목록
  const [finished, setFinished] = useState(false); // 진단 완료 여부
  const [isSubmittingResult, setIsSubmittingResult] = useState(false); // 결과 처리 중 로딩 상태
  const flatListRef = useRef(null); // FlatList 참조 (자동 스크롤용)

  // 메시지 목록 변경 시 맨 아래로 스크롤
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // 첫 번째 선택된 감정을 제외한 나머지 감정 목록 필터링
  const filterAvailableEmotions = () => availableEmotions.filter(e => e !== firstEmotion);

  // 감정 선택 핸들러
  const handleEmotionSelect = (option) => {
    setAskingPriorityQuestion(false); // 우선순위 질문 단계 초기화
    setCurrentSelectedEmotion(option); // 현재 선택된 감정 업데이트

    if (askingSecondEmotion) { // 두 번째 감정 선택 단계
      if (option === '없음') {
        // '없음' 선택 시 바로 결과 표시 단계로
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setSecondEmotion('없음'); // 두 번째 감정 '없음'으로 확정
        setSecondDegree(null);
        setFinished(true); // 완료 상태로 변경
        setAskingSecondEmotion(false); // 두 번째 감정 질문 단계 종료
        setDegreeSelected(false); // 버튼 영역을 결과 보기 버튼으로 교체
      } else {
        // 다른 감정 선택 시 정도 질문 단계로
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
        setDegreeSelected(true); // 정도 선택 버튼 표시
      }
    } else { // 첫 번째 감정 선택 단계
      setFirstEmotion(option); // 첫 번째 감정 확정
      setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: option }, { id: makeId(), sender: 'bot', text: '그 감정의 정도는 어땠나요?' },]);
      setDegreeSelected(true); // 정도 선택 버튼 표시
      setAskingSecondEmotion(false); // 두 번째 감정 질문 단계 아님
    }
   };

  // 정도 선택 핸들러
  const handleDegreeSelect = (value) => {
    const numericValue = Number(value);
    // 유효하지 않은 값 선택 시 처리 중단
    if (isNaN(numericValue) || numericValue < 1 || numericValue > 7) {
        console.error("Invalid degree value selected:", value);
        return;
    }
    setCurrentSelectedDegree(numericValue); // 현재 선택된 정도 업데이트
    setMessages(prev => [ ...prev, { id: makeId(), sender: 'user', text: `${numericValue}` },]);

    if (askingSecondEmotion) { // 두 번째 감정의 정도 선택 후
      setSecondEmotion(currentSelectedEmotion); // 두 번째 감정 확정
      setSecondDegree(numericValue);           // 두 번째 감정의 정도 확정

      if (numericValue === firstDegree) { // 첫 번째 감정의 정도와 같다면 우선순위 질문
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '두 감정 중 오늘 더 크게 느낀 감정은 무엇인가요?' },]);
        setAskingPriorityQuestion(true); // 우선순위 질문 단계로
        setDegreeSelected(false); // 우선순위 선택 버튼 보이도록
        setAskingSecondEmotion(false); // 두 번째 감정 질문 단계 종료
      } else { // 정도가 다르면 바로 결과
        setMessages(prev => [ ...prev, { id: makeId(), sender: 'bot', text: '알겠습니다. 결과가 나왔어요!' },]);
        setFinished(true); // 완료 상태로 변경
        setDegreeSelected(false); // 결과 보기 버튼 표시
        setAskingSecondEmotion(false); // 두 번째 감정 질문 단계 종료
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

  // 우선순위 감정 선택 핸들러
  const handlePrioritySelect = (priorityEmotion) => {
    setPrioritySelectedEmotion(priorityEmotion); // 우선순위 선택된 감정 저장
    setMessages(prev => [
        ...prev,
        { id: makeId(), sender: 'user', text: priorityEmotion },
        { id: makeId(), sender: 'bot', text: `알겠습니다. ${priorityEmotion}을 더 크게 느끼셨군요. 결과가 나왔어요!` },
    ]);
    setFinished(true); // 완료 상태로 변경
    setAskingPriorityQuestion(false); // 우선순위 질문 단계 종료
    setDegreeSelected(false); // 결과 보기 버튼 표시
  };

  // 전체 다시 시작 핸들러
  const handleFullRestart = () => {
    // 모든 상태 초기화
    setMessages([{ id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }]);
    setDegreeSelected(false);
    setCurrentSelectedEmotion(''); setFirstEmotion(''); setSecondEmotion(''); setPrioritySelectedEmotion('');
    setCurrentSelectedDegree(null); setFirstDegree(null); setSecondDegree(null);
    setAskingSecondEmotion(false); setAskingPriorityQuestion(false); setFinished(false);
    setIsSubmittingResult(false);
  };

  // 두 번째 감정 선택 단계로 돌아가기 핸들러
  const handleReturnToSecondEmotionChoice = () => {
    setMessages(prev => {
        const firstEmotionConfirmationIndex = prev.findIndex(m => m.sender === 'user' && m.text === `${firstDegree}`);
        if (firstEmotionConfirmationIndex === -1) {
            // 안전 장치: 첫 번째 감정 정도 확인 메시지를 찾지 못하면 전체 재시작과 유사하게 동작
            return [{ id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }];
        }
        // 첫 번째 감정 정도 확인 메시지 다음 봇 메시지(두 번째 감정 질문)까지만 유지
        const historyToKeep = prev.slice(0, firstEmotionConfirmationIndex + 2);
        // <<<< 수정된 부분: 새로운 봇 메시지를 추가하지 않음 >>>>
        return historyToKeep;
    });
    // 두 번째 감정 관련 상태 초기화
    setCurrentSelectedEmotion(''); setSecondEmotion(''); setPrioritySelectedEmotion('');
    setCurrentSelectedDegree(null); setSecondDegree(null);
    // UI 상태 조정
    setDegreeSelected(false); // 감정 선택 버튼 표시
    setAskingSecondEmotion(true); // 두 번째 감정 질문 단계로 설정
    setAskingPriorityQuestion(false);
    setFinished(false);
   };
  /**
   * 채팅 메시지 배열을 서버 전송용 질문-답변 배열로 변환
   * @param {Array<{id: string, sender: string, text: string}>} messages - 채팅 메시지 배열
   * @returns {Array<{question: string, answer: string}>}
   */
  const transformMessagesToQuestionsAnswers = (messages) => {
    const questionsAnswers = [];
    if (!Array.isArray(messages)) {
      console.warn("transformMessagesToQuestionsAnswers: messages is not an array.");
      return questionsAnswers;
    }

    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];
      if (currentMessage.sender === 'bot') {
        const questionText = currentMessage.text;
        let answerText = null;

        // 바로 다음 메시지가 사용자의 응답인지 확인
        if (i + 1 < messages.length && messages[i + 1].sender === 'user') {
          answerText = messages[i + 1].text;
          i++;
          console.warn(`No user answer found for bot question: "${questionText}"`);
        }

        // 질문과 답변이 모두 유효할 때만 추가
        if (questionText && answerText !== null) {
          questionsAnswers.push({
            question: questionText,
            answer: answerText,
          });
        }
      }
    }
    return questionsAnswers;
  };
  // 결과 보기 및 저장/네비게이션 핸들러
  const handleViewResult = async () => {
    if (isSubmittingResult) return;
    setIsSubmittingResult(true); // 로딩 상태 시작

    // --- 0. API 전송을 위한 감정 및 정도 결정 ---
    let apiFirstEmotionName = firstEmotion;
    let apiFirstEmotionDegree = firstDegree;
    let apiSecondEmotionName = secondEmotion;
    let apiSecondEmotionDegree = secondDegree;

    if (firstEmotion && firstDegree !== null && secondEmotion && secondEmotion !== '없음' && secondDegree !== null) {
      if (firstDegree < secondDegree) {
        apiFirstEmotionName = secondEmotion;
        apiFirstEmotionDegree = secondDegree;
        apiSecondEmotionName = firstEmotion;
        apiSecondEmotionDegree = firstDegree;
      } else if (firstDegree === secondDegree) {
        if (prioritySelectedEmotion && prioritySelectedEmotion === secondEmotion) {
          apiFirstEmotionName = secondEmotion;
          apiFirstEmotionDegree = secondDegree;
          apiSecondEmotionName = firstEmotion;
          apiSecondEmotionDegree = firstDegree;
        }
      }
    }

    setFirstEmotion(apiFirstEmotionName);
    setFirstDegree(apiFirstEmotionDegree);
    setSecondEmotion(apiSecondEmotionName);
    setSecondDegree(apiSecondEmotionDegree);

    // --- 1. 서버에 전송할 데이터 준비 ---
    const firstEmotionId = emotionNameToIdMap[apiFirstEmotionName] || null;
    const firstEmotionAmount = apiFirstEmotionDegree;
    const recordData = {};

    if (firstEmotionId !== null && typeof firstEmotionId === 'number' &&
        firstEmotionAmount !== null && typeof firstEmotionAmount === 'number') {
      recordData.first_emotion_id = firstEmotionId;
      recordData.first_emotion_amount = firstEmotionAmount;
    } else {
      console.error("Validation Error: First emotion data is missing or invalid.", {
        apiFirstEmotionName, apiFirstEmotionDegree, firstEmotionId, firstEmotionAmount
      });
      Alert.alert("오류", "첫 번째 감정 정보가 올바르지 않아 저장할 수 없습니다.\n앱을 다시 시작해주세요.");
      setIsSubmittingResult(false);
      return;
    }

    if (apiSecondEmotionName && apiSecondEmotionName !== '없음' && apiSecondEmotionDegree !== null) {
      const tempSecondEmotionId = emotionNameToIdMap[apiSecondEmotionName] || null;
      const tempSecondEmotionAmount = apiSecondEmotionDegree;
      if (tempSecondEmotionId !== null && typeof tempSecondEmotionId === 'number' &&
          tempSecondEmotionAmount !== null && typeof tempSecondEmotionAmount === 'number') {
        recordData.second_emotion_id = tempSecondEmotionId;
        recordData.second_emotion_amount = tempSecondEmotionAmount;
      } else {
        console.warn("Second emotion data was intended but could not be resolved to valid ID/Amount.", {
          apiSecondEmotionName, apiSecondEmotionDegree, tempSecondEmotionId, tempSecondEmotionAmount
        });
      }
    }

    const questionsAndAnswersForAPI = transformMessagesToQuestionsAnswers(messages);
    recordData.questions_answers = questionsAndAnswersForAPI;
    
    try {
      const appCurrentDate = await getAppCurrentDate();
      if (appCurrentDate && appCurrentDate instanceof Date && !isNaN(appCurrentDate)) {
        recordData.record_date = appCurrentDate.toISOString();
      } else {
        console.warn("Could not get a valid appCurrentDate. Server time will be used.");
      }
      await saveDailyRecord(recordData);
      console.log('[SimpleDiagnosisScreen] Daily record saved to server successfully.');

      // --- 3. 서버 저장 성공 후, 로컬 저장 및 화면 이동 ---
      let primaryEmotion = "감정 정보 없음";
      let primaryEmotionKey = null;

      if (apiFirstEmotionName && apiFirstEmotionDegree !== null) primaryEmotion = apiFirstEmotionName;
      else {
        primaryEmotion = apiFirstEmotionName; // 만약 degree가 null이어도 이름은 유지
        console.warn("Degree for primary emotion might be null. Defaulting to first emotion name.");
      }

      let resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`;
      if (primaryEmotion === "감정 정보 없음" && apiFirstEmotionName) {
        primaryEmotion = apiFirstEmotionName;
        resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`;
      } else if (primaryEmotion === "감정 정보 없음") {
        resultAlertMessage = "감정 정보를 확인할 수 없습니다.";
      }
      primaryEmotionKey = emotionToKeyMap[primaryEmotion] || null;

      console.log("--- 진단 결과 데이터 (For AsyncStorage & Navigation) ---");
      console.log("첫번째 감정:", apiFirstEmotionName, "| 정도:", apiFirstEmotionDegree);
      console.log("두번째 감정:", apiSecondEmotionName, "| 정도:", apiSecondEmotionDegree);
      console.log("우선순위 선택 감정:", prioritySelectedEmotion);
      console.log("주요 감정:", primaryEmotion, "| 키:", primaryEmotionKey);
      console.log("----------------------------------------------------");

      const currentAppDateForStorage = await getAppCurrentDate();
      const formattedCurrentAppDate = formatDateToYYYYMMDD(currentAppDateForStorage);

      await AsyncStorage.setItem(LAST_DIAGNOSIS_DATE_KEY, formattedCurrentAppDate);
      console.log(`[SimpleDiagnosisScreen] Saved last diagnosis date: ${formattedCurrentAppDate}`);

      if (primaryEmotionKey) {
          const emotionLogKey = `${EMOTION_LOG_PREFIX}${formattedCurrentAppDate}`;
          // <<<< 중요 변경: 상세 정보 저장 >>>>
          const dataToStore = {
              emotionKey: primaryEmotionKey,
              emotionName: primaryEmotion, 
              messages: messages,          // 현재까지의 대화 기록 전체
              creationDate: formattedCurrentAppDate // YYYY-MM-DD 형식
          };
          await AsyncStorage.setItem(emotionLogKey, JSON.stringify(dataToStore));
          console.log(`[SimpleDiagnosisScreen] Saved detailed emotion log for ${formattedCurrentAppDate}:`, dataToStore);
      } else {
          console.log(`[SimpleDiagnosisScreen] No primary emotion key to save for ${formattedCurrentAppDate}.`);
      }

      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: {
          diagnosisResult: resultAlertMessage,
          emotionKey: primaryEmotionKey,
          primaryEmotionName: primaryEmotion, // HomeScreen에서 사용할 수 있도록 전달
          diagnosisCompletedToday: true,
          diagnosisMessages: messages, // HomeScreen 결과 모달용으로도 전달 (선택적)
          diagnosisDate: currentAppDateForStorage // HomeScreen에서 사용할 수 있도록 전달
        },
        merge: true,
      });

    } catch (error) {
      console.error("Error saving data or navigating:", error);
      let errorMessage = "결과 처리 중 문제가 발생했습니다.";
      if (error.response) {
        errorMessage = `서버에 저장 중 오류가 발생했습니다. (상태: ${error.response.status})`;
      } else if (error.request) {
        errorMessage = "서버 응답이 없습니다. 네트워크 연결을 확인해주세요.";
      }
      Alert.alert("오류", errorMessage);
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
                style={[
                  styles.resultButtonActual,
                  isSubmittingResult && styles.disabledResultButtonActual
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.resultButtonText}>
                  {isSubmittingResult ? "처리 중..." : "결과 보기"}
                </Text>
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
  optionsContainer: {
    width: '100%', paddingHorizontal: 15, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    backgroundColor: '#eef7ff', justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', width: '100%', flex: 1, },
  buttonRowMargin: { marginBottom: 10, },
  priorityButtonRow: { flexDirection: 'row', width: '100%', alignItems: 'center', flex: 1, justifyContent: 'center' },
  optionButton: {
    flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 5, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
    minHeight: 45, paddingVertical: 12,
  },
  optionButtonEmpty: {
    flex: 1, backgroundColor: 'transparent', borderWidth: 0,
    elevation: 0, shadowOpacity: 0, marginHorizontal: 5, minHeight: 45,
  },
  priorityButtonWrapper: { flex: 0.5, marginHorizontal: 5, justifyContent: 'center', alignItems: 'center', },
  priorityOptionButtonActual: {
    width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d0d0',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 1, paddingVertical: 12, minHeight: 45,
  },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500', textAlign: 'center', },
  resultButtonContainer: { justifyContent: 'center', alignItems: 'center', },
  resultButtonActual: {
    backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 18,
    paddingHorizontal: 40, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2,
    minWidth: 150, alignItems: 'center', justifyContent: 'center',
  },
  disabledResultButtonActual: { backgroundColor: '#BDBDBD', },
  resultButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', },
});

export default SimpleDiagnosisScreen;