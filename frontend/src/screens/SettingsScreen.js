// src/screens/SettingsScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react'; // useRef 추가
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Switch,
  SafeAreaView,
  useWindowDimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { APP_DATE_OFFSET_KEY, getAppCurrentDate, formatDateTimeTo상세형식 } from '../utils/dateUtils';

// --- 상수 정의 ---
const POPUP_WIDTH_PERCENTAGE_OF_SCREEN = 0.85;
const MAX_POPUP_WIDTH_ABSOLUTE = 350;

const NOTIFICATIONS_STORAGE_KEY = 'notifications';
const BACKGROUND_MUSIC_STORAGE_KEY = 'backgroundMusic';

const DAILY_NOTIFICATION_ID = "daily-innerium-reminder";
const NOTIFICATION_HOUR = 20; // 예: 오후 8시
const NOTIFICATION_MINUTE = 0;  // 예: 0분

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SettingsScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth } = useWindowDimensions();

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] = useState(true);

  // isInitialNotificationScheduled_STATUS는 UI에 반영할 필요가 있거나,
  // 다른 useEffect 등에서 이 상태 변화에 반응해야 할 때 사용합니다.
  // 현재 로직에서는 직접적인 UI 변경은 없으므로, Ref만으로도 충분할 수 있습니다.
  // 여기서는 상태도 함께 관리하는 형태로 남겨둡니다.
  const [isInitialNotificationScheduled_STATUS, setIsInitialNotificationScheduled_STATUS] = useState(false);
  const isInitialNotificationScheduledRef = useRef(false); // Ref를 사용하여 최신 상태 추적

  const [isDateChangeModalVisible, setIsDateChangeModalVisible] = useState(false);
  const [isDateChangeCompleteModalVisible, setIsDateChangeCompleteModalVisible] = useState(false);
  const [dateChangeCompleteTitle, setDateChangeCompleteTitle] = useState("날짜 변경 완료");
  const [dateChangeCompleteMessage, setDateChangeCompleteMessage] = useState("");

  const registerForPushNotificationsAsync = async () => {
    let permissionStatus;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    permissionStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      permissionStatus = status;
    }
    if (permissionStatus !== 'granted') {
      Alert.alert('알림 권한 필요', '알림을 받으려면 설정에서 알림 권한을 허용해주세요.');
      return false;
    }
    return true;
  };

  const scheduleDailyNotification = useCallback(async () => {
    console.log("scheduleDailyNotification 호출됨");
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) {
        console.log("알림 권한 없음, 스케줄링 중단");
        return;
    }

    // 기존 알림 취소 (중복 방지)
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID);
    console.log(`기존 알림(ID: ${DAILY_NOTIFICATION_ID}) 취소 시도 완료`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "오늘의 정원 돌보기 시간이에요! 🌳",
          body: '앱을 열어 오늘의 감정을 기록하고 정원을 가꿔보세요.',
          sound: 'default',
        },
        trigger: {
          hour: NOTIFICATION_HOUR,
          minute: NOTIFICATION_MINUTE,
          repeats: true,
          channelId: 'default', // Android 채널 ID
        },
        identifier: DAILY_NOTIFICATION_ID,
      });
      console.log(`매일 ${NOTIFICATION_HOUR}시 ${NOTIFICATION_MINUTE}분에 알림이 성공적으로 스케줄되었습니다.`);
    } catch (error) {
      console.error("알림 스케줄링 실패:", error);
      Alert.alert("오류", "알림을 설정하는 중 문제가 발생했습니다.");
    }
  }, []); // useCallback 의존성 배열 비워둠 (내부에서 사용하는 props나 state가 없으므로)

  const cancelScheduledNotification = useCallback(async () => {
    console.log("cancelScheduledNotification 호출됨");
    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID);
      console.log(`스케줄된 일일 알림(ID: ${DAILY_NOTIFICATION_ID})이 성공적으로 취소되었습니다.`);
    } catch (error) {
      console.error("알림 취소 실패:", error);
      // 사용자에게 알릴 필요는 없을 수 있음 (백그라운드 작업)
    }
  }, []); // useCallback 의존성 배열 비워둠

  useEffect(() => {
    console.log("SettingsScreen useEffect 실행됨 (의존성 배열 비움)");
    const loadSettings = async () => {
      try {
        console.log("loadSettings 시작. isInitialNotificationScheduledRef.current:", isInitialNotificationScheduledRef.current);

        const notificationsSetting = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        const backgroundMusic = await AsyncStorage.getItem(BACKGROUND_MUSIC_STORAGE_KEY);

        let currentNotificationState = true; // 기본적으로 알림을 켜는 것으로 가정
        if (notificationsSetting !== null) {
          currentNotificationState = JSON.parse(notificationsSetting);
        } else {
          // AsyncStorage에 값이 없으면 초기값(true)으로 설정하고 저장
          await saveSetting(NOTIFICATIONS_STORAGE_KEY, true);
          console.log("AsyncStorage에 알림 설정 없음, true로 기본 설정 및 저장");
        }
        // 상태 업데이트는 로직 처리 후 한번에.
        // setIsNotificationsEnabled(currentNotificationState); // <- 여기서 바로 하면 다음 로직에 반영 안될 수 있음

        console.log("불러온 알림 설정(currentNotificationState):", currentNotificationState);

        // **핵심 로직: 초기 스케줄링 제어**
        if (currentNotificationState && !isInitialNotificationScheduledRef.current) {
          console.log("조건 충족: 초기 알림 스케줄링 시도...");
          await scheduleDailyNotification();
          isInitialNotificationScheduledRef.current = true; // Ref 업데이트 (즉시 반영)
          setIsInitialNotificationScheduled_STATUS(true); // 상태 업데이트 (다음 렌더링에 반영)
        } else if (!currentNotificationState && isInitialNotificationScheduledRef.current) {
          // 이전에 스케줄링 되었으나 현재 설정이 꺼져있는 경우 (예: 앱 재시작)
          console.log("조건 충족: 이전에 스케줄되었으나 현재 꺼져있음 -> 알림 취소 시도...");
          await cancelScheduledNotification();
          isInitialNotificationScheduledRef.current = false;
          setIsInitialNotificationScheduled_STATUS(false);
        } else {
            console.log("useEffect 마운트: 알림 스케줄링/취소 조건 미충족.");
            console.log("세부: currentNotificationState:", currentNotificationState, "isInitialNotificationScheduledRef.current:", isInitialNotificationScheduledRef.current);
        }

        // 모든 로직 처리 후 최종 상태 업데이트
        setIsNotificationsEnabled(currentNotificationState);

        if (backgroundMusic !== null) {
          setIsBackgroundMusicEnabled(JSON.parse(backgroundMusic));
        } else {
          await saveSetting(BACKGROUND_MUSIC_STORAGE_KEY, true);
          console.log("AsyncStorage에 배경음악 설정 없음, true로 기본 설정 및 저장");
        }

      } catch (error) { console.error('Failed to load settings:', error); }
    };

    loadSettings();
  }, []); // 의존성 배열을 비워 마운트 시 한 번만 실행되도록 합니다.

  const saveSetting = async (key, value) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.error(`Failed to save ${key}:`, error); }
  };

  const handleNotificationToggle = async (value) => {
    console.log(`handleNotificationToggle 호출됨, 새로운 값: ${value}`);
    setIsNotificationsEnabled(value); // UI 즉시 반영
    await saveSetting(NOTIFICATIONS_STORAGE_KEY, value);

    if (value) {
      console.log("사용자 토글 ON -> 알림 스케줄링 시도");
      await scheduleDailyNotification();
      isInitialNotificationScheduledRef.current = true; // Ref 업데이트
      setIsInitialNotificationScheduled_STATUS(true); // 상태 업데이트
    } else {
      console.log("사용자 토글 OFF -> 알림 취소 시도");
      await cancelScheduledNotification();
      isInitialNotificationScheduledRef.current = false; // Ref 업데이트
      setIsInitialNotificationScheduled_STATUS(false); // 상태 업데이트
    }
  };

  const handleMusicToggle = (value) => { setIsBackgroundMusicEnabled(value); saveSetting(BACKGROUND_MUSIC_STORAGE_KEY, value); };
  const handleHelpPress = () => { /* console.log('Help pressed'); */ };
  const handleLinkAccountPress = () => { /* console.log('Link account pressed'); */ };
  const handleDateChangePress = () => { setIsDateChangeModalVisible(true); };

  const handleConfirmDateChange = async () => {
    setIsDateChangeModalVisible(false);
    try {
      const currentOffsetString = await AsyncStorage.getItem(APP_DATE_OFFSET_KEY);
      const currentOffset = currentOffsetString ? parseInt(currentOffsetString, 10) : 0;
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const newOffset = currentOffset + twentyFourHoursInMs;
      await AsyncStorage.setItem(APP_DATE_OFFSET_KEY, newOffset.toString());
      const newAppDate = await getAppCurrentDate();
      const formattedDateTime = formatDateTimeTo상세형식(newAppDate);
      setDateChangeCompleteMessage(
        `앱의 현재 시간이\n${formattedDateTime}\n(으)로 업데이트 되었습니다.\n(실제 시간 경과에 따라 자동 업데이트 됩니다.)`
      );
      setIsDateChangeCompleteModalVisible(true);
    } catch (error) {
      console.error('Failed to change date offset:', error);
      Alert.alert("오류", "날짜 변경 중 오류가 발생했습니다.");
    }
  };

  const handleCancelDateChange = () => { setIsDateChangeModalVisible(false); };
  const handleDateChangeCompleteModalClose = () => { setIsDateChangeCompleteModalVisible(false); };

  const modalContentDynamicWidthStyle = {
    width: windowWidth * POPUP_WIDTH_PERCENTAGE_OF_SCREEN,
    maxWidth: MAX_POPUP_WIDTH_ABSOLUTE,
  };

  return (
    <>
      <SafeAreaView style={styles.safeAreaWithBackground}>
        {/* ... (나머지 JSX 코드는 이전과 동일하게 유지) ... */}
        <View style={styles.mainScreenContainer}>
          <View style={[styles.contentWrapper, { paddingHorizontal: windowWidth * 0.05 }]}>
            <View style={styles.settingsMenuContainer}>
              <View style={styles.settingsOptionRow}>
                <Text style={styles.settingsLabel}>계정 연동</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleLinkAccountPress}
                  disabled={isTransitioning}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkButtonText}>연동</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.settingsOptionRow}>
                <Text style={styles.settingsLabel}>알림 설정</Text>
                <Switch
                  value={isNotificationsEnabled} onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#ccc', true: '#81b0ff' }}
                  thumbColor={isNotificationsEnabled ? '#4a90e2' : '#f4f3f4'}
                  ios_backgroundColor="#ccc" style={styles.switchStyle}
                  disabled={isTransitioning}
                />
              </View>
              <View style={styles.settingsOptionRow}>
                <Text style={styles.settingsLabel}>배경 음악</Text>
                <Switch
                  value={isBackgroundMusicEnabled} onValueChange={handleMusicToggle}
                  trackColor={{ false: '#ccc', true: '#81b0ff' }}
                  thumbColor={isBackgroundMusicEnabled ? '#4a90e2' : '#f4f3f4'}
                  ios_backgroundColor="#ccc" style={styles.switchStyle}
                  disabled={isTransitioning}
                />
              </View>
              <View style={styles.settingsOptionRow}>
                <View style={styles.labelWithIconContainer}>
                  <Text style={styles.settingsLabel}>도움말</Text>
                  <TouchableOpacity
                    onPress={handleHelpPress}
                    style={styles.helpButton}
                    disabled={isTransitioning}
                    activeOpacity={0.7}
                  >
                    <Image source={IMAGES.helpIcon} style={styles.helpIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.dateChangeButtonContainer}>
              <TouchableOpacity
                onPress={handleDateChangePress}
                style={styles.dateChangeButton}
                disabled={isTransitioning}
                activeOpacity={0.7}
              >
                <Text style={styles.mainButtonText}>날짜 넘기기</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.navigationBarPlacement}>
            <NavigationBar
              onNavigate={(screen) => handleNavigate(navigation, screen)}
              isTransitioning={isTransitioning}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* 날짜 넘기기 확인 팝업 */}
      <Modal
        visible={isDateChangeModalVisible} transparent={true}
        animationType="fade" onRequestClose={handleCancelDateChange}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCancelDateChange}>
           <TouchableOpacity
             activeOpacity={1}
             style={[styles.modalContent, modalContentDynamicWidthStyle]}
            >
               <Text style={styles.modalTitle}>날짜 넘기기 확인</Text>
               <Text style={styles.modalDescription}>
                 '날짜 넘기기'는 앱의 원활한 심사를 위해 날짜 변경을 강제로 시행하는 기능입니다. 다음 날짜로 넘어가시겠습니까?
               </Text>
               <View style={styles.modalButtons}>
                 <TouchableOpacity
                    onPress={handleCancelDateChange}
                    style={[styles.modalButtonBase, styles.modalNoButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>아니요</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                    onPress={handleConfirmDateChange}
                    style={[styles.modalButtonBase, styles.modalYesButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>네</Text>
                 </TouchableOpacity>
               </View>
           </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 날짜 변경 완료 팝업 */}
      <Modal
        visible={isDateChangeCompleteModalVisible} transparent={true}
        animationType="fade" onRequestClose={handleDateChangeCompleteModalClose}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleDateChangeCompleteModalClose}>
           <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, modalContentDynamicWidthStyle]}
            >
               <Text style={styles.modalTitle}>{dateChangeCompleteTitle}</Text>
               <Text style={styles.modalDescription}>{dateChangeCompleteMessage}</Text>
               <View style={styles.modalButtons}>
                 <TouchableOpacity
                    onPress={handleDateChangeCompleteModalClose}
                    style={[styles.modalButtonBase, styles.singleButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>확인</Text>
                 </TouchableOpacity>
               </View>
           </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <StatusBar style="auto" />
    </>
  );
};

const styles = StyleSheet.create({
  // ... (스타일 코드는 이전과 동일하게 유지) ...
  safeAreaWithBackground: {
    flex: 1,
    backgroundColor: '#eef7ff',
  },
  mainScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentWrapper: {
    flex: 1,
  },
  settingsMenuContainer: {
    flex: 1,
    paddingTop: 40,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingsLabel: {
    fontSize: 17,
    color: '#495057',
    fontWeight: '500',
  },
  labelWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButton: {
    borderWidth: 1,
    borderColor: '#adb5bd',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  switchStyle: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  helpButton: {
    padding: 5,
    marginLeft: 8,
  },
  helpIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  dateChangeButtonContainer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 20,
  },
  dateChangeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    maxWidth: 300,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationBarPlacement: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 15,
  },
  modalButtonBase: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalYesButton: {
    backgroundColor: '#2196F3',
    flex: 1,
  },
  modalNoButton: {
    backgroundColor: '#757575',
    flex: 1,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  singleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 40,
  }
});

export default SettingsScreen;