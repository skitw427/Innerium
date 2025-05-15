// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Switch,
  SafeAreaView,
  useWindowDimensions, // 화면 크기를 가져오기 위해 import
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { APP_DATE_OFFSET_KEY, getAppCurrentDate, formatDateToYYYYMMDD, formatDateTimeTo상세형식 } from '../utils/dateUtils';

// --- 상수 정의 (HomeScreen과 중복될 수 있으나, 여기서는 SettingsScreen 전용으로 관리) ---
const POPUP_WIDTH_PERCENTAGE_OF_SCREEN = 0.85; // 팝업 너비가 화면 너비의 85%
const MAX_POPUP_WIDTH_ABSOLUTE = 350;         // 팝업의 최대 절대 너비

const SettingsScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width: windowWidth } = useWindowDimensions(); // 화면 너비 가져오기

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] = useState(false);
  const [isDateChangeModalVisible, setIsDateChangeModalVisible] = useState(false);
  const [isDateChangeCompleteModalVisible, setIsDateChangeCompleteModalVisible] = useState(false);
  const [dateChangeCompleteTitle, setDateChangeCompleteTitle] = useState("날짜 변경 완료");
  const [dateChangeCompleteMessage, setDateChangeCompleteMessage] = useState("");


  useEffect(() => {
    const loadSettings = async () => {
      try {
        const notifications = await AsyncStorage.getItem('notifications');
        const backgroundMusic = await AsyncStorage.getItem('backgroundMusic');
        if (notifications !== null) setIsNotificationsEnabled(JSON.parse(notifications));
        if (backgroundMusic !== null) setIsBackgroundMusicEnabled(JSON.parse(backgroundMusic));
      } catch (error) { console.error('Failed to load settings:', error); }
    };
    loadSettings();
  }, []);

  const saveSetting = async (key, value) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.error(`Failed to save ${key}:`, error); }
  };

  const handleNotificationToggle = (value) => { setIsNotificationsEnabled(value); saveSetting('notifications', value); };
  const handleMusicToggle = (value) => { setIsBackgroundMusicEnabled(value); saveSetting('backgroundMusic', value); };
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
  const handleConfirmDateChangeModalClose = () => { setIsDateChangeModalVisible(false); };
  const handleDateChangeCompleteModalClose = () => { setIsDateChangeCompleteModalVisible(false); };

  // 팝업 컨텐츠의 동적 너비 스타일
  const modalContentDynamicWidthStyle = {
    width: windowWidth * POPUP_WIDTH_PERCENTAGE_OF_SCREEN,
    maxWidth: MAX_POPUP_WIDTH_ABSOLUTE,
  };

  return (
    <>
      <SafeAreaView style={styles.safeAreaWithBackground}>
        <View style={styles.mainScreenContainer}>
          <View style={[styles.contentWrapper, { paddingHorizontal: windowWidth * 0.05 }]}>
            <View style={styles.settingsMenuContainer}>
              <View style={styles.settingsOptionRow}>
                <Text style={styles.settingsLabel}>계정 연동</Text>
                <TouchableOpacity style={styles.linkButton} onPress={handleLinkAccountPress}>
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
                />
              </View>
              <View style={styles.settingsOptionRow}>
                <Text style={styles.settingsLabel}>배경 음악</Text>
                <Switch
                  value={isBackgroundMusicEnabled} onValueChange={handleMusicToggle}
                  trackColor={{ false: '#ccc', true: '#81b0ff' }}
                  thumbColor={isBackgroundMusicEnabled ? '#4a90e2' : '#f4f3f4'}
                  ios_backgroundColor="#ccc" style={styles.switchStyle}
                />
              </View>
              <View style={styles.settingsOptionRow}>
                <View style={styles.labelWithIconContainer}>
                  <Text style={styles.settingsLabel}>도움말</Text>
                  <TouchableOpacity onPress={handleHelpPress} style={styles.helpButton}>
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
        animationType="fade" onRequestClose={handleConfirmDateChangeModalClose}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleConfirmDateChangeModalClose}>
           <TouchableOpacity 
             activeOpacity={1} 
             style={[styles.modalContent, modalContentDynamicWidthStyle]} // 동적 너비 적용
            >
             {/* View 제거: TouchableOpacity가 이미 View 역할을 함 */}
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
            style={[styles.modalContent, modalContentDynamicWidthStyle]} // 동적 너비 적용
            >
            {/* View 제거 */}
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
  // modalContentContainer는 제거하거나, TouchableOpacity에 병합
  modalContent: { // 이 스타일은 이제 팝업의 내부 패딩 및 기본 모양만 담당
    // width, maxWidth는 상위 TouchableOpacity에서 동적으로 설정됨
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
    paddingHorizontal: 40, // 이 값을 조절하여 단일 버튼의 너비를 설정
  }
});

export default SettingsScreen;