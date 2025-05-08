// src/constants/images.js

// --- 이미지 로드를 위한 require 문 ---
// 경로 앞에 '../../' 를 사용하여 assets 폴더를 올바르게 참조합니다.

// --- 일반 이미지 ---
const background = require('../../assets/GardenBackground.jpg');
const calendarIcon = require('../../assets/Calendar.png');
const homeIcon = require('../../assets/Garden.png');
const storageIcon = require('../../assets/Storage.png');
const settingsIcon = require('../../assets/Settings.png');
const calendarScreen = require('../../assets/CalendarScreen.png');
const helpIcon = require('../../assets/QuestionMark.png');

// --- 나무 이미지 ---
const treeImage = require('../../assets/Tree_0.png'); // 기본 나무 (꽃 0~1개)
// ★★★ 추가된 나무 이미지 정의 ★★★
const Tree_2 = require('../../assets/Tree_2.png');   // 꽃 2~3개
const Tree_4 = require('../../assets/Tree_4.png');   // 꽃 4~5개
const Tree_6 = require('../../assets/Tree_6.png');   // 꽃 6~7개
const Tree_8 = require('../../assets/Tree_8.png');   // 꽃 8~9개
const Tree_10 = require('../../assets/Tree_10.png'); // 꽃 10개 이상
// ★★★ --- ★★★

// --- 감정별 꽃 이미지 (객체로 그룹화) ---

// Ag (분노 - Anger)
const flowers_Ag = {
  Ag_1: require('../../assets/Flowers/Ag/Ag_1.png'),
  // ... (나머지 Ag 꽃 이미지들)
  Ag_16: require('../../assets/Flowers/Ag/Ag_16.png'),
};

// Ax (불안 - Anxiety)
const flowers_Ax = {
  Ax_1: require('../../assets/Flowers/Ax/Ax_1.png'),
  // ... (나머지 Ax 꽃 이미지들)
  Ax_16: require('../../assets/Flowers/Ax/Ax_16.png'),
};

// Dg (역겨움 - Disgust)
const flowers_Dg = {
  Dg_1: require('../../assets/Flowers/Dg/Dg_1.png'),
  // ... (나머지 Dg 꽃 이미지들)
  Dg_16: require('../../assets/Flowers/Dg/Dg_16.png'),
};

// Dr (갈망 - Desire/Craving)
const flowers_Dr = {
  Dr_1: require('../../assets/Flowers/Dr/Dr_1.png'),
  // ... (나머지 Dr 꽃 이미지들)
  Dr_16: require('../../assets/Flowers/Dr/Dr_16.png'),
};

// F (두려움 - Fear)
const flowers_F = {
  F_1: require('../../assets/Flowers/F/F_1.png'),
  // ... (나머지 F 꽃 이미지들)
  F_16: require('../../assets/Flowers/F/F_16.png'),
};

// H (행복 - Happiness)
const flowers_H = {
  H_1: require('../../assets/Flowers/H/H_1.png'),
  // ... (나머지 H 꽃 이미지들)
  H_16: require('../../assets/Flowers/H/H_16.png'),
};

// R (평온 - Relaxation/Calm)
const flowers_R = {
  R_1: require('../../assets/Flowers/R/R_1.png'),
  // ... (나머지 R 꽃 이미지들)
  R_16: require('../../assets/Flowers/R/R_16.png'),
};

// S (슬픔 - Sadness)
const flowers_S = {
  S_1: require('../../assets/Flowers/S/S_1.png'),
  // ... (나머지 S 꽃 이미지들)
  S_16: require('../../assets/Flowers/S/S_16.png'),
};


// --- 최종 IMAGES 객체 ---
const IMAGES = {
  // 일반 이미지
  background: background,
  calendarIcon: calendarIcon,
  homeIcon: homeIcon,
  storageIcon: storageIcon,
  settingsIcon: settingsIcon,
  calendarScreen: calendarScreen,
  helpIcon: helpIcon,
  // 나무 이미지들
  treeImage: treeImage, // 기본 나무
  // ★★★ 추가된 나무 이미지 키 ★★★
  Tree_2: Tree_2,
  Tree_4: Tree_4,
  Tree_6: Tree_6,
  Tree_8: Tree_8,
  Tree_10: Tree_10,
  // ★★★ --- ★★★

  // 감정별 꽃 이미지 그룹
  flowers: {
    Ag: flowers_Ag, // 분노
    Ax: flowers_Ax, // 불안
    Dg: flowers_Dg, // 역겨움
    Dr: flowers_Dr, // 갈망
    F:  flowers_F,  // 두려움
    H:  flowers_H,  // 행복
    R:  flowers_R,  // 평온
    S:  flowers_S,  // 슬픔
  },
};

export default IMAGES;