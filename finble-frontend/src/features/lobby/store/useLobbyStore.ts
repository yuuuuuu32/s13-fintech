import { create } from 'zustand'

// 각 플레이어의 정보를 정의합니다.
export interface Player {
  id: string
  name: string
}

// GameRoom 타입에서 map과 mode를 제거합니다.
export interface GameRoom {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  status: 'waiting' | 'playing'
}

interface LobbyState {
  rooms: GameRoom[]
  addRoom: (roomName: string) => string
}

// WaitingRoomPage에서 사용하므로 export를 유지합니다.
export const currentUser = { id: 'user-me', name: '나' }

export const useLobbyStore = create<LobbyState>((set) => ({
  // 초기 데이터에서도 map과 mode를 제거합니다.
  rooms: [
    { id: 'room-1', name: '초보만 오세요', players: [{id: 'user-1', name: '유저1'}, {id: 'user-2', name: '유저2'}], maxPlayers: 4, status: 'waiting' },
    { id: 'room-2', name: '고수들의 전쟁', players: [], maxPlayers: 4, status: 'playing' },
    { id: 'room-3', name: '즐겜하실 분~', players: [{id: 'user-3', name: '유저3'}], maxPlayers: 4, status: 'waiting' },
    { id: 'room-4', name: '금융왕이 될테야', players: [{id: 'user-4', name: '유저4'}, {id: 'user-5', name: '유저5'}, {id: 'user-6', name: '유저6'}], maxPlayers: 4, status: 'waiting' },
  ],
  addRoom: (roomName) => {
    const newRoom: GameRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      players: [currentUser],
      maxPlayers: 4,
      status: 'waiting',
    }
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }))
    return newRoom.id
  },
}))