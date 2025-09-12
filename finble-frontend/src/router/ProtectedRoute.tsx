import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { initializeWebSocket, disconnectWebSocket } from '../utils/websocket';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('jwt');
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo);
  const userInfo = useUserStore((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authenticate = async () => {
      if (token) {
        try {
          await fetchUserInfo();
          initializeWebSocket();
        } catch (error) {
          console.error("Authentication failed", error);
          // Handle failed auth (e.g. bad token) by clearing token
          localStorage.removeItem('jwt');
        }
      }
      setIsLoading(false);
    };

    authenticate();

    return () => {
      disconnectWebSocket();
    };
  }, [token, fetchUserInfo]);

  if (isLoading) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: '4rem' }}><h2>Loading...</h2></div>; // Or a proper spinner component
  }

  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
