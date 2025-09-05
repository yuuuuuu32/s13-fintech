import type { RouteObject } from 'react-router-dom'
import WaitingRoomPage from './pages/WaitingRoomPage.tsx'

export const roomRouter: RouteObject[] = [
  {
    path: 'room/:roomId', // 동적 경로 설정
    element: <WaitingRoomPage />,
  },
]