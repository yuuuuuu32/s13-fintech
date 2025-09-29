import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { initializeWebSocket } from '../utils/websocket';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

let isSocketInitialized = false;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('jwt');
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo);
  const userInfo = useUserStore((state) => state.userInfo);
  const initializeUserFromLocalStorage = useUserStore((state) => state.initializeUserFromLocalStorage); // 새로 추가된 액션 가져오기
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authenticate = async () => {
      if (token) {
        initializeUserFromLocalStorage(); // localStorage에서 사용자 정보 먼저 복원 시도
        try {
          // userInfo가 여전히 null이면 (localStorage에 없거나 유효하지 않으면) 백엔드에서 가져옴
          if (!useUserStore.getState().userInfo) { 
            await fetchUserInfo();
          }
        } catch (error) {
          console.error("Authentication failed", error);
          localStorage.removeItem('jwt');
        }
      }
      setIsLoading(false);
    };

    authenticate();
  }, [token, fetchUserInfo, initializeUserFromLocalStorage]); // 의존성 배열에 initializeUserFromLocalStorage 추가

  useEffect(() => {
    if (userInfo && !isSocketInitialized) {
      console.log('User authenticated, initializing WebSocket.');
      initializeWebSocket();
      isSocketInitialized = true;
    }
  }, [userInfo]);

  if (isLoading) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: '4rem' }}><h2>Loading...</h2></div>;
  }

  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
