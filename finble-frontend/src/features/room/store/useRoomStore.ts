import { create } from 'zustand';
import { subscribeToTopic, sendMessage } from '../../../utils/websocket';
import type { Player, GameRoom } from '../../lobby/store/useLobbyStore';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';
import { useWebSocketStore } from '../../../stores/useWebSocketStore';

interface RoomState {
  room: GameRoom | null;
  setRoom: (room: GameRoom) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  enterRoomAndSubscribe: (roomId: string) => Promise<void>;
  cleanup: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  setRoom: (room) => set({ room }),
  addPlayer: (player) => set((state) => {
    if (!state.room) return {};
    if (state.room.players.find(p => p.id === player.id)) {
      return {};
    }
    return {
      room: {
        ...state.room,
        players: [...state.room.players, player],
      },
    };
  }),
  removePlayer: (playerId) => set((state) => {
    if (!state.room) return {};
    return {
      room: {
        ...state.room,
        players: state.room.players.filter((p) => p.id !== playerId),
      },
    };
  }),
  enterRoomAndSubscribe: async (roomId: string) => {
    // Find initial room info from lobby store
    const lobbyRoom = useLobbyStore.getState().rooms.find(r => r.id === roomId);

    console.log('🚪 [ROOM_ENTRY] Starting room entry process:', {
      roomId,
      lobbyRoom: lobbyRoom ? {
        id: lobbyRoom.id,
        name: lobbyRoom.name,
        playerCount: lobbyRoom.playerCount,
        maxPlayers: lobbyRoom.maxPlayers,
        status: lobbyRoom.status
      } : null
    });

    try {
      const playersPayload = await new Promise<any>((resolve, reject) => {
        let isResolved = false;

        const unsubscribeOk = subscribeToTopic('ENTER_ROOM_OK', (message: any) => {
          if (isResolved) return;
          isResolved = true;

          console.log('✅ [ROOM_ENTRY] ENTER_ROOM_OK received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          resolve(message.payload);
        });

        const unsubscribeFail = subscribeToTopic('ENTER_ROOM_FAIL', (message: any) => {
          if (isResolved) return;
          isResolved = true;

          console.log('❌ [ROOM_ENTRY] ENTER_ROOM_FAIL received:', message);
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

          console.log('❌ [ROOM_ENTRY] Rejecting with error:', errorMessage);
          reject(new Error(errorMessage));
        });

        const unsubscribeNotFound = subscribeToTopic('ROOM_ID_NOT_FOUND', (message: any) => {
          if (isResolved) return;
          isResolved = true;

          console.log('❌ [ROOM_ENTRY] ROOM_ID_NOT_FOUND received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          reject(new Error(message.message || '방 ID를 찾을 수 없습니다.'));
        });

        console.log('📤 [ROOM_ENTRY] Sending ENTER_ROOM message:', {
          destination: '/app/room/enter',
          type: "ENTER_ROOM",
          payload: { roomId: parseInt(roomId, 10) }
        });

        sendMessage('/app/room/enter', {
          type: "ENTER_ROOM",
          payload: {
            roomId: parseInt(roomId, 10),
          }
        });

        console.log('⏰ [ROOM_ENTRY] Setting 10 second timeout...');
        setTimeout(() => {
          if (isResolved) return;
          isResolved = true;

          console.log('⏰ [ROOM_ENTRY] Timeout reached, cleaning up...');
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          reject(new Error('방 입장 응답 시간이 초과되었습니다.'));
        }, 10000);
      });

      const players: Player[] = playersPayload.map((p: any) => ({
        id: p.userId,
        name: p.nickname,
        isOwner: p.isOwner,
      }));

      const newRoomState: GameRoom = {
        id: lobbyRoom?.id || roomId,
        name: lobbyRoom?.name || 'Unknown Room',
        maxPlayers: lobbyRoom?.maxPlayers || 4,
        status: lobbyRoom?.status || 'waiting',
        players: players,
      };

      set({ room: newRoomState });

      // Now subscribe to real-time updates
      const enterNewUserSub = subscribeToTopic('ENTER_NEW_USER', (message) => {
        console.log('🏠 [ROOM] 새 유저 입장:', message);
        const newPlayer = message.payload;

        // 현재 방 정보 로깅
        const currentRoom = get().room;
        console.log('🏠 [ROOM] 입장 전 방 상태:', {
          roomId: currentRoom?.id,
          currentPlayerCount: currentRoom?.players.length,
          maxPlayers: currentRoom?.maxPlayers,
          newPlayerInfo: {
            id: newPlayer.userId,
            name: newPlayer.nickname,
            isOwner: newPlayer.isOwner
          }
        });

        get().addPlayer({
          id: newPlayer.userId,
          name: newPlayer.nickname,
          isOwner: newPlayer.isOwner,
        });

        // 입장 후 상태 로깅
        const updatedRoom = get().room;
        console.log('🏠 [ROOM] 입장 후 방 상태:', {
          roomId: updatedRoom?.id,
          playerCount: updatedRoom?.players.length,
          players: updatedRoom?.players.map(p => ({ id: p.id, name: p.name }))
        });
      });
  
      const exitUserSub = subscribeToTopic('EXIT_USER', (message) => {
        console.log('🏠 [ROOM] 유저 퇴장:', message);
        const exitingPlayerId = message.payload.userId;

        const currentRoom = get().room;
        console.log('🏠 [ROOM] 퇴장 전 방 상태:', {
          roomId: currentRoom?.id,
          currentPlayerCount: currentRoom?.players.length,
          exitingPlayer: exitingPlayerId
        });

        get().removePlayer(exitingPlayerId);

        const updatedRoom = get().room;
        console.log('🏠 [ROOM] 퇴장 후 방 상태:', {
          roomId: updatedRoom?.id,
          playerCount: updatedRoom?.players.length,
          players: updatedRoom?.players.map(p => ({ id: p.id, name: p.name }))
        });
      });

      const kickUserSub = subscribeToTopic('KICK_USER', (message) => {
        const kickedPlayerId = message.payload.userId;
        get().removePlayer(kickedPlayerId);
      });

      const kickedSub = subscribeToTopic('KICKED', () => {
        // You have been kicked, navigate to lobby
        window.location.href = '/lobby';
      });

      // 게임 시작 메시지 구독
      const gameStartSub = subscribeToTopic('START_GAME_OBSERVE', (message) => {
        const currentWebSocketState = useWebSocketStore.getState();
        const isGameAlreadyInitialized = currentWebSocketState.initialGameState !== null;

        console.log("🚨 [ROOM_STORE] START_GAME_OBSERVE received:", {
          timestamp: new Date().toISOString(),
          payload: message.payload,
          gameState: message.payload?.gameState,
          isGameAlreadyInitialized: isGameAlreadyInitialized,
          currentInitialGameState: currentWebSocketState.initialGameState,
          willSkipDueToAlreadyInitialized: isGameAlreadyInitialized
        });

        // 1. 게임이 이미 초기화되었다면 무시 (중복 START_GAME_OBSERVE 방지)
        if (isGameAlreadyInitialized) {
          console.log("🚫 [ROOM_STORE] Skipping START_GAME_OBSERVE - game already initialized");
          return; // 완전히 무시
        }

        // 2. 처음 받는 START_GAME_OBSERVE만 처리
        console.log("🎮 [ROOM_STORE] First START_GAME_OBSERVE - setting initial game state");
        useWebSocketStore.getState().setInitialGameState(message.payload);

        // 3. 게임 상태를 'playing'으로 변경하여 페이지 이동 트리거
        if (message.payload.gameState === 'PLAYING') {
          set((state) => {
            if (!state.room) return {};
            return {
                room: { ...state.room, status: 'playing' },
            };
          });
        }
      });
  
      // Store unsubscribe functions to be called on cleanup
      set({ cleanup: () => {
        setTimeout(() => {
          useLobbyStore.getState().exitRoom(roomId);
        }, 100); // 100ms delay
        enterNewUserSub();
        exitUserSub();
        kickUserSub();
        kickedSub();
        gameStartSub(); // cleanup에 추가
      }});

    } catch (error) {
      console.error('❌ [ROOM_ENTRY] 방 입장 및 구독 실패:', error);

      // 입장이 실패한 경우 서버에 EXIT_ROOM 메시지를 보내서
      // 서버에서 일시적으로 추가된 유저 정보를 정리합니다
      try {
        console.log('🚪 [ROOM_ENTRY] Sending EXIT_ROOM to clean up server state');
        sendMessage('/app/room/exit', {
          type: 'EXIT_ROOM',
          payload: {
            roomId: parseInt(roomId, 10),
          },
        });
      } catch (exitError) {
        console.error('❌ [ROOM_ENTRY] Failed to send EXIT_ROOM cleanup message:', exitError);
      }

      // Handle error, maybe navigate back to lobby
      throw error;
    }
  },
  cleanup: () => {
    // This will be overwritten by enterRoomAndSubscribe
  },
}));