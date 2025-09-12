import { create } from 'zustand';
import { getRoomList } from '../../../api/rooms';
import { sendMessage, subscribeToTopic } from '../../../utils/websocket';
import { useUserStore } from '../../../stores/useUserStore';

export interface Player {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing';
}

// Zustand 스토어 상태 + 액션 인터페이스
interface LobbyState {
  rooms: GameRoom[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  createRoom: (roomName: string, userLimit: number) => Promise<string>;
  enterRoom: (roomId: string) => Promise<any>;
  exitRoom: (roomId: string) => void;
  addRoomOptimistically: (room: GameRoom) => void;
  addRoom: (roomName: string) => string;
  subscribeToLobbyUpdates: () => void;
}

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
    const { userInfo } = useUserStore.getState();
    if (!userInfo) {
      throw new Error("User is not authenticated.");
    }

    try {
      const roomCreationResult = await new Promise<any>((resolve, reject) => {
        const unsubscribeOk = subscribeToTopic('CREATE_ROOM_OK', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          resolve(message.payload);
        });

        const unsubscribeFail = subscribeToTopic('CREATE_ROOM_FAIL', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          reject(new Error(message.message));
        });

        sendMessage('/app/room/create', {
          type: "CREATE_ROOM",
          payload: {
            roomName,
            userLimit,
          }
        });

        setTimeout(() => {
          unsubscribeOk();
          unsubscribeFail();
          reject(new Error('Room creation response timeout.'));
        }, 10000);
      });

      const newRoom: GameRoom = {
        id: roomCreationResult.roomId,
        name: roomName,
        players: [{
          id: userInfo.userId,
          name: userInfo.nickname,
          isOwner: true,
        }],
        maxPlayers: userLimit,
        status: 'waiting',
      };
      get().addRoomOptimistically(newRoom);
      
      return roomCreationResult.roomId;

    } catch (error) {
      console.error('방 생성 요청 실패:', error);
      throw error;
    }
  },
  enterRoom: async (roomId: string) => {
    try {
      const roomEntryResult = await new Promise<any>((resolve, reject) => {
        const unsubscribeOk = subscribeToTopic('ENTER_ROOM_OK', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          
          const players: Player[] = message.payload.map((p: any) => ({
            id: p.userId,
            name: p.nickname,
            isOwner: p.isOwner,
          }));

          set((state) => ({
            rooms: state.rooms.map((room) =>
              room.id === roomId ? { ...room, players } : room
            ),
          }));

          resolve(message.payload);
        });

        const unsubscribeFail = subscribeToTopic('ENTER_ROOM_FAIL', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          reject(new Error(message.message || '입장할 수 없는 방입니다.'));
        });

        const unsubscribeNotFound = subscribeToTopic('ROOM_ID_NOT_FOUND', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          reject(new Error(message.message || '방 ID를 찾을 수 없습니다.'));
        });

        sendMessage('/app/room/enter', {
          type: "ENTER_ROOM",
          payload: {
            roomId: parseInt(roomId, 10),
          }
        });

        setTimeout(() => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          reject(new Error('Room entry response timeout.'));
        }, 10000);
      });

      return roomEntryResult;

    } catch (error) {
      console.error('방 입장 요청 실패:', error);
      throw error;
    }
  },
  exitRoom: (roomId: string) => {
    sendMessage('/app/room/exit', {
      type: 'EXIT_ROOM',
      payload: {
        roomId: parseInt(roomId, 10),
      },
    });
    console.log(`Sent EXIT_ROOM for room ${roomId}`);
  },
  addRoomOptimistically: (room: GameRoom) => {
    set((state) => ({
      rooms: [...state.rooms, room],
    }));
  },
  addRoom: (roomName) => {
    const { userInfo } = useUserStore.getState();
    if (!userInfo) {
        throw new Error("User is not authenticated.");
    }
    const newRoom: GameRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      players: [{
        id: userInfo.userId,
        name: userInfo.nickname,
        isOwner: true, // Assuming the creator is the owner
      }],
      maxPlayers: 4,
      status: 'waiting',
    };
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }));
    return newRoom.id; // 생성된 방 ID 반환 (라우팅용)
  },
  subscribeToLobbyUpdates: () => {
    subscribeToTopic('GAME_STATE_CHANGE', (message) => {
      console.log('로비 업데이트 수신:', message);
      get().fetchRooms();
    });
  },
}
));