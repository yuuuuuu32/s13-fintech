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
      get().updateGameState(message.payload);
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
          gamePhase: "WAITING_FOR_ROLL"
        });
      }
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("Received USE_DICE message:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, userName, curTurn, nextTurnUserName, updatedAsset } = payload;

      get().setIsDiceRolled(false);

      set((state) => {
        const updatedPlayers = state.players.map(player => {
          if (player.name === userName) {
            return {
              ...player,
              position: currentPosition,
              money: updatedAsset?.money || player.money,
              properties: updatedAsset?.lands || player.properties
            };
          }
          return player;
        });

        // nextTurnUserName으로 currentPlayerIndex 찾기
        const nextPlayerIndex = state.players.findIndex(player => player.name === nextTurnUserName);

        return {
          players: updatedPlayers,
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          currentPlayerIndex: nextPlayerIndex >= 0 ? nextPlayerIndex : state.currentPlayerIndex,
          gamePhase: "PLAYER_MOVING",
        };
      });
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
          position: serverPlayer.position,
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