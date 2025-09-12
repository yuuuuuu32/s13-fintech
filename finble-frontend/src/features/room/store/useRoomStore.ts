import { create } from 'zustand';
import { subscribeToTopic, sendMessage } from '../../../utils/websocket';
import type { Player, GameRoom } from '../../lobby/store/useLobbyStore';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';

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

    try {
      const playersPayload = await new Promise<any>((resolve, reject) => {
        const unsubscribeOk = subscribeToTopic('ENTER_ROOM_OK', (message: any) => {
          unsubscribeOk();
          unsubscribeFail();
          unsubscribeNotFound();
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
      const enterNewUserSub = subscribeToTopic(`/topic/room/${roomId}/enter`, (message) => {
        const newPlayer = message.payload;
        get().addPlayer({
          id: newPlayer.userId,
          name: newPlayer.nickname,
          isOwner: newPlayer.isOwner,
        });
      });
  
      const exitUserSub = subscribeToTopic(`/topic/room/${roomId}/exit`, (message) => {
        const exitingPlayerId = message.payload.userId;
        get().removePlayer(exitingPlayerId);
      });
  
      // Store unsubscribe functions to be called on cleanup
      set({ cleanup: () => {
        enterNewUserSub();
        exitUserSub();
      }});

    } catch (error) {
      console.error('방 입장 및 구독 실패:', error);
      // Handle error, maybe navigate back to lobby
      throw error;
    }
  },
  cleanup: () => {
    // This will be overwritten by enterRoomAndSubscribe
  },
}));