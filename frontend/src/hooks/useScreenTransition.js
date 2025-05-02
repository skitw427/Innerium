// src/hooks/useScreenTransition.js
import { useState, useCallback } from 'react';

// useScreenTransition 훅 정의
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
    // (딜레이 시간은 필요에 따라 조절 가능)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 10); // 매우 짧은 딜레이 예시

  }, [isTransitioning]); // isTransitioning 상태에 의존

  // 훅이 반환하는 값들
  return { isTransitioning, handleNavigate };
};

// 훅을 export 합니다.
export default useScreenTransition;