import type { RouteObject } from 'react-router-dom'
import GameCanvas from './canvas/GameCanvas'

export const gameRouter: RouteObject[] = [
  {
    path: 'game',
    element: <GameCanvas />,
  },
]