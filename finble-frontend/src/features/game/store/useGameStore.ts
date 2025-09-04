import { create } from 'zustand'

// 플레이어의 상태를 정의합니다.
interface PlayerState {
  position: [number, number, number] // [x, y, z] 좌표
}

// 게임 전체의 상태를 정의합니다.
interface GameState {
  player: PlayerState
  // 나중에 다른 플레이어나 게임 보드 상태 등을 추가할 수 있습니다.
}

// Zustand 스토어를 생성합니다.
export const useGameStore = create<GameState>()((set) => ({
  player: {
    position: [0, 0.5, 0], // 초기 플레이어 위치 (y를 0.5로 하여 보드 위에 떠 있도록 함)
  },
}))