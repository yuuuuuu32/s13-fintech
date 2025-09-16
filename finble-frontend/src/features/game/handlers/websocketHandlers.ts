import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";

export const createWebSocketHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  connect: (gameId: string) => {
    set({ gameId });
    console.log("Game store connected to game:", gameId);

    subscribeToTopic("GAME_STATE_CHANGE", (message) => {
      console.log("Received game update (GAME_STATE_CHANGE):", message);
      const { payload } = message;

      // If the payload has curPlayer, it's likely a turn change from the timer
      if (payload.curPlayer) {
        set((state) => {
          const nextPlayerIndex = state.players.findIndex(p => p.name === payload.curPlayer);
          if (nextPlayerIndex !== -1) {
            return {
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
            };
          }
          return {}; // No change if player not found
        });
      } else {
        // Handle other generic game state updates
        get().updateGameState(payload);
      }
    });

    subscribeToTopic("START_GAME_OBSERVE", (message) => {
      console.log("Received game update (START_GAME_OBSERVE):", message);
      get().updateGameState(message.payload);
    });

    subscribeToTopic("TURN_CHANGE", (message) => {
      console.log("Received TURN_CHANGE message:", message);
      const { payload } = message;
      if (payload.currentPlayerIndex !== undefined) {
        set({
          currentPlayerIndex: payload.currentPlayerIndex,
          currentTurn: payload.currentTurn || get().currentTurn,
          gamePhase: "WAITING_FOR_ROLL",
          isDiceRolled: false, // Reset for the next turn
        });
      }
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("Received USE_DICE message:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn } = payload;

      set(() => {
        return {
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          gamePhase: "DICE_ROLLING", // Trigger animation for all clients
        };
      });
    });

    subscribeToTopic("TRADE_LAND", (message) => {
      console.log("Received TRADE_LAND message:", message);
      const { payload } = message;
      if (payload.players) {
        const serverPlayersMap = payload.players;
        set((state) => {
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
          return { players: updatedPlayers };
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
          position: serverPlayer.position, // 서버에서 받은 위치 값 사용
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
    set(newState);
  },
});