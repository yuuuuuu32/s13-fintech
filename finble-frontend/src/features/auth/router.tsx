import type { RouteObject } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import KakaoCallback from './pages/KakaoCallback'

export const authRouter: RouteObject[] = [
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    path: 'auth/kakao/callback',
    element: <KakaoCallback />,
  },
]