import { create } from 'zustand'
import { getRoomList } from '../../../api/rooms';
import { sendMessage, subscribeToTopic } from '../../../utils/websocket';

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
  createRoom: (roomName: string, userLimit: number) => Promise<void>;
  addRoom: (roomName: string) => string; // TODO: 이 함수는 나중에 제거하거나 변경될 예정
  subscribeToLobbyUpdates: () => void; // 실시간 업데이트 구독
}

// 가짜 유저 데이터 (로그인 기능 구현 전 임시 사용)
export const currentUser = { id: 'user-me', name: '나' }

export const useLobbyStore = create<LobbyState>((set, get) => ({
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
  createRoom: async (roomName: string, userLimit: number) => {
    try {
      // WebSocket 메시지를 통해 방 생성 요청
      sendMessage('/app/room/create', {
        roomName,
        userLimit,
      });
      // 방 생성 후 상태 업데이트는 웹소켓 구독을 통해 이루어질 예정
    } catch (error) {
      console.error('방 생성 요청 실패:', error);
      // 에러 처리 로직 추가 (예: 모달 표시)
    }
  },
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
  subscribeToLobbyUpdates: () => {
    subscribeToTopic('/topic/lobby/rooms', (message) => {
      console.log('로비 업데이트 수신:', message);
      // 메시지 내용에 따라 rooms 상태를 업데이트
      // 현재는 단순화를 위해 업데이트 메시지가 오면 전체 목록을 다시 가져옴
      get().fetchRooms();
    });
  },
}));
