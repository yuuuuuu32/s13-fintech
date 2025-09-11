import { create } from 'zustand'
import { getRoomList } from '../../../api/rooms';

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
  rooms: GameRoom[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  addRoom: (roomName: string) => string;
}

// 가짜 유저 데이터 (로그인 기능 구현 전 임시 사용)
export const currentUser = { id: 'user-me', name: '나' }

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [], // 초기 데이터는 빈 배열로 설정
  isLoading: false,
  error: null,
  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await getRoomList();
      set({ rooms, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: '방 목록을 불러오는 데 실패했습니다.' });
      console.error(error); // 에러 로그 추가
    }
  },
  // TODO: addRoom 기능도 API 호출로 변경해야 합니다.
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
}));