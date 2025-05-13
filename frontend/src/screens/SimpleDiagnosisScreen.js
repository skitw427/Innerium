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
    // 메시지 기록에서 첫 번째 감정 정도 선택 이후 메시지 제거
    setMessages(prev => {
        const firstEmotionConfirmationIndex = prev.findIndex(m => m.sender === 'user' && m.text === `${firstDegree}`);
        // 해당 인덱스를 찾지 못하면 전체 재시작과 유사하게 동작 (안전 장치)
        if (firstEmotionConfirmationIndex === -1) return [{ id: makeId(), sender: 'bot', text: '안녕하세요! 어떤 기분으로 하루를 보내셨나요?' }];
        // 첫 번째 감정 정도 확인 메시지 다음 봇 메시지까지 유지
        const historyToKeep = prev.slice(0, firstEmotionConfirmationIndex + 2);
        // 다시 질문하는 봇 메시지 추가
        return [ ...historyToKeep, { id: makeId(), sender: 'bot', text: '혹시 오늘 또 다른 감정을 느끼진 않으셨나요? (다시 선택)' }, ];
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

  // 결과 보기 및 저장/네비게이션 핸들러
  const handleViewResult = async () => {
    // 중복 실행 방지
    if (isSubmittingResult) return;
    setIsSubmittingResult(true); // 로딩 상태 시작

    let primaryEmotion = "감정 정보 없음"; // 최종 주요 감정
    let primaryEmotionKey = null;        // 최종 주요 감정 키

    // 첫 번째 감정이 있고 정도가 선택된 경우에만 주요 감정 결정 로직 실행
    if (firstEmotion && firstDegree !== null) {
      // 시나리오 1: 두 번째 감정이 '없음'이거나 선택되지 않은 경우 -> 첫 번째 감정이 주요 감정
      if (secondEmotion === '없음' || !secondEmotion) {
        primaryEmotion = firstEmotion;
      }
      // 시나리오 2: 두 번째 감정과 정도가 모두 선택된 경우
      else if (secondEmotion && secondDegree !== null) {
        if (firstDegree > secondDegree) { // 첫 번째 감정 정도가 더 높으면
          primaryEmotion = firstEmotion;
        } else if (secondDegree > firstDegree) { // 두 번째 감정 정도가 더 높으면
          primaryEmotion = secondEmotion;
        } else { // 두 감정의 정도가 같은 경우
          // 우선순위 질문에서 선택된 감정을 사용
          if (prioritySelectedEmotion) {
            primaryEmotion = prioritySelectedEmotion;
          } else {
            // 우선순위 질문이 스킵되었거나 사용자가 선택하지 않은 예외 케이스
            // 기본 정책으로 첫 번째 감정을 사용
            primaryEmotion = firstEmotion;
            console.warn("Priority emotion was expected but not set. Defaulting to first emotion.");
          }
        }
      }
    }

    // 결과 알림 메시지 생성
    let resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`;
    // 만약 primaryEmotion이 초기값("감정 정보 없음") 그대로라면
    if (primaryEmotion === "감정 정보 없음") {
        // 첫번째 감정이라도 있으면 그걸로 표시
        if (firstEmotion) {
            primaryEmotion = firstEmotion;
            resultAlertMessage = `오늘 주로 느낀 감정은 '${primaryEmotion}'입니다.`;
        } else {
            // 첫번째 감정조차 없으면 정보 없음으로 최종 결정
            resultAlertMessage = "감정 정보를 확인할 수 없습니다.";
        }
    }

    // 결정된 주요 감정에 해당하는 키 찾기
    primaryEmotionKey = emotionToKeyMap[primaryEmotion] || null;

    // 디버깅을 위한 결과 로그 출력
    console.log("--- 진단 결과 데이터 ---");
    console.log("첫번째 감정:", firstEmotion, "| 정도:", firstDegree);
    console.log("두번째 감정:", secondEmotion, "| 정도:", secondDegree);
    console.log("우선순위 선택 감정:", prioritySelectedEmotion);
    console.log("주요 감정:", primaryEmotion, "| 키:", primaryEmotionKey);
    console.log("------------------------");

    try {
      // 앱의 현재 날짜 가져오기
      const currentAppDate = await getAppCurrentDate();
      const formattedCurrentAppDate = formatDateToYYYYMMDD(currentAppDate);

      // 마지막 진단 날짜 저장 (오늘 날짜)
      await AsyncStorage.setItem(LAST_DIAGNOSIS_DATE_KEY, formattedCurrentAppDate);
      console.log(`[SimpleDiagnosisScreen] Saved last diagnosis date: ${formattedCurrentAppDate}`);

      // 감정 로그 저장 (키가 있을 경우에만)
      if (primaryEmotionKey) {
          const emotionLogKey = `${EMOTION_LOG_PREFIX}${formattedCurrentAppDate}`;
          await AsyncStorage.setItem(emotionLogKey, primaryEmotionKey);
          console.log(`[SimpleDiagnosisScreen] Saved emotion log for ${formattedCurrentAppDate}: ${primaryEmotionKey}`);
      } else {
          // 키가 없는 경우 (예: "감정 정보 없음") 로그 저장 안 함
          console.log(`[SimpleDiagnosisScreen] No primary emotion key to save for ${formattedCurrentAppDate}.`);
          // 필요하다면 이전에 저장된 로그를 삭제하는 로직 추가 가능
          // await AsyncStorage.removeItem(`${EMOTION_LOG_PREFIX}${formattedCurrentAppDate}`);
      }

      // 결과 데이터와 함께 홈 화면 탭으로 이동
      navigation.navigate('MainTabs', { // 네비게이터 이름 확인 필요
        screen: 'Home', // 탭 내의 스크린 이름
        params: {
          diagnosisResult: resultAlertMessage, // 결과 메시지
          emotionKey: primaryEmotionKey,       // 감정 키
          diagnosisCompletedToday: true,       // 오늘 진단 완료 플래그
          diagnosisMessages: messages,         // 대화 기록 전달
        },
        merge: true, // 기존 파라미터와 병합 (선택적)
      });
    } catch (error) {
      // 오류 발생 시 사용자에게 알림
      console.error("Error saving data or navigating:", error);
      Alert.alert("오류", "결과 처리 중 문제가 발생했습니다.");
      setIsSubmittingResult(false); // 오류 발생 시 버튼 다시 활성화
    }
    // 성공적으로 네비게이션하면 화면이 언마운트되므로 로딩 상태 해제 불필요
  };

  // JSX 렌더링
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 키보드 나타날 때 화면 가리지 않도록 설정 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // iOS 상단 여백 고려
      >
        <View style={styles.outerContainer}>
          {/* 상단 여백 */}
          <View style={styles.topSpacing} />
          {/* 채팅 메시지 목록 */}
          <View style={styles.chatListContainer}>
            <FlatList
              ref={flatListRef} // 스크롤 제어 위한 ref
              data={messages} // 메시지 데이터 배열
              keyExtractor={item => item.id} // 각 항목의 고유 키
              renderItem={({ item }) => ( // 각 메시지 렌더링 방식 정의
                <View style={[
                  styles.messageOuterContainer, // 메시지 행 전체 컨테이너
                  item.sender === 'bot' ? styles.botRowContainer : styles.userRowContainer // 발신자에 따른 정렬
                ]}>
                  <View style={[
                    styles.messageBubble, // 말풍선 기본 스타일
                    item.sender === 'bot' ? styles.botBubble : styles.userBubble // 발신자에 따른 말풍선 스타일
                  ]}>
                    <Text style={styles.messageText}>{item.text}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.chatContainer} // FlatList 내부 컨텐츠 스타일
            />
          </View>

          {/* 진단이 완료되지 않았을 때 옵션 버튼 영역 */}
          {!finished && (
            <>
              {/* 첫 번째 감정 선택 */}
              {!degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( availableEmotions, handleEmotionSelect, handleFullRestart, 'emo1' )
              )}
              {/* 첫 번째 감정 정도 선택 */}
              {degreeSelected && !askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleFullRestart, 'deg1' )
              )}
              {/* 두 번째 감정 선택 */}
              {!degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [...filterAvailableEmotions(), '없음'], handleEmotionSelect, handleReturnToSecondEmotionChoice, 'emo2' )
              )}
              {/* 두 번째 감정 정도 선택 */}
              {degreeSelected && askingSecondEmotion && !askingPriorityQuestion && (
                renderOptionButtons( [1, 2, 3, 4, 5, 6, 7, '다시'], handleDegreeSelect, handleReturnToSecondEmotionChoice, 'deg2' )
              )}
              {/* 우선순위 감정 선택 */}
              {!degreeSelected && askingPriorityQuestion && (
                // 옵션으로 첫번째 확정 감정과 현재 선택된 두번째 감정 전달
                renderPriorityOptions( [firstEmotion, currentSelectedEmotion], handlePrioritySelect, 'priority' )
              )}
            </>
          )}

          {/* 진단이 완료되었을 때 결과 보기 버튼 영역 */}
          {finished && (
            <View style={[styles.optionsContainer, styles.resultButtonContainer, { height: GRID_HEIGHT }]}>
              <TouchableOpacity
                onPress={handleViewResult}
                disabled={isSubmittingResult} // 처리 중일 때 비활성화
                style={isSubmittingResult ? styles.disabledResultButton : {}} // 비활성화 시 스타일 적용
                activeOpacity={isSubmittingResult ? 1 : 0.7} // 비활성화 시 터치 효과 없앰
              >
                {/* 그라데이션 배경 버튼 */}
                <LinearGradient
                  colors={isSubmittingResult ? ['#BDBDBD', '#9E9E9E'] : ['#4CAF50', '#8BC34A']} // 처리 중일 때 회색 그라데이션
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

// 스타일 정의
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef7ff' }, // 전체 화면 배경색
  outerContainer: { flex: 1 }, // SafeArea 내부 전체 컨테이너
  topSpacing: { height: 40 }, // 상단 여백
  chatListContainer: { flex: 1 }, // 채팅 목록 영역이 남은 공간 차지
  chatContainer: { paddingBottom: 10, paddingHorizontal: 10, flexGrow: 1, }, // FlatList 내부 패딩 및 컨텐츠 아래 정렬
  messageOuterContainer: { flexDirection: 'row', marginVertical: 6, }, // 각 메시지 행
  botRowContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', }, // 봇 메시지 왼쪽 정렬
  userRowContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', }, // 사용자 메시지 오른쪽 정렬
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, }, // 말풍선 기본 스타일
  botBubble: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginLeft: 5, }, // 봇 말풍선 스타일
  userBubble: { backgroundColor: '#a8d8ff', borderTopRightRadius: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, marginRight: 5, }, // 사용자 말풍선 스타일
  messageText: { fontSize: 16, color: '#333', lineHeight: 22, textAlign: 'left', }, // 메시지 텍스트 스타일
  optionsContainer: { // 옵션 버튼 영역 컨테이너
    width: '100%',
    paddingHorizontal: 15, // 좌우 패딩
    paddingTop: 10, // 상단 패딩
    paddingBottom: Platform.OS === 'ios' ? 25 : 15, // 하단 패딩 (iOS 홈 인디케이터 고려)
    backgroundColor: '#eef7ff', // 배경색
    justifyContent: 'center', // 내부 요소들 수직 중앙 정렬
  },
  buttonRow: { // 옵션 버튼 행 (2개씩)
    flexDirection: 'row',
    width: '100%',
    flex: 1, // 행이 높이를 균등하게 나눠가지도록
  },
  buttonRowMargin: { marginBottom: 10, }, // 버튼 행 사이 간격
  priorityButtonRow: { // 우선순위 선택 버튼 행
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center', // 내부 버튼들 수직 중앙 정렬
    flex: 1,
    justifyContent: 'center' // 버튼들을 중앙에 배치
  },
  optionButton: { // 일반 옵션 버튼
    flex: 1, // 행 내에서 너비를 균등하게 나눠가지도록
    backgroundColor: '#ffffff', // 배경색
    borderWidth: 1,
    borderColor: '#d0d0d0', // 테두리 색
    borderRadius: 8, // 모서리 둥글게
    alignItems: 'center', // 텍스트 수평 중앙 정렬
    justifyContent: 'center', // 텍스트 수직 중앙 정렬
    marginHorizontal: 5, // 버튼 좌우 간격
    elevation: 1, // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    minHeight: 45, // 최소 높이
    paddingVertical: 12, // 상하 패딩
  },
  optionButtonEmpty: { // 빈 공간 채우는 투명 버튼 스타일
    flex: 1,
    backgroundColor: 'transparent', // 배경 투명
    borderWidth: 0, // 테두리 없음
    elevation: 0,
    shadowOpacity: 0,
    marginHorizontal: 5,
    minHeight: 45,
  },
  priorityButtonWrapper: { // 우선순위 버튼 감싸는 래퍼 (flex: 0.5 적용)
    flex: 0.5, // 각 버튼이 너비의 절반 차지
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityOptionButtonActual: { // 우선순위 버튼 실제 스타일
    width: '100%', // 래퍼 너비 꽉 채움
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
    paddingVertical: 12,
    minHeight: 45,
  },
  optionText: { // 옵션 버튼 텍스트
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  resultButtonContainer: { // 결과 보기 버튼 컨테이너
    justifyContent: 'center', // 수직 중앙 정렬
    alignItems: 'center', // 수평 중앙 정렬
  },
  resultButtonGradient: { // 결과 보기 그라데이션 버튼
    borderRadius: 10,
    paddingVertical: 18, // 상하 패딩 크게
    paddingHorizontal: 40, // 좌우 패딩 크게
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 150, // 최소 너비
    alignItems: 'center', // 텍스트 중앙 정렬
    justifyContent: 'center',
  },
  resultButtonText: { // 결과 보기 버튼 텍스트
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledResultButton: { opacity: 0.6, }, // 비활성화 시 투명도 조절
});

export default SimpleDiagnosisScreen;