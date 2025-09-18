import type { GameState, Player } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";
import { BuildingType } from "../data/boardData.ts";
import { BAIL_AMOUNT } from "../constants/gameConstants.ts";
import { handleInsufficientFundsForToll } from "./tileHandlers.ts";

export const createPlayerActions = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  buyProperty: () => {
    set((state) => {
      const { players, currentPlayerIndex, modal, board } = state;
      const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
      if (tileIndex === -1 || !modal.tile?.price) return {};

      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer.money >= modal.tile.price) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - modal.tile.price,
          properties: [...currentPlayer.properties, tileIndex],
        };
        return { players: updatedPlayers };
      }
      return {
        modal: { type: "INFO" as const, text: "자산이 부족하여 구매할 수 없습니다." },
      };
    });
  },

  buyPropertyWithItems: (purchaseData: { selectedItems: any; totalCost: number; tile: any }) => {
    const { gameId, send, players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];

    // 1. Check for funds (client-side check)
    if (currentPlayer.money < purchaseData.totalCost) {
      set({ modal: { type: "INFO" as const, text: "자산이 부족하여 구매할 수 없습니다." } });
      return;
    }

    const tileIndex = board.findIndex((t) => t.name === purchaseData.tile?.name);
    if (tileIndex === -1) {
      console.error("Could not find tile to buy:", purchaseData.tile?.name);
      return;
    }

    // 2. Perform optimistic update on the client
    set((state) => {
      const updatedPlayers = [...state.players];
      const playerToUpdate = updatedPlayers[state.currentPlayerIndex];

      updatedPlayers[state.currentPlayerIndex] = {
        ...playerToUpdate,
        money: playerToUpdate.money - purchaseData.totalCost,
        properties: [...playerToUpdate.properties, tileIndex],
      };

      // Also update building level on the board optimistically if needed
      const updatedBoard = [...state.board];
      let buildingLevel = 0;
      if (purchaseData.selectedItems.house) buildingLevel = 1;
      if (purchaseData.selectedItems.building) buildingLevel = 2;
      if (purchaseData.selectedItems.hotel) buildingLevel = 3;

      if (updatedBoard[tileIndex] && buildingLevel > 0) {
        updatedBoard[tileIndex] = {
          ...updatedBoard[tileIndex],
          buildings: { level: buildingLevel as 0 | 1 | 2 | 3 },
        };
      }

      return {
        players: updatedPlayers,
        board: updatedBoard,
        modal: { type: "NONE" as const },
      };
    });

    // 3. Send message to the server to make the change permanent
    if (gameId) {
      send(`/app/game/${gameId}/trade-land`, { // Destination is ignored but good for logging
        type: "TRADE_LAND",
        payload: {
          buyerName: currentPlayer.name,
          landNum: tileIndex,
          // Sending building info might be necessary, but API spec is unclear
          // buildingLevel: buildingLevel, 
        },
      });
    } else {
      console.error("Cannot sync property purchase, gameId is not set");
    }
  },

  acquireProperty: () => {
    set((state) => {
      const { players, currentPlayerIndex, modal, board } = state;
      const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
      if (tileIndex === -1 || !modal.acquireCost) return {};

      const currentPlayer = players[currentPlayerIndex];
      const owner = players.find((p) => p.properties.includes(tileIndex))!;

      if (currentPlayer.money >= modal.acquireCost) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - modal.acquireCost,
          properties: [...currentPlayer.properties, tileIndex],
        };
        const ownerIndex = updatedPlayers.findIndex((p) => p.id === owner.id);
        updatedPlayers[ownerIndex] = {
          ...owner,
          money: owner.money + modal.acquireCost,
          properties: owner.properties.filter((p) => p !== tileIndex),
        };
        return { players: updatedPlayers };
      }
      return {
        modal: { type: "INFO" as const, text: "자산이 부족하여 인수할 수 없습니다." },
      };
    });
  },

  payToll: () => {
    set((state) => {
      const { players, currentPlayerIndex, modal, board } = state;
      if (!modal.toll) {
        return { modal: { type: "NONE" as const } };
      }

      const currentPlayer = players[currentPlayerIndex];
      const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
      const toll = modal.toll;

      if (currentPlayer.money < toll) {
        const requiredAmount = toll - currentPlayer.money;

        const propertiesToSell = currentPlayer.properties
          .map((index) => ({ index, price: board[index].price || 0 }))
          .sort((a, b) => b.price - a.price);

        const result = handleInsufficientFundsForToll(
          set,
          get,
          requiredAmount,
          propertiesToSell,
          currentPlayer,
          players,
          currentPlayerIndex,
          tileIndex,
          toll
        );
        if (result) return result;
      }

      const currentPlayers = [...players];
      const player = currentPlayers[currentPlayerIndex];
      const currentOwner = currentPlayers.find((p) =>
        p.properties.includes(tileIndex)
      )!;
      const ownerIdx = currentPlayers.findIndex(
        (p) => p.id === currentOwner.id
      );

      currentPlayers[currentPlayerIndex] = {
        ...player,
        money: player.money - toll,
      };
      currentPlayers[ownerIdx] = {
        ...currentOwner,
        money: currentOwner.money + toll,
      };

      const updatedPlayer = currentPlayers[currentPlayerIndex];
      const text =
        updatedPlayer.money < 0
          ? `${updatedPlayer.name}님이 파산했습니다.`
          : `통행료 ${toll.toLocaleString()}원을 지불했습니다.`;

      return {
        players: currentPlayers,
        modal: {
          type: "INFO" as const,
          text: text,
        },
      };
    });
  },

  handleJail: () => {
    set((state) => {
      const updatedPlayers = [...state.players];
      const currentPlayer = updatedPlayers[state.currentPlayerIndex];
      const newJailTurns = currentPlayer.jailTurns - 1;

      if (newJailTurns <= 0) {
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          isInJail: false,
          jailTurns: 0,
        };
        return {
          players: updatedPlayers,
          modal: {
            type: "INFO" as const,
            text: "감옥에서 탈출했습니다! 다음 턴부터 정상 진행됩니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      } else {
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          jailTurns: newJailTurns,
        };
        return {
          players: updatedPlayers,
          modal: {
            type: "INFO" as const,
            text: `감옥 탈출까지 ${newJailTurns}턴 남았습니다.`,
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      }
    });
  },

  payBail: () => {
    set((state) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.money >= BAIL_AMOUNT) {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - BAIL_AMOUNT,
          isInJail: false,
          jailTurns: 0,
        };
        return {
          players: updatedPlayers,
          modal: { type: "NONE" as const },
          gamePhase: "WAITING_FOR_ROLL" as const,
        };
      } else {
        return { modal: { type: "INFO" as const, text: "보석금이 부족합니다." } };
      }
    });
  },

  selectExpoProperty: (propertyIndex: number) => {
    set({
      expoLocation: propertyIndex,
      modal: {
        type: "INFO" as const,
        text: `${
          get().board[propertyIndex].name
        }에서 박람회가 개최되어 통행료가 2배가 됩니다!`,
        onConfirm: () => set({ modal: { type: "NONE" as const } }),
      },
    });
  },

  startWorldTravelSelection: () => {
    set({ gamePhase: "WORLD_TRAVEL_MOVE", modal: { type: "NONE" as const } });
  },

  selectTravelDestination: (tileIndex: number) => {
    const { send, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    // 백엔드에 세계여행 목적지 전송
    if (send) {
      send('/app/game/world-travel', {
        type: "WORLD_TRAVEL_EVENT",
        payload: {
          playerId: currentPlayer.id,
          destinationPosition: tileIndex,
          currentPosition: currentPlayer.position
        }
      });
    }

    set((state) => {
      const { players, currentPlayerIndex } = state;
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...updatedPlayers[currentPlayerIndex],
        position: tileIndex,
        isTraveling: false,
      };
      return {
        players: updatedPlayers,
        gamePhase: "PLAYER_MOVING" as const,
        dice: [0, 0] as [number, number],
        modal: { type: "NONE" as const },
      };
    });
  },

  buildBuilding: (tileIndex: number) => {
    // Optimistic update
    set((state) => {
      const { players, currentPlayerIndex, board } = state;
      const currentPlayer = players[currentPlayerIndex];
      const tile = board[tileIndex];

      if (!tile.buildingPrice || !tile.buildings || tile.buildings.level >= 3) {
        return {
          modal: {
            type: "INFO" as const,
            text: "더 이상 건물을 지을 수 없습니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      }

      if (currentPlayer.money < tile.buildingPrice) {
        return {
          modal: {
            type: "INFO" as const,
            text: "건설 비용이 부족합니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      }

      if (currentPlayer.lapCount <= tile.buildings.level) {
        return {
          modal: {
            type: "INFO" as const,
            text: `건설에 필요한 바퀴 수(${
              tile.buildings.level + 1
            }바퀴)가 부족합니다.`,
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      }

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - tile.buildingPrice,
      };

      const newBoard = board.map((t, index) => {
        if (index === tileIndex && t.buildings) {
          return {
            ...t,
            buildings: { level: (t.buildings.level + 1) as 1 | 2 | 3 },
          };
        }
        return t;
      });

      return {
        players: updatedPlayers,
        board: newBoard,
        modal: {
          type: "INFO" as const,
          text: `${tile.name}에 ${
            BuildingType[newBoard[tileIndex].buildings!.level]
          }을(를) 건설했습니다!`,
          onConfirm: () => set({ modal: { type: "NONE" as const } }),
        },
      };
    });

    // Send message to server to confirm the action
    const { gameId, send, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];
    if (gameId) {
      send(`/app/game/${gameId}/construct-building`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          userName: currentPlayer.name,
          landNum: tileIndex,
        },
      });
    }
  },
});