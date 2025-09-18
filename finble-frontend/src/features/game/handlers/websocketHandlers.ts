import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";

export const createWebSocketHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  connect: (gameId: string) => {
    set({ gameId });
    console.log("🔌 [WEBSOCKET] Connected to game:", gameId);

    subscribeToTopic("GAME_STATE_CHANGE", (message) => {
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE received:", message);
      const { payload } = message;
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE payload detail:", JSON.stringify(payload, null, 2));

      // If the payload has curPlayer, it's likely a turn change from the timer
      if (payload.curPlayer) {
        set((state) => {
          const nextPlayerIndex = state.players.findIndex(p => p.name === payload.curPlayer);
          if (nextPlayerIndex !== -1) {
            return {
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
              isDiceRolled: false,
              modal: { type: "NONE" },
            };
          }
          return {};
        });
      } else {
        // GAME_STATE_CHANGE should not update player positions to prevent snap-back
        const { players, ...safePayload } = payload;
        get().updateGameState(safePayload);
      }
    });

    subscribeToTopic("START_GAME_OBSERVE", (message) => {
      console.log("📥 [WEBSOCKET] START_GAME_OBSERVE received:", message);
      console.log("📥 [WEBSOCKET] START_GAME_OBSERVE payload detail:", JSON.stringify(message.payload, null, 2));

      // START_GAME_OBSERVE should not update player positions to prevent snap-back
      const { players, ...safePayload } = message.payload;
      get().updateGameState(safePayload);
    });

    subscribeToTopic("TURN_CHANGE", (message) => {
      console.log("📥 [WEBSOCKET] TURN_CHANGE received:", message);
      const { payload } = message;
      if (payload.currentPlayerIndex !== undefined) {
        set({
          currentPlayerIndex: payload.currentPlayerIndex,
          currentTurn: payload.currentTurn || get().currentTurn,
          gamePhase: "WAITING_FOR_ROLL",
          isDiceRolled: false,
          modal: { type: "NONE" },
        });
      }
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("📥 [WEBSOCKET] USE_DICE received:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn } = payload;

      set(() => {
        return {
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          gamePhase: "DICE_ROLLING",
        };
      });
    });

    subscribeToTopic("TRADE_LAND", (message) => {
      console.log("📥 [WEBSOCKET] TRADE_LAND received:", message);
      const { payload } = message;
      if (payload.players) {
        const serverPlayersMap = payload.players;
        console.log("📍 [POSITION] TRADE_LAND server positions:", Object.entries(serverPlayersMap).map(([id, player]) => ({
          playerId: id,
          nickname: player.nickname,
          serverPosition: player.position
        })));

        set((state) => {
          console.log("📍 [POSITION] TRADE_LAND current client positions:", state.players.map(p => ({
            playerId: p.id,
            nickname: p.name,
            clientPosition: p.position
          })));

          const updatedPlayers = state.players.map(clientPlayer => {
            const serverPlayerState = serverPlayersMap[clientPlayer.id];
            if (serverPlayerState) {
              return {
                ...clientPlayer,
                money: serverPlayerState.money,
                properties: serverPlayerState.ownedProperties || [],
                // position: serverPlayerState.position, // DO NOT UPDATE POSITION - This prevents snap-back bug
                isInJail: serverPlayerState.inJail,
                jailTurns: serverPlayerState.jailTurns,
              };
            }
            return clientPlayer;
          });

          console.log("📍 [POSITION] TRADE_LAND after update positions:", updatedPlayers.map(p => ({
            playerId: p.id,
            nickname: p.name,
            positionAfterUpdate: p.position
          })));

          return { players: updatedPlayers };
        });
      }
    });

    subscribeToTopic("WORLD_TRAVEL_EVENT", (message) => {
      console.log("📥 [WEBSOCKET] WORLD_TRAVEL_EVENT received:", message);
      const { payload } = message;

      if (payload.playerId && payload.destinationPosition !== undefined) {
        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.id === payload.playerId) {
              console.log("🌍 [WORLD_TRAVEL] Player moving:", {
                playerId: player.id,
                nickname: player.name,
                from: player.position,
                to: payload.destinationPosition
              });

              return {
                ...player,
                position: payload.destinationPosition,
                isTraveling: false
              };
            }
            return player;
          });

          return {
            players: updatedPlayers,
            gamePhase: "PLAYER_MOVING" as const,
            modal: { type: "NONE" as const }
          };
        });
      }
    });
  },

  disconnect: () => {
    console.log("Game store disconnected.");
  },

  send: (destination: string, body: Record<string, unknown>) => {
    sendMessage(destination, body);
  },

  initializeGame: (initialState: GameInitialState) => {
    console.log("📍 [POSITION] initializeGame called - forcing all players to start position (0):", {
      roomId: initialState.roomId,
      playerOrder: initialState.playerOrder,
      serverPlayers: Object.values(initialState.players).map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        serverPosition: p.position,
        forcedPosition: 0
      }))
    });

    const playerNicknamesOrder: string[] = initialState.playerOrder;
    const playersMap = initialState.players;
    const allServerPlayers = Object.values(playersMap);

    const playersArray: Player[] = playerNicknamesOrder
      .map((nickname, index) => {
        const serverPlayer = allServerPlayers.find(
          (p) => p.nickname === nickname
        );
        if (!serverPlayer) {
          console.error(
            `Player with nickname ${nickname} not found in players map.`
          );
          return null;
        }
        return {
          id: serverPlayer.userId,
          name: serverPlayer.nickname,
          money: serverPlayer.money,
          position: 0, // 게임 시작 시 모든 플레이어를 시작칸(0번)에 배치
          properties: serverPlayer.ownedProperties || [],
          isInJail: serverPlayer.inJail,
          jailTurns: serverPlayer.jailTurns,
          character: CHARACTER_PREFABS[index % CHARACTER_PREFABS.length],
          isTraveling: false,
          lapCount: 0,
        };
      })
      .filter((p) => p !== null) as Player[];

    if (playersArray.length !== allServerPlayers.length) {
      console.error(
        "Mismatch between playerOrder and players map. Falling back to default order."
      );
    }

    const mappedState = {
      gameId: initialState.roomId,
                  board: initialState.currentMap.cells.map(
        (cell) => cell || { name: "빈칸", type: "special" as const }
      ),
      players: playersArray,
      currentPlayerIndex: initialState.currentPlayerIndex,
      gamePhase: "SELECTING_ORDER" as const,
    };
    set(mappedState);

    setTimeout(() => {
      set({ gamePhase: "WAITING_FOR_ROLL" });
    }, 5000);
  },

  updateGameState: (newState: Partial<GameState>) => {
    console.log("📍 [POSITION] updateGameState called:", {
      hasPlayers: !!newState.players,
      newStateKeys: Object.keys(newState),
      playersType: newState.players ? (Array.isArray(newState.players) ? 'array' : 'object') : 'none',
      playerCount: newState.players ? (Array.isArray(newState.players) ? newState.players.length : Object.keys(newState.players).length) : 0
    });

    if (newState.players) {
      const players = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);
      console.log("📍 [POSITION] updateGameState player positions:", players.map(p => ({
        playerId: p.id,
        nickname: p.name,
        position: p.position
      })));

      // Check for position 0 resets
      players.forEach(p => {
        if (p.position === 0) {
          console.warn("⚠️ [WARNING] updateGameState setting player to position 0:", {
            playerId: p.id,
            nickname: p.name,
            position: p.position
          });
        }
      });
    }

    set(newState);
  },
});