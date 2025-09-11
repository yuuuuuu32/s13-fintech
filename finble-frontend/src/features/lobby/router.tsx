import type { RouteObject } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage.tsx'
import ProtectedRoute from '../../router/ProtectedRoute'

export const lobbyRouter: RouteObject[] = [
  {
    path: 'lobby',
    element: (
      <ProtectedRoute>
        <LobbyPage />
      </ProtectedRoute>
    ),
  },
]