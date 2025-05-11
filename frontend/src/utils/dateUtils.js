// src/utils/dateUtils.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_DATE_OFFSET_KEY = '@appDateOffset'; // 시간 차이 (밀리초)

/**
 * 앱의 현재 날짜를 반환합니다.
 * 실제 현재 시간에 저장된 오프셋을 더하여 계산합니다.
 * @returns {Promise<Date>} 앱의 현재 날짜 Promise 객체
 */
export const getAppCurrentDate = async () => {
  try {
    const offsetString = await AsyncStorage.getItem(APP_DATE_OFFSET_KEY);
    const offset = offsetString ? parseInt(offsetString, 10) : 0;
    const actualCurrentTime = new Date().getTime();
    return new Date(actualCurrentTime + offset);
  } catch (error) {
    console.error("Error getting app current date:", error);
    return new Date(); // 오류 시 실제 현재 날짜 반환
  }
};

/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환합니다.
 * @param {Date} date 변환할 날짜 객체
 * @returns {string} YYYY-MM-DD 형식의 문자열
 */
export const formatDateToYYYYMMDD = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("formatDateToYYYYMMDD: Invalid date object received, using current date as fallback.");
    // 유효하지 않은 날짜 객체 처리 시, 현재 날짜의 YYYY-MM-DD를 반환
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // 정상적인 Date 객체인 경우 toISOString 사용
  return date.toISOString().split('T')[0];
};

/**
 * 날짜와 시간을 'YYYY-MM-DD HH:mm:ss' 형식의 문자열로 변환합니다.
 * @param {Date} date 변환할 날짜 객체
 * @returns {string} 'YYYY-MM-DD HH:mm:ss' 형식의 문자열
 */
export const formatDateTimeTo상세형식 = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("formatDateTimeTo상세형식: Invalid date object received, using current date and time as fallback.");
    const now = new Date(); // 오류 시 실제 현재 날짜 및 시간으로 폴백
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 월은 0부터 시작하므로 +1
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};