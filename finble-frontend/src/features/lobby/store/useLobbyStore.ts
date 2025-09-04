import { create } from 'zustand'

// 방 하나에 대한 데이터 타입을 정의합니다.
export interface GameRoom {
  id: string
  name: string
  players: number
  maxPlayers: number
  status: 'waiting' | 'playing'
}

// 로비 스토어의 전체 상태를 정의합니다.
interface LobbyState {
  rooms: GameRoom[]
  addRoom: (roomName: string) => void
}

// Zustand 스토어를 생성합니다.
export const useLobbyStore = create<LobbyState>((set) => ({
  // 초기 방 목록 (가짜 데이터)
  rooms: [
    { id: 'room-1', name: '초보만 오세요', players: 2, maxPlayers: 4, status: 'waiting' },
    { id: 'room-2', name: '고수들의 전쟁', players: 4, maxPlayers: 4, status: 'playing' },
    { id: 'room-3', name: '즐겜하실 분~', players: 1, maxPlayers: 4, status: 'waiting' },
    { id: 'room-4', name: '금융왕이 될테야', players: 3, maxPlayers: 4, status: 'waiting' },
  ],

  // 새로운 방을 추가하는 함수
  addRoom: (roomName) =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        {
          id: `room-${Date.now()}`, // 고유한 ID 생성
          name: roomName,
          players: 1,
          maxPlayers: 4,
          status: 'waiting',
        },
      ],
    })),
}))