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
        const { serverCurrentPosition, players, currentPlayerIndex } = state;
        if (serverCurrentPosition === null) return {};

        const updatedPlayers = players.map((p, index) => {
            if (index === currentPlayerIndex) {
                return { ...p, position: serverCurrentPosition };
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

    console.log("rollDice called. Current gamePhase:", gamePhase);

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
          onConfirm: get().startWorldTravelSelection,
        },
      });
      return;
    }

    if (gameId) {
      send(`/app/game/${gameId}/roll-dice`, {
        type: "USE_DICE",
        payload: {
          userName: currentPlayer.name,
        },
      });
    } else {
      console.warn("Game ID not set. Cannot send roll dice message.");
      set({ gamePhase: "DICE_ROLLING" });
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

    if (currentPlayer.money < 0) {
      get().checkGameOver();
      return;
    }

    const currentTile = board[currentPlayer.position];

    switch (currentTile.type) {
      case "city":
      case "company":
        handleCityCompanyTile(set, get, currentTile, currentPlayer, players);
        break;

      case "chance":
        handleChanceTile(set, get, currentTile, currentPlayer, chanceCards);
        break;

      case "special":
        handleSpecialTile(set, get, currentTile, currentPlayer, board);
        break;

      default:
        get().endTurn();
        break;
    }
  },

  endTurn: () => {
    set({
      modal: { type: "NONE" as const },
    });
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