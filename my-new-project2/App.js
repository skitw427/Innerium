import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  ScrollView,
  Switch,
  ImageBackground,
  SafeAreaView,
  useWindowDimensions,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // AsyncStorage 불러오기
import { LinearGradient } from 'expo-linear-gradient';  // LinearGradient 임포트

const IMAGES = {
  background: require('./assets/GardenBackground.jpg'),
  calendarIcon: require('./assets/Calendar.png'),
  homeIcon: require('./assets/Garden.png'),
  storageIcon: require('./assets/Storage.png'),
  settingsIcon: require('./assets/Settings.png'),
  calendarScreen: require('./assets/CalendarScreen.png'),
  helpIcon: require('./assets/QuestionMark.png'),
  treeImage: require('./assets/Tree_0.png'),

  // Flowers/Ag 폴더 안의 이미지 추가
  Ag1: require('./assets/Flowers/Ag/Ag_1.png'),
  Ag2: require('./assets/Flowers/Ag/Ag_2.png'),
  Ag3: require('./assets/Flowers/Ag/Ag_3.png'),
  Ag4: require('./assets/Flowers/Ag/Ag_4.png'),
  Ag5: require('./assets/Flowers/Ag/Ag_5.png'),
  Ag6: require('./assets/Flowers/Ag/Ag_6.png'),
  Ag7: require('./assets/Flowers/Ag/Ag_7.png'),
  Ag8: require('./assets/Flowers/Ag/Ag_8.png'),
  Ag9: require('./assets/Flowers/Ag/Ag_9.png'),
  Ag10: require('./assets/Flowers/Ag/Ag_10.png'),
  Ag11: require('./assets/Flowers/Ag/Ag_11.png'),
  Ag12: require('./assets/Flowers/Ag/Ag_12.png'),
  Ag13: require('./assets/Flowers/Ag/Ag_13.png'),
  Ag14: require('./assets/Flowers/Ag/Ag_14.png'),
  Ag15: require('./assets/Flowers/Ag/Ag_15.png'),
  Ag16: require('./assets/Flowers/Ag/Ag_16.png'),
};


const NavigationBar = ({ onNavigate, isTransitioning }) => {
  const buttons = [
    { screen: 'Calendar', icon: IMAGES.calendarIcon },
    { screen: 'Home', icon: IMAGES.homeIcon },
    { screen: 'Storage', icon: IMAGES.storageIcon },
    { screen: 'Settings', icon: IMAGES.settingsIcon },
  ];

  return (
    <View style={styles.buttonContainer}>
      {buttons.map(({ screen, icon }) => (
        <TouchableOpacity
          key={screen}
          onPress={() => onNavigate(screen)}
          style={[styles.button, isTransitioning && styles.buttonDisabled]}
          disabled={isTransitioning}
        >
          <Image source={icon} style={styles.buttonImage} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const useScreenTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNavigate = useCallback((navigation, screen) => {
    // 화면 전환 애니메이션이 진행 중이라면, 화면을 다시 전환하지 않음
    if (isTransitioning) return;

    // 애니메이션이 진행 중인 상태로 설정
    setIsTransitioning(true);
    
    // 화면 전환
    navigation.navigate(screen);

    // 애니메이션 딜레이 후에 상태를 false로 설정
    setTimeout(() => {
      setIsTransitioning(false);
    }, 10);
  }, [isTransitioning]);

  return { isTransitioning, handleNavigate };
};

const HomeScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width, height } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false);  // 모달 상태 관리

  // 감정 진단하기 버튼 클릭 시 모달 표시
  const handleEmotionCheckPress = () => {
    console.log('감정 진단하기 버튼 클릭됨');
    setIsModalVisible(true);  // 모달을 열도록 상태를 변경
  };

  // 심층 진단 클릭
  const handleConfirmEmotionCheck = () => {
    console.log('심층 진단 확인');
    setIsModalVisible(false);  // 모달을 닫음
  };

  // 간단 진단 클릭
  const handleSimpleEmotionCheck = () => {
    console.log('간단 진단 확인');
    setIsModalVisible(false);  // 모달을 닫음
    navigation.navigate('SimpleDiagnosis');
  };

  // 팝업 외부를 클릭했을 때 모달 닫기
  const handleModalClose = () => {
    setIsModalVisible(false);
   };

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 0, paddingBottom: 0 }}>
      <ImageBackground
        source={IMAGES.background}
        style={[styles.container, { paddingHorizontal: width * 0.05, flex: 1 }]}
        resizeMode="cover"
      >
        <View style={{ flex: 1, width: '100%' }} />

       {/* tree_0 이미지 추가 */}
        <View style={styles.treeImageContainer}>
          <Image
            source={IMAGES.treeImage}
            style={styles.treeImage}
            resizeMode="contain"
          />
        </View>

        {/* 감정 진단하기 버튼 */}
        <View style={styles.emotionCheckContainer}>
          <LinearGradient
            colors={['#4CAF50', '#8BC34A']}
            style={styles.dateChangeButton}
          >
            <TouchableOpacity
              style={styles.dateChangeButton}
              onPress={handleEmotionCheckPress}  // 버튼 클릭 시 모달 열기
            >
              <Text style={styles.dateChangeText}>감정 진단하기</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* 감정 진단하기 모달 */}
        <Modal
          visible={isModalVisible}  // 상태에 따라 모달 표시
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)} // Android 백버튼 클릭 시 닫힘
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={handleModalClose}>
            {/* 클릭 시 모달 외부를 닫기 위해 TouchableOpacity로 감싸기 */}
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>감정 진단을 시작하시겠습니까?</Text>
              <View style={styles.modalButtons}>
                <LinearGradient
                  colors={['#4CAF50', '#8BC34A']}
                  style={styles.modalButton}
                >
                  <TouchableOpacity onPress={handleSimpleEmotionCheck} style={styles.modalButton}>
                    <Text style={styles.modalButtonText}>간단 진단</Text>
                  </TouchableOpacity>
                </LinearGradient>
                <LinearGradient
                  colors={['#4CAF50', '#8BC34A']}
                  style={styles.modalButton}
                >
                  <TouchableOpacity onPress={handleConfirmEmotionCheck} style={styles.modalButton}>
                    <Text style={styles.modalButtonText}>심층 진단</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        <NavigationBar
          onNavigate={(screen) => handleNavigate(navigation, screen)}
          isTransitioning={isTransitioning}
        />
        <StatusBar style="dark" />
      </ImageBackground>
    </SafeAreaView>
  );
};

