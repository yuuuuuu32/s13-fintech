import type { RouteObject } from 'react-router-dom'
import GameCanvas from './canvas/GameCanvas'
import ProtectedRoute from '../../router/ProtectedRoute'

export const gameRouter: RouteObject[] = [
  {
    path: 'game/:gameId',
    element: (
      <ProtectedRoute>
        <GameCanvas />
      </ProtectedRoute>
    ),
  },
]