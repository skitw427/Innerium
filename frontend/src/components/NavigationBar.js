// src/components/NavigationBar.js
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
// 경로가 변경되었으므로 '../constants/images'에서 IMAGES를 가져옵니다.
import IMAGES from '../constants/images';

// NavigationBar 컴포넌트 정의
const NavigationBar = ({ onNavigate, isTransitioning }) => {
  // 버튼 데이터 배열
  const buttons = [
    { screen: 'Calendar', icon: IMAGES.calendarIcon },
    { screen: 'Home', icon: IMAGES.homeIcon },
    { screen: 'Storage', icon: IMAGES.storageIcon },
    { screen: 'Settings', icon: IMAGES.settingsIcon },
  ];

  return (
    // 스타일은 아래 정의된 styles 객체를 사용합니다.
    <View style={styles.buttonContainer}>
      {buttons.map(({ screen, icon }) => (
        <TouchableOpacity
          key={screen}
          onPress={() => onNavigate(screen)}
          // 조건부 스타일 적용: isTransitioning이 true이면 buttonDisabled 스타일 추가
          style={[styles.button, isTransitioning && styles.buttonDisabled]}
          disabled={isTransitioning} // isTransitioning이 true이면 버튼 비활성화
        >
          <Image source={icon} style={styles.buttonImage} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// NavigationBar 컴포넌트에서만 사용하는 스타일을 여기에 정의합니다.
const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingVertical: 30,
    position: 'relative', // 필요에 따라 'absolute' 등으로 변경 가능
    // backgroundColor: '#f0f0f0', // 배경색 등 추가 스타일 가능
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 0.22, // 버튼이 차지하는 공간 비율
    alignItems: 'center',
    backgroundColor: 'transparent', // 기본 배경 투명
  },
  buttonDisabled: {
    opacity: 0.5, // 비활성화 시 투명도 조절
  },
  buttonImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain', // 이미지가 비율을 유지하며 버튼 안에 맞도록
  },
});

// 컴포넌트를 export 합니다.
export default NavigationBar;