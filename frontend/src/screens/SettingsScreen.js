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
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// LinearGradient는 이제 팝업 버튼에도 사용하지 않으므로 제거 가능 (만약 다른 곳에서 안 쓴다면)
// import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images';
import { APP_DATE_OFFSET_KEY, getAppCurrentDate, formatDateToYYYYMMDD, formatDateTimeTo상세형식 } from '../utils/dateUtils';

const SettingsScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width } = useWindowDimensions();

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
  const handleHelpPress = () => { /* console.log('Help pressed'); */ };
  const handleLinkAccountPress = () => { /* console.log('Link account pressed'); */ };
  const handleDateChangePress = () => { setIsDateChangeModalVisible(true); };

  const handleConfirmDateChange = async () => {
    try {
      const currentOffsetString = await AsyncStorage.getItem(APP_DATE_OFFSET_KEY);
      const currentOffset = currentOffsetString ? parseInt(currentOffsetString, 10) : 0;

      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const newOffset = currentOffset + twentyFourHoursInMs;

      await AsyncStorage.setItem(APP_DATE_OFFSET_KEY, newOffset.toString());

      const newAppDate = await getAppCurrentDate();
      const formattedDateTime = formatDateTimeTo상세형식(newAppDate);

      Alert.alert(
        "날짜 변경 완료",
        `앱의 현재 시간이\n${formattedDateTime}\n(으)로 업데이트 되었습니다.\n(실제 시간 경과에 따라 자동 업데이트 됩니다.)`,
        [{ text: "확인" }]
      );
    } catch (error) {
      console.error('Failed to change date offset:', error);
      Alert.alert("오류", "날짜 변경 중 오류가 발생했습니다.");
    }
    setIsDateChangeModalVisible(false);
  };

  const handleCancelDateChange = () => { setIsDateChangeModalVisible(false); };
  const handleModalClose = () => { setIsDateChangeModalVisible(false); };

  return (
    <>
      <SafeAreaView style={styles.safeAreaWithBackground}>
        <View style={styles.mainScreenContainer}>
          <View style={[styles.contentWrapper, { paddingHorizontal: width * 0.05 }]}>
            <View style={styles.settingsMenuContainer}>
              {/* ... (계정 연동, 알림, 배경 음악, 도움말 설정 옵션은 동일) ... */}
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

      <Modal
        visible={isDateChangeModalVisible} transparent={true}
        animationType="fade" onRequestClose={handleModalClose}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
           <TouchableOpacity activeOpacity={1} style={styles.modalContentContainer}>
             <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>날짜 넘기기 확인</Text>
               <Text style={styles.modalDescription}>
                 '날짜 넘기기'는 앱의 원활한 심사를 위해 날짜 변경을 강제로 시행하는 기능입니다. 다음 날짜로 넘어가시겠습니까?
               </Text>
               <View style={styles.modalButtons}>
                 {/* "아니요" 버튼 - HomeScreen의 닫기 버튼 스타일 적용 */}
                 <TouchableOpacity
                    onPress={handleCancelDateChange}
                    style={[styles.modalButtonBase, styles.modalNoButton]} // 새로운 스타일 적용
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>아니요</Text>
                 </TouchableOpacity>
                 {/* "네" 버튼 - HomeScreen의 대화 기록 보기 버튼 스타일 적용 */}
                 <TouchableOpacity
                    onPress={handleConfirmDateChange}
                    style={[styles.modalButtonBase, styles.modalYesButton]} // 새로운 스타일 적용
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>네</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <StatusBar style="auto" />
    </>
  );
};

const styles = StyleSheet.create({
  // ... (기존 스타일 safeAreaWithBackground부터 helpIcon까지는 동일)
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
    // 그림자 효과 제거
    // elevation: 3,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.2,
    // shadowRadius: 1.5,
  },
  mainButtonText: { // "날짜 넘기기" 버튼 텍스트 (기존 buttonText에서 이름 변경)
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationBarPlacement: {
    width: '100%',
  },
  // Modal 스타일
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentContainer: {},
  modalContent: {
    width: '80%',
    maxWidth: 350,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5, // 모달 자체의 그림자는 유지 (선택 사항)
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
    justifyContent: 'center', // 버튼들을 중앙에 배치 (또는 space-around 등)
    width: '100%',
    gap: 15,
  },
  // 모달 버튼 공통 스타일 (HomeScreen의 flowerInfoButton과 유사하게)
  modalButtonBase: {
    borderRadius: 8,
    paddingVertical: 10, // HomeScreen flowerInfoButton과 동일하게
    // paddingHorizontal: 20, // HomeScreen flowerInfoButton과 동일하게 (내부 텍스트에 따라 자동 조절되도록 제거 또는 유지)
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // 가능한 공간을 버튼들이 나눠 가짐
    minHeight: 44, // 최소 터치 높이 (선택 사항)
    // maxWidth: 150, // 각 버튼의 최대 너비 (선택 사항, 필요시 주석 해제)
  },
  // "네" 버튼 스타일 (HomeScreen의 대화 기록 보기 버튼 스타일)
  modalYesButton: {
    backgroundColor: '#2196F3',
  },
  // "아니요" 버튼 스타일 (HomeScreen의 닫기 버튼 스타일)
  modalNoButton: {
    backgroundColor: '#757575',
  },
  modalButtonText: { // 모달 버튼 텍스트 (HomeScreen의 flowerInfoButtonText와 동일하게)
    color: '#fff',
    fontSize: 16, // HomeScreen flowerInfoButtonText와 동일하게
    fontWeight: 'bold', // HomeScreen flowerInfoButtonText와 동일하게
  },
});

export default SettingsScreen;