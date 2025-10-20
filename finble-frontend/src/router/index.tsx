import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import { landingRouter } from '../features/landing/router'
import { authRouter } from '../features/auth/router'
import { gameRouter } from '../features/game/router'
import { lobbyRouter } from '../features/lobby/router'
import { roomRouter } from '../features/room/router'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    // 각 기능별 라우터들을 자식으로 등록합니다.
    children: [...landingRouter, ...authRouter, ...gameRouter, ...lobbyRouter, ...roomRouter],
  },
])