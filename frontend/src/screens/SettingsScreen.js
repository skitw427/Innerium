// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar'; // StatusBar import 유지
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Switch,
  SafeAreaView, // SafeAreaView import 유지
  useWindowDimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';

const SettingsScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width } = useWindowDimensions();

  // --- 상태 및 핸들러 (이전과 동일) ---
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] = useState(false);
  const [isDateChangeModalVisible, setIsDateChangeModalVisible] = useState(false);

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
  const handleHelpPress = () => { console.log('Help pressed'); };
  const handleLinkAccountPress = () => { console.log('Link account pressed'); };
  const handleDateChangePress = () => { setIsDateChangeModalVisible(true); };
  const handleConfirmDateChange = () => { console.log('Date changed'); setIsDateChangeModalVisible(false); };
  const handleCancelDateChange = () => { setIsDateChangeModalVisible(false); };
  const handleModalClose = () => { setIsDateChangeModalVisible(false); };


  return (
    // --- 수정: 최상위를 Fragment로 감싸기 ---
    <>
      {/* --- 화면 내용 부분 (SafeAreaView와 내부 View) --- */}
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
          {/* 설정 메뉴 영역 */}
          <View style={styles.settingsMenuContainer}>
            {/* 계정 연동 옵션 */}
            <View style={styles.settingsOptionRow}>
              <Text style={styles.settingsLabel}>계정 연동</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleLinkAccountPress}>
                <Text style={styles.linkButtonText}>연동</Text>
              </TouchableOpacity>
            </View>
            {/* 알림 설정 옵션 */}
            <View style={styles.settingsOptionRow}>
              <Text style={styles.settingsLabel}>알림 설정</Text>
              <Switch
                value={isNotificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#ccc', true: '#81b0ff' }}
                thumbColor={isNotificationsEnabled ? '#4a90e2' : '#f4f3f4'}
                ios_backgroundColor="#ccc"
                style={styles.switchStyle}
              />
            </View>
            {/* 배경 음악 옵션 */}
            <View style={styles.settingsOptionRow}>
              <Text style={styles.settingsLabel}>배경 음악</Text>
              <Switch
                value={isBackgroundMusicEnabled}
                onValueChange={handleMusicToggle}
                trackColor={{ false: '#ccc', true: '#81b0ff' }}
                thumbColor={isBackgroundMusicEnabled ? '#4a90e2' : '#f4f3f4'}
                ios_backgroundColor="#ccc"
                style={styles.switchStyle}
              />
            </View>
            {/* 도움말 옵션 */}
            <View style={styles.settingsOptionRow}>
              <View style={styles.labelWithIconContainer}>
                <Text style={styles.settingsLabel}>도움말</Text>
                <TouchableOpacity onPress={handleHelpPress} style={styles.helpButton}>
                  <Image source={IMAGES.helpIcon} style={styles.helpIcon} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 날짜 넘기기 버튼 */}
          <View style={styles.dateChangeButtonContainer}>
            <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
              <TouchableOpacity onPress={handleDateChangePress} style={styles.touchableButton} disabled={isTransitioning}>
                <Text style={styles.buttonText}>날짜 넘기기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* 하단 네비게이션 바 */}
          <NavigationBar
            onNavigate={(screen) => handleNavigate(navigation, screen)}
            isTransitioning={isTransitioning}
          />
        </View>
      </SafeAreaView>

      {/* --- 수정: Modal을 SafeAreaView 밖으로 이동 --- */}
      <Modal
        visible={isDateChangeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        {/* 모달 오버레이 및 컨텐츠 (스타일은 그대로 유지) */}
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
           <TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}>
             <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>날짜 넘기기 확인</Text>
               <Text style={styles.modalDescription}>
                 '날짜 넘기기'는 앱의 원활한 심사를 위해 날짜 변경을 강제로 시행하는 기능입니다. 다음 날짜로 넘어가시겠습니까?
               </Text>
               <View style={styles.modalButtons}>
                 <LinearGradient colors={['#BDBDBD', '#9E9E9E']} style={styles.modalButtonGradient}>
                   <TouchableOpacity onPress={handleCancelDateChange} style={styles.modalButton}>
                     <Text style={styles.modalButtonText}>아니요</Text>
                   </TouchableOpacity>
                 </LinearGradient>
                 <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.modalButtonGradient}>
                   <TouchableOpacity onPress={handleConfirmDateChange} style={styles.modalButton}>
                     <Text style={styles.modalButtonText}>네</Text>
                   </TouchableOpacity>
                 </LinearGradient>
               </View>
             </View>
           </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* StatusBar는 Fragment 내부에 위치 */}
      <StatusBar style="auto" />
    </> // Fragment 끝
  );
};

// SettingsScreen 스타일 정의
const styles = StyleSheet.create({
  safeArea: { // SafeAreaView는 이제 투명, flex만 담당
    flex: 1,
    // backgroundColor 제거
  },
  container: { // 실제 내용 컨테이너가 배경색 및 레이아웃 담당
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#eef7ff', // 화면 배경색
    // paddingHorizontal은 JSX에서 동적으로 적용
  },
  settingsMenuContainer: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
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
  },
  gradientButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    minWidth: 150,
    alignItems: 'center',
  },
  touchableButton: {
    // 필요한 경우 스타일 추가
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- 모달 스타일 (변경 없음, flex: 1 오버레이가 전체 화면 덮어야 함) ---
  modalOverlay: {
    flex: 1, // 중요: 오버레이가 Modal 컴포넌트 영역 전체를 채우도록 함
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentContainer: { },
  modalContent: {
    width: '80%',
    maxWidth: 350,
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
  modalButtonGradient: {
    borderRadius: 8,
    flex: 1,
    maxWidth: 150,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;