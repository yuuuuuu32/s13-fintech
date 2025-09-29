import { create } from 'zustand';
import { subscribeToTopic, sendMessage } from '../../../utils/websocket';
import type { Player, GameRoom } from '../../lobby/store/useLobbyStore';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';
import { useWebSocketStore } from '../../../stores/useWebSocketStore';

// 웹소켓 메시지 타입 정의
interface WebSocketMessage {
  payload: unknown;
}

interface RoomMessage extends WebSocketMessage {
  payload: Array<{
    userId: string;
    nickname: string;
    isOwner: boolean;
  }>;
}

interface RoomState {
  room: GameRoom | null;
  isEntering: boolean;
  setRoom: (room: GameRoom) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  enterRoomAndSubscribe: (roomId: string) => Promise<void>;
  cleanup: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  isEntering: false,
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
    // 이미 입장 중이면 중복 요청 방지
    if (get().isEntering) {
      console.log('🚪 [ROOM_ENTRY] Already entering room, skipping duplicate request');
      return;
    }

    set({ isEntering: true });

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
      const playersPayload = await new Promise<RoomMessage['payload']>((resolve, reject) => {
        let isResolved = false;

        const unsubscribeOk = subscribeToTopic('ENTER_ROOM_OK', (message: RoomMessage) => {
          if (isResolved) return;
          isResolved = true;

          console.log('✅ [ROOM_ENTRY] ENTER_ROOM_OK received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          unsubscribeError();
          resolve(message.payload);
        });

        const unsubscribeFail = subscribeToTopic('ENTER_ROOM_FAIL', (message: WebSocketMessage) => {
          if (isResolved) return;
          isResolved = true;

          console.log('❌ [ROOM_ENTRY] ENTER_ROOM_FAIL received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          unsubscribeError();

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

        const unsubscribeNotFound = subscribeToTopic('ROOM_ID_NOT_FOUND', (message: WebSocketMessage) => {
          if (isResolved) return;
          isResolved = true;

          console.log('❌ [ROOM_ENTRY] ROOM_ID_NOT_FOUND received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          unsubscribeError();
          reject(new Error(message.message || '방 ID를 찾을 수 없습니다.'));
        });

        const unsubscribeError = subscribeToTopic('INTERNAL_SERVER_ERROR', (message: WebSocketMessage) => {
          if (isResolved) return;
          isResolved = true;

          console.log('❌ [ROOM_ENTRY] INTERNAL_SERVER_ERROR received:', message);
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
          unsubscribeError();
          reject(new Error(message.message || '서버 내부 오류가 발생했습니다.'));
        });

        console.log('📤 [ROOM_ENTRY] Sending ENTER_ROOM message:', {
          destination: '/app/room/enter',
          type: "ENTER_ROOM",
          payload: { roomId: roomId }
        });

        sendMessage('/app/room/enter', {
          type: "ENTER_ROOM",
          payload: {
            roomId: roomId,
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

      const players: Player[] = playersPayload.map((p) => ({
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
        const exitingPlayerNickname = message.payload.userNickName;
        const newOwnerNickname = message.payload.newOwnerNickName;

        const currentRoom = get().room;
        console.log('🏠 [ROOM] 퇴장 전 방 상태:', {
          roomId: currentRoom?.id,
          currentPlayerCount: currentRoom?.players.length,
          exitingPlayer: exitingPlayerNickname,
          newOwner: newOwnerNickname
        });

        // 닉네임으로 플레이어 찾아서 제거
        const exitingPlayer = currentRoom?.players.find(p => p.name === exitingPlayerNickname);
        if (exitingPlayer) {
          get().removePlayer(exitingPlayer.id);
        }

        // 방장 위임 처리
        if (newOwnerNickname && currentRoom) {
          set((state) => {
            if (!state.room) return {};
            return {
              room: {
                ...state.room,
                owner: newOwnerNickname,
              },
            };
          });
        }

        const updatedRoom = get().room;
        console.log('🏠 [ROOM] 퇴장 후 방 상태:', {
          roomId: updatedRoom?.id,
          playerCount: updatedRoom?.players.length,
          players: updatedRoom?.players.map(p => ({ id: p.id, name: p.name })),
          newOwner: updatedRoom?.owner
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

      // 경제역사 업데이트 구독 (대기실에서도 받을 수 있음)
      const economicHistorySub = subscribeToTopic('ECONOMIC_HISTORY_UPDATE', (message) => {
        console.log('📈 [ROOM] 경제역사 업데이트 수신:', message);
        // 게임 시작 전 경제역사 정보는 로그만 기록
        // 실제 처리는 게임 상태에서 담당
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
        // 게임이 진행 중이면 방을 나가지 않음
        const currentRoom = get().room;
        const isGameInProgress = currentRoom?.status === 'playing';

        console.log('🧹 [ROOM_CLEANUP] Cleanup called:', {
          roomId,
          roomStatus: currentRoom?.status,
          isGameInProgress,
          willExitRoom: !isGameInProgress
        });

        if (!isGameInProgress) {
          setTimeout(() => {
            console.log('🚪 [ROOM_CLEANUP] Exiting room due to cleanup');
            useLobbyStore.getState().exitRoom(roomId);
          }, 100); // 100ms delay
        } else {
          console.log('🎮 [ROOM_CLEANUP] Game in progress - skipping room exit');
        }

        enterNewUserSub();
        exitUserSub();
        kickUserSub();
        kickedSub();
        economicHistorySub();
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
    } finally {
      // 항상 isEntering 상태를 리셋
      set({ isEntering: false });
      console.log('🔄 [ROOM_ENTRY] isEntering state reset to false');
    }
  },
  cleanup: () => {
    // This will be overwritten by enterRoomAndSubscribe
  },
}));