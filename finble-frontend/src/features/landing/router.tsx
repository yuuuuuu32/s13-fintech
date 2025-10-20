import type { RouteObject } from 'react-router-dom'
import LandingPage from './pages/LandingPage'

export const landingRouter: RouteObject[] = [
  {
    index: true, // path가 '/' 일 때 기본으로 렌더링될 페이지
    element: <LandingPage />,
  },
]