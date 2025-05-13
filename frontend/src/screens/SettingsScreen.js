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
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import useScreenTransition from '../hooks/useScreenTransition';
import IMAGES from '../constants/images'; // IMAGES 경로가 올바른지 확인해주세요.
// 유틸리티 함수 import (formatDateTimeTo상세형식 포함)
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

      const newAppDate = await getAppCurrentDate(); // 변경된 오프셋으로 앱 현재 날짜 다시 계산

      // 날짜와 시간을 포맷팅
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
  const handleModalClose = () => { setIsDateChangeModalVisible(false); }; // Modal의 onRequestClose 핸들러

  return (
    <>
      <SafeAreaView style={styles.safeAreaWithBackground}>
        <View style={styles.mainScreenContainer}>
          <View style={[styles.contentWrapper, { paddingHorizontal: width * 0.05 }]}>
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
                  {/* IMAGES.helpIcon이 정의되어 있다고 가정합니다. */}
                  <TouchableOpacity onPress={handleHelpPress} style={styles.helpButton}>
                    <Image source={IMAGES.helpIcon} style={styles.helpIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.dateChangeButtonContainer}>
              <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.gradientButton}>
                <TouchableOpacity onPress={handleDateChangePress} style={styles.touchableButton} disabled={isTransitioning}>
                  <Text style={styles.buttonText}>날짜 넘기기</Text>
                </TouchableOpacity>
              </LinearGradient>
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
        animationType="fade" onRequestClose={handleModalClose} // 안드로이드 뒤로가기 버튼 등으로 모달 닫힐 때 호출
      >
        {/* Modal 바깥 영역 클릭 시 닫기 위한 TouchableOpacity */}
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleModalClose}>
           {/* Modal 컨텐츠 영역이 바깥 영역 클릭에 영향받지 않도록 TouchableOpacity로 감쌈 */}
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
    paddingTop: 40, // 필요에 따라 조정
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18, // 상하 패딩
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef', // 구분선 색상
  },
  settingsLabel: {
    fontSize: 17,
    color: '#495057', // 레이블 텍스트 색상
    fontWeight: '500',
  },
  labelWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButton: {
    borderWidth: 1,
    borderColor: '#adb5bd', // 버튼 테두리 색상
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
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], // 스위치 크기 미세 조정
  },
  helpButton: {
    padding: 5, // 아이콘 주변 터치 영역 확보
    marginLeft: 8,
  },
  helpIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  dateChangeButtonContainer: {
    alignItems: 'center', // 버튼 중앙 정렬
    paddingBottom: 20, // 하단 여백
    paddingTop: 20, // 상단 여백 (메뉴와 버튼 사이 공간)
  },
  gradientButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    minWidth: 150, // 버튼 최소 너비
    alignItems: 'center',
    elevation: 3, // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  touchableButton: {
    width: '100%', // LinearGradient 내부에서 전체 너비 차지
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff', // 버튼 텍스트 색상
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationBarPlacement: {
    width: '100%',
    // position: 'absolute', // 필요에 따라 (absolute 사용 시 mainScreenContainer에서 justifyContent 조정)
    // bottom: 0,
  },
  // Modal 스타일
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 반투명 배경
  },
  modalContentContainer: { // 모달 컨텐츠 영역이 배경 클릭에 반응하지 않도록 함
    // 이 TouchableOpacity는 activeOpacity={1}로 설정되어 클릭 효과가 없음
    // 특별한 스타일링이 필요하지 않을 수 있음
  },
  modalContent: {
    width: '80%', // 화면 너비의 80%
    maxWidth: 350, // 최대 너비 제한
    padding: 20,
    backgroundColor: '#fff', // 모달 배경색
    borderRadius: 10,
    alignItems: 'center', // 내부 요소들 중앙 정렬
    elevation: 5, // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
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
    lineHeight: 21, // 줄 간격
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center', // 버튼들을 중앙에 배치 (또는 space-around 등)
    width: '100%', // 버튼 컨테이너가 모달 너비 전체 차지
    gap: 15, // 버튼 사이 간격 (React Native 0.70 이상 지원)
             // gap 미지원 시, 각 버튼에 marginHorizontal 등으로 간격 조절
  },
  modalButtonGradient: {
    borderRadius: 8,
    flex: 1, // 가능한 공간을 버튼들이 나눠 가짐
    maxWidth: 150, // 각 버튼의 최대 너비 (선택 사항)
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 15, // 버튼 내부 패딩
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;