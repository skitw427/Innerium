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
const Tree_2 = require('../../assets/Tree_2.png');   // 꽃 2~3개
const Tree_4 = require('../../assets/Tree_4.png');   // 꽃 4~5개
const Tree_6 = require('../../assets/Tree_6.png');   // 꽃 6~7개
const Tree_8 = require('../../assets/Tree_8.png');   // 꽃 8~9개
const Tree_10 = require('../../assets/Tree_10.png'); // 꽃 10개 이상

// ★★★ 추가된 감정 아이콘 이미지 정의 ★★★
const emotionAgIcon = require('../../assets/Emotions/Ag.png');
const emotionAxIcon = require('../../assets/Emotions/Ax.png');
const emotionDgIcon = require('../../assets/Emotions/Dg.png');
const emotionDrIcon = require('../../assets/Emotions/Dr.png');
const emotionFIcon = require('../../assets/Emotions/F.png');
const emotionHIcon = require('../../assets/Emotions/H.png');
const emotionRIcon = require('../../assets/Emotions/R.png');
const emotionSIcon = require('../../assets/Emotions/S.png');
// ★★★ --- ★★★

// --- 감정별 꽃 이미지 (객체로 그룹화) ---

// Ag (분노 - Anger)
const flowers_Ag = {
  Ag_1: require('../../assets/Flowers/Ag/Ag_1.png'),
  Ag_2: require('../../assets/Flowers/Ag/Ag_2.png'),
  Ag_3: require('../../assets/Flowers/Ag/Ag_3.png'),
  Ag_4: require('../../assets/Flowers/Ag/Ag_4.png'),
  Ag_5: require('../../assets/Flowers/Ag/Ag_5.png'),
  Ag_6: require('../../assets/Flowers/Ag/Ag_6.png'),
  Ag_7: require('../../assets/Flowers/Ag/Ag_7.png'),
  Ag_8: require('../../assets/Flowers/Ag/Ag_8.png'),
  Ag_9: require('../../assets/Flowers/Ag/Ag_9.png'),
  Ag_10: require('../../assets/Flowers/Ag/Ag_10.png'),
  Ag_11: require('../../assets/Flowers/Ag/Ag_11.png'),
  Ag_12: require('../../assets/Flowers/Ag/Ag_12.png'),
  Ag_13: require('../../assets/Flowers/Ag/Ag_13.png'),
  Ag_14: require('../../assets/Flowers/Ag/Ag_14.png'),
  Ag_15: require('../../assets/Flowers/Ag/Ag_15.png'),
  Ag_16: require('../../assets/Flowers/Ag/Ag_16.png'),
};

// Ax (불안 - Anxiety)
const flowers_Ax = {
  Ax_1: require('../../assets/Flowers/Ax/Ax_1.png'),
  Ax_2: require('../../assets/Flowers/Ax/Ax_2.png'),
  Ax_3: require('../../assets/Flowers/Ax/Ax_3.png'),
  Ax_4: require('../../assets/Flowers/Ax/Ax_4.png'),
  Ax_5: require('../../assets/Flowers/Ax/Ax_5.png'),
  Ax_6: require('../../assets/Flowers/Ax/Ax_6.png'),
  Ax_7: require('../../assets/Flowers/Ax/Ax_7.png'),
  Ax_8: require('../../assets/Flowers/Ax/Ax_8.png'),
  Ax_9: require('../../assets/Flowers/Ax/Ax_9.png'),
  Ax_10: require('../../assets/Flowers/Ax/Ax_10.png'),
  Ax_11: require('../../assets/Flowers/Ax/Ax_11.png'),
  Ax_12: require('../../assets/Flowers/Ax/Ax_12.png'),
  Ax_13: require('../../assets/Flowers/Ax/Ax_13.png'),
  Ax_14: require('../../assets/Flowers/Ax/Ax_14.png'),
  Ax_15: require('../../assets/Flowers/Ax/Ax_15.png'),
  Ax_16: require('../../assets/Flowers/Ax/Ax_16.png'),
};

