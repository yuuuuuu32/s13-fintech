import type { RouteObject } from 'react-router-dom'
import WaitingRoomPage from './pages/WaitingRoomPage.tsx'
import ProtectedRoute from '../../router/ProtectedRoute'

export const roomRouter: RouteObject[] = [
  {
    path: 'room/:roomId',
    element: (
      <ProtectedRoute>
        <WaitingRoomPage />
      </ProtectedRoute>
    ),
  },
]