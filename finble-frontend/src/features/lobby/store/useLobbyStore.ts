import { create } from 'zustand';
import { getRoomList } from '../../../api/rooms';
import { sendMessage, subscribeToTopic } from '../../../utils/websocket';
import { useUserStore } from '../../../stores/useUserStore';

// 각 플레이어의 정보를 정의합니다.
export interface Player {
  id: string;
  name: string;
  isOwner: boolean;
}

// 웹소켓 메시지 타입 정의
interface WebSocketMessage {
  payload: unknown;
}

interface RoomCreationMessage extends WebSocketMessage {
  payload: {
    roomId: string;
  };
}

interface RoomEntryMessage extends WebSocketMessage {
  payload: Array<{
    userId: string;
    nickname: string;
    isOwner: boolean;
  }>;
}

// GameRoom 타입에서 map과 mode를 제거합니다.
export interface GameRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
}

interface LobbyState {
  rooms: GameRoom[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  createRoom: (roomName: string, userLimit: number) => Promise<string>;
  enterRoom: (roomId: string) => Promise<Player[]>;
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
      const roomCreationResult = await new Promise<string>((resolve, reject) => {
        const unsubscribeOk = subscribeToTopic('CREATE_ROOM_OK', (message: RoomCreationMessage) => {
          unsubscribeOk();
          unsubscribeFail();
          resolve(message.payload.roomId);
        });

        const unsubscribeFail = subscribeToTopic('CREATE_ROOM_FAIL', (message: WebSocketMessage) => {
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
        id: roomCreationResult,
        name: roomName,
        playerCount: 1, // 방 생성자는 1명
        maxPlayers: userLimit,
        status: 'waiting',
      };
      get().addRoomOptimistically(newRoom);

      return roomCreationResult;

    } catch (error) {
      console.error('방 생성 요청 실패:', error);
      throw error;
    }
  },
  enterRoom: async (roomId: string) => {
    try {
      const roomEntryResult = await new Promise<Player[]>((resolve, reject) => {
        const unsubscribeOk = subscribeToTopic('ENTER_ROOM_OK', (message: RoomEntryMessage) => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          
          const players: Player[] = message.payload.map((p) => ({
            id: p.userId,
            name: p.nickname,
            isOwner: p.isOwner,
          }));

          set((state) => ({
            rooms: state.rooms.map((room) =>
              room.id === roomId ? { ...room, playerCount: players.length } : room
            ),
          }));

          resolve(message.payload);
        });

        const unsubscribeFail = subscribeToTopic('ENTER_ROOM_FAIL', (message: WebSocketMessage) => {
          console.log('방 입장 실패:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();

          // 에러 메시지 상세화
          let errorMessage = '입장할 수 없는 방입니다.';
          if (message.payload) {
            const { reason, message: serverMessage } = message.payload;

            if (reason === 'ROOM_FULL' || serverMessage?.includes('full') || serverMessage?.includes('가득')) {
              errorMessage = '방이 가득 찼습니다.';
            } else if (reason === 'ROOM_NOT_FOUND' || serverMessage?.includes('not found') || serverMessage?.includes('찾을 수 없')) {
              errorMessage = '방을 찾을 수 없습니다.';
            } else if (reason === 'GAME_IN_PROGRESS' || serverMessage?.includes('playing') || serverMessage?.includes('진행')) {
              errorMessage = '게임이 이미 진행 중입니다.';
            } else if (serverMessage) {
              errorMessage = serverMessage;
            }
          } else if (message.message) {
            errorMessage = message.message;
          }

          reject(new Error(errorMessage));
        });

        const unsubscribeNotFound = subscribeToTopic('ROOM_ID_NOT_FOUND', (message: WebSocketMessage) => {
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
      playerCount: 1,
      maxPlayers: 4,
      status: 'waiting',
    };
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }));
    return newRoom.id;
  },
  subscribeToLobbyUpdates: () => {
    subscribeToTopic('GAME_STATE_CHANGE', (message) => {
      console.log('로비 업데이트 수신:', message);
      get().fetchRooms();
    });

    // 유저 입장 시 로비 목록 업데이트
    subscribeToTopic('ENTER_NEW_USER', (message) => {
      console.log('🏠 [LOBBY] 새 유저 입장 감지:', message);
      console.log('🏠 [LOBBY] 메시지 페이로드:', JSON.stringify(message.payload, null, 2));

      // 해당 방의 인원 수 즉시 업데이트
      if (message.payload && message.payload.roomId) {
        const roomId = message.payload.roomId.toString();
        console.log('🏠 [LOBBY] 방 인원 수 업데이트 시도:', { roomId });

        set((state) => {
          const updatedRooms = state.rooms.map((room) => {
            if (room.id === roomId) {
              const newPlayerCount = room.playerCount + 1;
              console.log('🏠 [LOBBY] 방 인원 수 업데이트:', {
                roomId: room.id,
                roomName: room.name,
                oldCount: room.playerCount,
                newCount: newPlayerCount,
                maxPlayers: room.maxPlayers
              });
              return { ...room, playerCount: newPlayerCount };
            }
            return room;
          });

          console.log('🏠 [LOBBY] 전체 방 목록 업데이트 완료');
          return { rooms: updatedRooms };
        });
      }
      // 전체 방 목록도 갱신 (정확한 동기화를 위해)
      setTimeout(() => {
        console.log('🏠 [LOBBY] 전체 방 목록 재조회 실행');
        get().fetchRooms();
      }, 500);
    });

    // 유저 퇴장 시 로비 목록 업데이트
    subscribeToTopic('EXIT_USER', (message) => {
      console.log('로비: 유저 퇴장 감지:', message);
      // 해당 방의 인원 수 즉시 업데이트
      if (message.payload && message.payload.roomId) {
        const roomId = message.payload.roomId.toString();
        set((state) => ({
          rooms: state.rooms.map((room) =>
            room.id === roomId
              ? { ...room, playerCount: Math.max(0, room.playerCount - 1) }
              : room
          ),
        }));
      }
      // 전체 방 목록도 갱신 (정확한 동기화를 위해)
      setTimeout(() => get().fetchRooms(), 500);
    });

    // 방 생성 이벤트 감지
    subscribeToTopic('CREATE_ROOM_OK', (message) => {
      console.log('로비: 새 방 생성 감지:', message);
      get().fetchRooms();
    });

    // 방 삭제/상태 변경 감지
    subscribeToTopic('ROOM_STATUS_CHANGE', (message) => {
      console.log('로비: 방 상태 변경 감지:', message);
      get().fetchRooms();
    });
  },
}
));