// Dg (역겨움 - Disgust)
const flowers_Dg = {
  Dg_1: require('../../assets/Flowers/Dg/Dg_1.png'),
  Dg_2: require('../../assets/Flowers/Dg/Dg_2.png'),
  Dg_3: require('../../assets/Flowers/Dg/Dg_3.png'),
  Dg_4: require('../../assets/Flowers/Dg/Dg_4.png'),
  Dg_5: require('../../assets/Flowers/Dg/Dg_5.png'),
  Dg_6: require('../../assets/Flowers/Dg/Dg_6.png'),
  Dg_7: require('../../assets/Flowers/Dg/Dg_7.png'),
  Dg_8: require('../../assets/Flowers/Dg/Dg_8.png'),
  Dg_9: require('../../assets/Flowers/Dg/Dg_9.png'),
  Dg_10: require('../../assets/Flowers/Dg/Dg_10.png'),
  Dg_11: require('../../assets/Flowers/Dg/Dg_11.png'),
  Dg_12: require('../../assets/Flowers/Dg/Dg_12.png'),
  Dg_13: require('../../assets/Flowers/Dg/Dg_13.png'),
  Dg_14: require('../../assets/Flowers/Dg/Dg_14.png'),
  Dg_15: require('../../assets/Flowers/Dg/Dg_15.png'),
  Dg_16: require('../../assets/Flowers/Dg/Dg_16.png'),
};

// Dr (갈망 - Desire/Craving)
const flowers_Dr = {
  Dr_1: require('../../assets/Flowers/Dr/Dr_1.png'),
  Dr_2: require('../../assets/Flowers/Dr/Dr_2.png'),
  Dr_3: require('../../assets/Flowers/Dr/Dr_3.png'),
  Dr_4: require('../../assets/Flowers/Dr/Dr_4.png'),
  Dr_5: require('../../assets/Flowers/Dr/Dr_5.png'),
  Dr_6: require('../../assets/Flowers/Dr/Dr_6.png'),
  Dr_7: require('../../assets/Flowers/Dr/Dr_7.png'),
  Dr_8: require('../../assets/Flowers/Dr/Dr_8.png'),
  Dr_9: require('../../assets/Flowers/Dr/Dr_9.png'),
  Dr_10: require('../../assets/Flowers/Dr/Dr_10.png'),
  Dr_11: require('../../assets/Flowers/Dr/Dr_11.png'),
  Dr_12: require('../../assets/Flowers/Dr/Dr_12.png'),
  Dr_13: require('../../assets/Flowers/Dr/Dr_13.png'),
  Dr_14: require('../../assets/Flowers/Dr/Dr_14.png'),
  Dr_15: require('../../assets/Flowers/Dr/Dr_15.png'),
  Dr_16: require('../../assets/Flowers/Dr/Dr_16.png'),
};

// F (두려움 - Fear)
const flowers_F = {
  F_1: require('../../assets/Flowers/F/F_1.png'),
  F_2: require('../../assets/Flowers/F/F_2.png'),
  F_3: require('../../assets/Flowers/F/F_3.png'),
  F_4: require('../../assets/Flowers/F/F_4.png'),
  F_5: require('../../assets/Flowers/F/F_5.png'),
  F_6: require('../../assets/Flowers/F/F_6.png'),
  F_7: require('../../assets/Flowers/F/F_7.png'),
  F_8: require('../../assets/Flowers/F/F_8.png'),
  F_9: require('../../assets/Flowers/F/F_9.png'),
  F_10: require('../../assets/Flowers/F/F_10.png'),
  F_11: require('../../assets/Flowers/F/F_11.png'),
  F_12: require('../../assets/Flowers/F/F_12.png'),
  F_13: require('../../assets/Flowers/F/F_13.png'),
  F_14: require('../../assets/Flowers/F/F_14.png'),
  F_15: require('../../assets/Flowers/F/F_15.png'),
  F_16: require('../../assets/Flowers/F/F_16.png'),
};

