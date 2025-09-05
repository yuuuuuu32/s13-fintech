import { create } from 'zustand'
import axios from 'axios'

// 백엔드의 RoomListDTO와 유사한 인터페이스를 정의합니다.
export interface GameRoom {
  roomNo: number
  title: string
  currentPlayer: number
  maxPlayer: number
  status: 'waiting' | 'playing'
}

interface LobbyState {
  rooms: GameRoom[]
  fetchRooms: () => Promise<void>
  addRoom: (roomName: string) => string
}

// 임시 유저 데이터. WaitingRoomPage에서 사용하므로 다시 추가합니다.
export const currentUser = { id: 'user-me', name: '나' }

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [], // 초기 방 목록은 비워둡니다.
  fetchRooms: async () => {
    try {
      const response = await axios.get('/api/room/list')
      // Spring Page 객체에서 content를 추출하여 상태를 업데이트합니다.
      const rooms = response.data.content.map((room: any) => ({
        ...room,
        status: 'waiting', // 임시로 status 추가
      }))
      set({ rooms })
    } catch (error) {
      console.error('방 목록을 불러오는 데 실패했습니다:', error)
    }
  },
  addRoom: (roomName) => {
    // 이 함수는 이제 실제 API 호출로 대체되어야 합니다.
    console.log('addRoom은 임시 구현입니다.')
    const newRoom: GameRoom = {
      roomNo: Date.now(),
      title: roomName,
      currentPlayer: 1,
      maxPlayer: 4,
      status: 'waiting',
    }
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }))
    return String(newRoom.roomNo)
  },
}))