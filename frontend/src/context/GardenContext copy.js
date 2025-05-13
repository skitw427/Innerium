import React, { createContext, useState, useContext } from 'react';

// 1. Context 생성
const GardenContext = createContext();

// 2. Context Provider 컴포넌트 생성
export const GardenProvider = ({ children }) => {
  const [placedFlowers, setPlacedFlowers] = useState([]); // 꽃 배열 상태

  // 꽃 추가 함수
  const addFlower = (newFlower) => {
    setPlacedFlowers(prevFlowers => {
      console.log('[GardenContext] Adding flower. Previous count:', prevFlowers.length);
      const updatedFlowers = [...prevFlowers, newFlower];
      console.log('[GardenContext] Updated flowers count:', updatedFlowers.length);
      return updatedFlowers;
    });
  };

  // Provider가 value로 상태와 함수를 전달
  return (
    <GardenContext.Provider value={{ placedFlowers, addFlower }}>
      {children}
    </GardenContext.Provider>
  );
};

// 3. Context 사용을 위한 Custom Hook (선택적이지만 편리)
export const useGarden = () => {
  return useContext(GardenContext);
};