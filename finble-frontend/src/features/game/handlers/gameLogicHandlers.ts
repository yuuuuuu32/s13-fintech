import type { GameState, GamePhase } from "../types/gameTypes.ts";
import { handleCityCompanyTile, handleChanceTile, handleSpecialTile } from "./tileHandlers.ts";
import { chanceCards } from "../constants/gameConstants.ts";

export const createGameLogicHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  setDicePower: (power: number) => set({ dicePower: power }),

  finishDiceRoll: () => {
    set((state) => {
        const { serverCurrentPosition, players, currentPlayerIndex, board } = state;
        if (serverCurrentPosition === null) return {};

        const currentPlayer = players[currentPlayerIndex];
        const finalPosition = Math.max(0, Math.min(serverCurrentPosition, board.length - 1));

        console.log("📍 [POSITION] Player position update:", {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          previousPosition: currentPlayer.position,
          serverPosition: serverCurrentPosition,
          finalPosition: finalPosition
        });

        const updatedPlayers = players.map((p, index) => {
            if (index === currentPlayerIndex) {
                return {
                    ...p,
                    position: finalPosition,
                };
            }
            return p;
        });

        return {
            players: updatedPlayers,
            gamePhase: 'PLAYER_MOVING' as GamePhase,
            serverCurrentPosition: null,
        };
    });
  },

  setIsDiceRolled: (isRolled: boolean) => set({ isDiceRolled: isRolled }),

  rollDice: () => {
    const { gamePhase, players, currentPlayerIndex, gameId, send } = get();
    const currentPlayer = players[currentPlayerIndex];

    if (gamePhase !== "WAITING_FOR_ROLL") return;

    if (currentPlayer.isInJail) {
      set({ modal: { type: "JAIL" } });
      return;
    }

    if (currentPlayer.isTraveling) {
      set({
        modal: {
          type: "INFO",
          text: "세계여행! 이동할 칸을 보드에서 직접 클릭하세요.",
          onConfirm: () => set({ gamePhase: "WORLD_TRAVEL_MOVE", modal: { type: "NONE" as const } }),
        },
      });
      return;
    }

    set({ gamePhase: "DICE_ROLLING" });

    if (gameId) {
      console.log("📤 [WEBSOCKET] Sending USE_DICE:", {
        destination: `/app/game/${gameId}/roll-dice`,
        type: "USE_DICE",
        payload: { userName: currentPlayer.name }
      });
      send(`/app/game/${gameId}/roll-dice`, {
        type: "USE_DICE",
        payload: {
          userName: currentPlayer.name,
        },
      });
    }
  },

  movePlayer: (diceValues: [number, number]) => {
    const { players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];
    const diceSum = diceValues[0] + diceValues[1];

    const newPosition = currentPlayer.position + diceSum;
    let updatedMoney = currentPlayer.money;
    let lapCount = currentPlayer.lapCount;

    if (newPosition >= board.length) {
      updatedMoney += 200000;
      lapCount += 1;
    }

    const finalPosition = newPosition % board.length;
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      position: finalPosition,
      money: updatedMoney,
      lapCount,
    };

    set({
      players: updatedPlayers,
      dice: diceValues,
      gamePhase: "PLAYER_MOVING",
    });
  },

  handleTileAction: () => {
    set({ gamePhase: "TILE_ACTION" });
    const { players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];
    const currentTile = board[currentPlayer.position];

    if (currentPlayer.money < 0) {
      const { players, currentTurn, totalTurns, board } = get();
      const alivePlayers = players.filter((p) => p.money >= 0);

      let winner = null;
      if (alivePlayers.length <= 1) {
        winner = alivePlayers[0] ?? null;
      } else if (currentTurn > totalTurns) {
        winner = players
          .filter((p) => p.money >= 0)
          .reduce((prev, current) => {
            const prevAssets =
              prev.money +
              prev.properties.reduce((sum, i) => sum + (board[i].price || 0), 0);
            const currentAssets =
              current.money +
              current.properties.reduce(
                (sum, i) => sum + (board[i].price || 0),
                0
              );
            return prevAssets > currentAssets ? prev : current;
          });
      }

      if (winner || alivePlayers.length === 0 || currentTurn > totalTurns) {
        set({
          gamePhase: "GAME_OVER",
          winnerId: winner?.id ?? null,
          modal: { type: "NONE" as const },
        });
      }
      return;
    }

    switch (currentTile?.type) {
      case "city":
      case "company":
      case "NORMAL":
        handleCityCompanyTile(set, get, currentTile, currentPlayer, players);
        break;

      case "chance":
      case "CHANCE":
        handleChanceTile(set, get, currentTile, currentPlayer, chanceCards);
        break;

      case "special":
      case "SPECIAL":
      case "JAIL":
      case "START":
      case "AIRPLANE":
        handleSpecialTile(set, get, currentTile, currentPlayer, board, get().send);
        break;

      default:
        get().endTurn();
        break;
    }
  },

  endTurn: () => {
    const state = get();
    const { gameId, send, players, currentPlayerIndex } = state;
    const currentPlayer = players[currentPlayerIndex];

    console.log("🔄 [TURN_TRANSITION] endTurn called - PRE state:", {
      timestamp: new Date().toISOString(),
      currentPlayer: {
        id: currentPlayer?.id,
        name: currentPlayer?.name,
        position: currentPlayer?.position
      },
      currentPlayerIndex,
      gamePhase: state.gamePhase,
      modal: state.modal,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join(' -> ')
    });

    // Log all player positions before turn end
    console.log("📍 [POSITION] All player positions before endTurn:", players.map(p => ({
      playerId: p.id,
      nickname: p.name,
      position: p.position
    })));

    if (gameId) {
      console.log("📤 [WEBSOCKET] Sending TURN_SKIP:", {
        destination: `/app/game/${gameId}/end-turn`,
        type: "TURN_SKIP",
        payload: {},
        timestamp: new Date().toISOString()
      });
      send(`/app/game/${gameId}/end-turn`, {
        type: "TURN_SKIP",
        payload: {},
      });
    }

    set({
      modal: { type: "NONE" as const },
      gamePhase: "WAITING_FOR_TURN_END",
    });

    console.log("🔄 [TURN_TRANSITION] endTurn completed - POST state:", {
      timestamp: new Date().toISOString(),
      gamePhase: "WAITING_FOR_TURN_END",
      modal: { type: "NONE" }
    });

    // Log positions again after state change
    setTimeout(() => {
      const postState = get();
      console.log("📍 [POSITION] All player positions AFTER endTurn (delayed check):", postState.players.map(p => ({
        playerId: p.id,
        nickname: p.name,
        position: p.position
      })));
    }, 100);
  },

  checkGameOver: () => {
    const { players, currentTurn, totalTurns, board } = get();
    const alivePlayers = players.filter((p) => p.money >= 0);

    let winner = null;
    if (alivePlayers.length <= 1) {
      winner = alivePlayers[0] ?? null;
    } else if (currentTurn > totalTurns) {
      winner = players
        .filter((p) => p.money >= 0)
        .reduce((prev, current) => {
          const prevAssets =
            prev.money +
            prev.properties.reduce((sum, i) => sum + (board[i].price || 0), 0);
          const currentAssets =
            current.money +
            current.properties.reduce(
              (sum, i) => sum + (board[i].price || 0),
              0
            );
          return prevAssets > currentAssets ? prev : current;
        });
    }

    if (winner || alivePlayers.length === 0 || currentTurn > totalTurns) {
      set({
        gamePhase: "GAME_OVER",
        winnerId: winner?.id ?? null,
        modal: { type: "NONE" as const },
      });
    }
  },
});