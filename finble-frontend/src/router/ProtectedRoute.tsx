import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('jwt');

  if (!token) {
    // 토큰이 없으면 로그인 페이지로 리다이렉트합니다.
    // `replace` 옵션은 브라우저 히스토리에 현재 경로를 남기지 않습니다.
    return <Navigate to="/login" replace />;
  }

  // 토큰이 있으면 요청된 컴포넌트를 렌더링합니다.
  return children;
};

export default ProtectedRoute;