// H (행복 - Happiness)
const flowers_H = {
  H_1: require('../../assets/Flowers/H/H_1.png'),
  H_2: require('../../assets/Flowers/H/H_2.png'),
  H_3: require('../../assets/Flowers/H/H_3.png'),
  H_4: require('../../assets/Flowers/H/H_4.png'),
  H_5: require('../../assets/Flowers/H/H_5.png'),
  H_6: require('../../assets/Flowers/H/H_6.png'),
  H_7: require('../../assets/Flowers/H/H_7.png'),
  H_8: require('../../assets/Flowers/H/H_8.png'),
  H_9: require('../../assets/Flowers/H/H_9.png'),
  H_10: require('../../assets/Flowers/H/H_10.png'),
  H_11: require('../../assets/Flowers/H/H_11.png'),
  H_12: require('../../assets/Flowers/H/H_12.png'),
  H_13: require('../../assets/Flowers/H/H_13.png'),
  H_14: require('../../assets/Flowers/H/H_14.png'),
  H_15: require('../../assets/Flowers/H/H_15.png'),
  H_16: require('../../assets/Flowers/H/H_16.png'),
};

// R (평온 - Relaxation/Calm)
const flowers_R = {
  R_1: require('../../assets/Flowers/R/R_1.png'),
  R_2: require('../../assets/Flowers/R/R_2.png'),
  R_3: require('../../assets/Flowers/R/R_3.png'),
  R_4: require('../../assets/Flowers/R/R_4.png'),
  R_5: require('../../assets/Flowers/R/R_5.png'),
  R_6: require('../../assets/Flowers/R/R_6.png'),
  R_7: require('../../assets/Flowers/R/R_7.png'),
  R_8: require('../../assets/Flowers/R/R_8.png'),
  R_9: require('../../assets/Flowers/R/R_9.png'),
  R_10: require('../../assets/Flowers/R/R_10.png'),
  R_11: require('../../assets/Flowers/R/R_11.png'),
  R_12: require('../../assets/Flowers/R/R_12.png'),
  R_13: require('../../assets/Flowers/R/R_13.png'),
  R_14: require('../../assets/Flowers/R/R_14.png'),
  R_15: require('../../assets/Flowers/R/R_15.png'),
  R_16: require('../../assets/Flowers/R/R_16.png'),
};

// S (슬픔 - Sadness)
const flowers_S = {
  S_1: require('../../assets/Flowers/S/S_1.png'),
  S_2: require('../../assets/Flowers/S/S_2.png'),
  S_3: require('../../assets/Flowers/S/S_3.png'),
  S_4: require('../../assets/Flowers/S/S_4.png'),
  S_5: require('../../assets/Flowers/S/S_5.png'),
  S_6: require('../../assets/Flowers/S/S_6.png'),
  S_7: require('../../assets/Flowers/S/S_7.png'),
  S_8: require('../../assets/Flowers/S/S_8.png'),
  S_9: require('../../assets/Flowers/S/S_9.png'),
  S_10: require('../../assets/Flowers/S/S_10.png'),
  S_11: require('../../assets/Flowers/S/S_11.png'),
  S_12: require('../../assets/Flowers/S/S_12.png'),
  S_13: require('../../assets/Flowers/S/S_13.png'),
  S_14: require('../../assets/Flowers/S/S_14.png'),
  S_15: require('../../assets/Flowers/S/S_15.png'),
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
  Tree_2: Tree_2,
  Tree_4: Tree_4,
  Tree_6: Tree_6,
  Tree_8: Tree_8,
  Tree_10: Tree_10,

  // ★★★ 추가된 감정 아이콘 키 ★★★
  emotionIcon: {
    Ag: emotionAgIcon,
    Ax: emotionAxIcon,
    Dg: emotionDgIcon,
    Dr: emotionDrIcon,
    F: emotionFIcon,
    H: emotionHIcon,
    R: emotionRIcon,
    S: emotionSIcon,
  },
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