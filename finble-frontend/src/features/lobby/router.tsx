import type { RouteObject } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage.tsx'

export const lobbyRouter: RouteObject[] = [
  {
    path: 'lobby',
    element: <LobbyPage />,
  },
]