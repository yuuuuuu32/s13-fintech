import { create } from 'zustand';
import { getRoomList } from '../../../api/rooms';
import { sendMessage, subscribeToTopic, connectWebSocket, disconnectWebSocket } from '../../../utils/websocket';

// 각 플레이어의 정보를 정의합니다.
export interface Player {
  id: string;
  name: string;
}

// GameRoom 타입에서 map과 mode를 제거합니다.
export interface GameRoom {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing';
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
export const currentUser = { id: 'user-me', name: '나' };

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
      // WebSocket 연결 시도
      await new Promise<void>((resolve, reject) => {
        connectWebSocket({
          onConnect: () => {
            console.log('useLobbyStore: WebSocket connected for room creation.');
            resolve();
          },
          onDisconnect: () => {
            console.error('useLobbyStore: WebSocket disconnected during room creation.');
            reject(new Error('WebSocket disconnected during room creation.'));
          },
          onMessage: (topic, message) => {
            // 방 생성 결과 메시지 처리 (선택 사항, 백엔드 명세에 따라)
            console.log(`useLobbyStore: Received message on ${topic}:`, message);
          },
        });
      });

      // --- 이 부분에 응답 대기 로직 추가 ---
      const roomCreationResult = await new Promise<any>((resolve, reject) => {
        // 백엔드가 응답을 보낼 토픽을 구독 (예: /user/queue/create-room-result)
        // 백엔드와 협의하여 정확한 응답 토픽을 사용해야 합니다.
        // 여기서는 임시로 모든 메시지를 받아서 필터링하는 방식으로 구현합니다.
        const unsubscribe = subscribeToTopic('/topic/lobby/rooms', (message: any) => { // 백엔드에서 응답을 이 토픽으로 보낸다고 가정
          if (message.type === 'CREATE_ROOM_OK') {
            unsubscribe(); // 응답 받았으니 구독 해제
            resolve(message.payload);
          } else if (message.type === 'CREATE_ROOM_FAIL') {
            unsubscribe(); // 응답 받았으니 구독 해제
            reject(new Error(message.message));
          }
        });

        // WebSocket 메시지를 통해 방 생성 요청
        sendMessage('/app/room/create', {
          type: "CREATE_ROOM",
          payload: {
            roomName,
            userLimit,
          }
        });
        console.log('Room creation request sent.');

        // 타임아웃 설정 (응답이 너무 오래 걸릴 경우)
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Room creation response timeout.'));
        }, 10000); // 10초 타임아웃
      });

      console.log('Room creation successful:', roomCreationResult);
      // 방 생성 성공 후 추가 로직 (예: 방 목록 새로고침, 방으로 이동)
      get().fetchRooms(); // 방 목록 새로고침

    } catch (error) {
      console.error('방 생성 요청 실패:', error);
      // 에러 처리 로직 추가 (예: 모달 표시)
      throw error; // 에러를 다시 던져서 CreateRoomModal에서 catch하도록 함
    } finally {
      // 방 생성 요청 후 WebSocket 연결 해제 (요청에 따라)
      // disconnectWebSocket(); // 이 줄은 제거된 상태
      // console.log('useLobbyStore: WebSocket disconnected after room creation attempt.'); // 이 줄도 제거된 상태
    }
  },
  addRoom: (roomName) => {
    const newRoom: GameRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      players: [currentUser],
      maxPlayers: 4,
      status: 'waiting',
    };
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }));
    return newRoom.id;
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