const SimpleDiagnosisScreen = () => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'bot', text: '안녕하세요! 오늘 기분은 어떤가요?' },
  ]);

  const flatListRef = useRef(null);

  const handleOptionSelect = (option) => {
    // 메시지를 추가한 후, 새로운 메시지가 추가된 후 스크롤을 맨 아래로 이동시킴
    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages,
        { id: String(prevMessages.length + 1), sender: 'user', text: option },
        { id: String(prevMessages.length + 2), sender: 'bot', text: '감사합니다! 추가 질문이 있습니다.' },
      ];
      return newMessages;
    });

    // 새로운 메시지가 추가된 후, FlatList를 맨 아래로 스크롤
    setTimeout(() => {
      flatListRef.current.scrollToEnd({ animated: true });
    }, 100);  // 메시지가 추가된 후 약간의 지연을 두어 스크롤 효과가 제대로 나타나게 함
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSpacing} />

      {/* 채팅 영역 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageContainer,
              item.sender === 'bot' ? styles.botMessage : styles.userMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.chatContainer}
        style={styles.chatList}
      />

      {/* 객관식 선택지 */}
      <View style={styles.optionsContainer}>
        {/* 8개의 옵션 버튼을 4행 2열로 배치 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('기쁨')}>
            <Text style={styles.optionText}>기쁨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('즐거움')}>
            <Text style={styles.optionText}>즐거움</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('평온')}>
            <Text style={styles.optionText}>평온</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('슬픔')}>
            <Text style={styles.optionText}>슬픔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('분노')}>
            <Text style={styles.optionText}>분노</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('두려움')}>
            <Text style={styles.optionText}>두려움</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('갈망')}>
            <Text style={styles.optionText}>갈망</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionSelect('역겨움')}>
            <Text style={styles.optionText}>역겨움</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const CalendarScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width, height } = useWindowDimensions();

  return (
    <SafeAreaView style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
      <View style={styles.calendarImageContainer}>
        <Image
          source={IMAGES.calendarScreen}
          style={{ width: '100%', height: height * 0.7 }}
          resizeMode="contain"
        />
      </View>
      <NavigationBar
        onNavigate={(screen) => handleNavigate(navigation, screen)}
        isTransitioning={isTransitioning}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const StorageScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const { width } = useWindowDimensions();
  const slots = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <SafeAreaView
      style={[styles.container, { paddingHorizontal: width * 0.05, paddingTop: 30 }]} // 여기서만 위쪽 여백 추가
    >
      <ScrollView
        contentContainerStyle={styles.storageContainer}
        showsVerticalScrollIndicator={true}
      >
        {slots.map((num) => (
          <TouchableOpacity key={num} style={styles.storageButton}>
            <View style={styles.emptyBox}>
              <Text style={styles.boxText}>{num}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <NavigationBar
        onNavigate={(screen) => handleNavigate(navigation, screen)}
        isTransitioning={isTransitioning}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { isTransitioning, handleNavigate } = useScreenTransition();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] = useState(false);
  const { width } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // 앱이 로드될 때 AsyncStorage에서 값 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const notifications = await AsyncStorage.getItem('notifications');
        const backgroundMusic = await AsyncStorage.getItem('backgroundMusic');

        if (notifications !== null) {
          setIsNotificationsEnabled(JSON.parse(notifications));
        }
        if (backgroundMusic !== null) {
          setIsBackgroundMusicEnabled(JSON.parse(backgroundMusic));
        }
      } catch (error) {
        console.error('Failed to load settings from AsyncStorage', error);
      }
    };

    loadSettings();
  }, []);

  // 상태가 변경될 때마다 AsyncStorage에 저장하기
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('notifications', JSON.stringify(isNotificationsEnabled));
        await AsyncStorage.setItem('backgroundMusic', JSON.stringify(isBackgroundMusicEnabled));
      } catch (error) {
        console.error('Failed to save settings to AsyncStorage', error);
      }
    };

    saveSettings();
  }, [isNotificationsEnabled, isBackgroundMusicEnabled]);

  const handleHelpPress = () => {
    console.log('도움말 버튼 클릭됨');
  };

  const handleDateChange = () => {
    setIsModalVisible(true); // 모달을 열도록 설정
  };

  const handleConfirmDateChange = () => {
    console.log('날짜가 변경되었습니다.');
    setIsModalVisible(false); // 날짜 변경 후 모달을 닫음
  };

  const handleCancelDateChange = () => {
    setIsModalVisible(false); // 취소하면 모달을 닫음
  };

  // 모달 외부를 클릭했을 때 닫기
  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
      <View style={styles.settingsMenuContainer}>
        <View style={styles.settingsOption}>
          <Text style={styles.settingsText}>계정 연동</Text>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkButtonText}>연동</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsOption}>
          <Text style={styles.settingsText}>알림 설정</Text>
          <View style={styles.toggleContainer}>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setIsNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#4caf50' }}
              thumbColor={isNotificationsEnabled ? '#fff' : '#f4f3f4'}
              style={styles.toggle}
            />
          </View>
        </View>

        <View style={styles.settingsOption}>
          <Text style={styles.settingsText}>배경 음악</Text>
          <View style={styles.toggleContainer}>
            <Switch
              value={isBackgroundMusicEnabled}
              onValueChange={setIsBackgroundMusicEnabled}
              trackColor={{ false: '#ccc', true: '#4caf50' }}
              thumbColor={isBackgroundMusicEnabled ? '#fff' : '#f4f3f4'}
              style={styles.toggle}
            />
          </View>
        </View>

        <View style={styles.helpOption}>
          <View style={styles.helpContainer}>
            <Text style={styles.settingsText}>도움말</Text>
            <TouchableOpacity onPress={handleHelpPress}>
              <Image source={IMAGES.helpIcon} style={styles.helpIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 날짜 넘기기 버튼 */}
      <View style={styles.dateChangeContainer}>
        <LinearGradient
          colors={['#4CAF50', '#8BC34A']}  // 초록색과 연두색의 그라데이션
          style={styles.dateChangeButton}  // 스타일은 그대로 두고
        >
          <TouchableOpacity
            onPress={handleDateChange}
            style={[styles.dateChangeButton, isTransitioning && styles.buttonDisabled]} // 애니메이션 적용
            disabled={isTransitioning}  // isTransitioning이 true일 때 버튼 비활성화
          >
            <Text style={styles.dateChangeText}>날짜 넘기기</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* 모달 창 */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)} // Android 백버튼 클릭 시 닫힘
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleModalClose}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>'날짜 넘기기'는 앱의 원활한 심사를 위해 날짜 변경을 강제로 시행하는 기능입니다. 다음 날짜로 넘어가시겠습니까?</Text>
            <View style={styles.modalButtons}>
              <LinearGradient
                colors={['#4CAF50', '#8BC34A']}
                style={styles.modalButton}
              >
                <TouchableOpacity onPress={handleCancelDateChange} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>아니요</Text>
                </TouchableOpacity>
              </LinearGradient>
              <LinearGradient
                colors={['#4CAF50', '#8BC34A']}
                style={styles.modalButton}
              >
                <TouchableOpacity onPress={handleConfirmDateChange} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>네</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <NavigationBar
        onNavigate={(screen) => handleNavigate(navigation, screen)}
        isTransitioning={isTransitioning}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="Storage" component={StorageScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="SimpleDiagnosis" component={SimpleDiagnosisScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#ADD8E6',
  },
  calendarImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingVertical: 15,
    position: 'relative',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 0.22,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  storageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
  storageButton: {
    width: '45%',
    aspectRatio: 0.55,
    margin: '2.5%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  emptyBox: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    fontSize: 16,
    color: '#666',
  },
  settingsMenuContainer: {
    flex: 1,
    width: '100%',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    justifyContent: 'space-between',
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  settingsText: {
    fontSize: 16,
    color: '#333',
    flexShrink: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  toggle: {
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }],
  },
  linkButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#333',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginLeft: 5,
  },
  dateChangeContainer: {
    position: 'absolute',
    bottom: '20%', // 화면 하단에서 20% 떨어진 위치
    left: 0,  // left를 0으로 두고
    right: 0, // right를 0으로 두어, 가로 중앙으로 오게 함
    alignItems: 'center', // 가로로 중앙 정렬
    justifyContent: 'center', // 세로로 중앙 정렬
    transform: [{ translateY: -30 }],  // 위로 30픽셀 올림
  },
  dateChangeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChangeText: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,  // 최대 너비 설정으로 버튼이 모달 밖으로 나가지 않도록
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: 20,  // 버튼들 간의 여백
  },
  modalButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    width: 130,  // 버튼 너비 고정
    height: 45,  // 버튼 높이 고정
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  emotionCheckContainer: {
    position: 'absolute',
    bottom: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // 반투명 배경
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,  // 최대 너비 설정
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  emotionCheckContainer: {
    position: 'absolute',
    bottom: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }],
  },
  dateChangeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChangeText: {
    color: '#fff',
    fontSize: 16,
  },
  // LinearGradient 안에서 버튼 색상 수정
  modalButtonGradient: {
    borderRadius: 8,
    height: 45,  // 버튼 크기 일관되게 조정
    justifyContent: 'center',
    alignItems: 'center',
    width: 130,  // 버튼 너비 고정
  },
  // treeImageContainer의 위치를 relative로 변경
  treeImageContainer: {
   position: 'relative',  // position을 absolute에서 relative로 변경
   width: '100%',  // 가로 100%로 설정
   height: '50%',  // 세로 50%로 설정 (하단에 배치될 수 있도록)
   justifyContent: 'center',
   alignItems: 'center',
   top: '-25%',
  },
  treeImage: {
   width: 150,  // 적당히 작은 크기로 설정
   height: 150, // 크기 조정
   alignSelf: 'center',  // 가로 중앙 정렬
  },
  topSpacing: {
    height: 50,  // 상단 여백
  },
  chatList: {
    width: '90%', // 가로
    flex: 1,
    marginBottom: 10, // 여백 조정
  },
  chatContainer: {
    paddingBottom: 20,
    width: '100%',  // FlatList가 전체 너비를 차지
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '90%',  // 메시지 너비를 90%로 제한
    padding: 10,
    borderRadius: 10,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#d0f0c0',
    position: 'relative',  // 상대적 위치 설정
    right: -10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#c0e0ff',
    position: 'relative',  // 상대적 위치 설정
    left: -10,
  },
  messageText: {
    fontSize: 16,
    maxWidth: '100%', // 메시지 텍스트가 가로를 꽉 채움
  },
  optionsContainer: {
    width: '90%',  // 90% 너비
    marginTop: 10, // chatList와 옵션 사이의 간격을 설정
    paddingBottom: 20,  // 아래 여백을 추가하여 하단과 간격 설정
    justifyContent: 'flex-start',  // 위에서부터 시작하도록
    alignItems: 'center', // 선택지 중앙 정렬
  },
  buttonRow: {
    flexDirection: 'row',  // 가로로 버튼 배치
    justifyContent: 'center',  // 버튼들 사이 간격 균등
    width: '50%',  // 각 행을 꽉 채우도록 설정
    marginBottom: 10,  // 행간 간격
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
    alignItems: 'center',
    width: '100%'
  },
  optionText: {
    fontSize: 16,
  },
});