import type { GameState, Player } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";
import { chanceCards } from "../constants/gameConstants.ts";

export const handleCityCompanyTile = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
  currentTile: TileData,
  currentPlayer: Player,
  players: Player[]
) => {
  const owner = players.find((p) =>
    p.properties.includes(currentPlayer.position)
  );
  if (!owner) {
    if (currentPlayer.money >= (currentTile.price ?? 0)) {
      set({ modal: { type: "BUY_PROPERTY", tile: currentTile } });
    } else {
      set({ modal: { type: "NONE" as const } });
    }
  } else if (owner.id !== currentPlayer.id) {
    let toll = currentTile.tolls?.[currentTile.buildings?.level || 0] || 50000;

    if (get().expoLocation === currentPlayer.position) {
      toll *= 2;
    }

    const acquireCost = (currentTile.price || 0) * 2;
    set({
      modal: { type: "ACQUIRE_PROPERTY", tile: currentTile, acquireCost, toll },
    });
  } else {
    if (
      currentTile.type === "city" &&
      currentPlayer.lapCount > 0 &&
      (currentTile.buildings?.level ?? 0) < 3
    ) {
      set({
        gamePhase: "MANAGE_PROPERTY",
        modal: { type: "MANAGE_PROPERTY", tile: currentTile },
      });
    } else {
      set({ modal: { type: "NONE" as const } });
    }
  }
};

export const handleChanceTile = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
  currentTile: TileData,
  currentPlayer: Player,
  chanceCards: { text: string; action: (player: Player) => Player }[]
) => {
  const randomCard =
    chanceCards[Math.floor(Math.random() * chanceCards.length)];
  set((state) => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const originalPosition = currentPlayer.position;
    const playerAfterAction = randomCard.action(currentPlayer);
    const moved = playerAfterAction.position !== originalPosition;
    const updatedPlayers = state.players.map((p) =>
      p.id === playerAfterAction.id ? playerAfterAction : p
    );

    return {
      players: updatedPlayers,
      modal: {
        type: "CHANCE_CARD",
        text: randomCard.text,
        onConfirm: () => {
          set({ modal: { type: "NONE" as const } });
          if (moved) {
            get().handleTileAction();
          } else {
            set({ modal: { type: "NONE" as const } });
          }
        },
      },
    };
  });
};

export const handleSpecialTile = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
  currentTile: TileData,
  currentPlayer: Player,
  board: TileData[]
) => {
  switch (currentTile.name) {
    case "무인도":
      set((state) => {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...updatedPlayers[state.currentPlayerIndex],
          isInJail: true,
          jailTurns: 3,
        };
        return {
          players: updatedPlayers,
          modal: {
            type: "INFO",
            text: "무인도에 갇혔습니다! 다음 턴부터 3턴 동안 머물게 됩니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      });
      break;
    case "박람회": {
      const ownedProperties = currentPlayer.properties.map((index) => ({
        name: board[index].name,
        index,
      }));
      if (ownedProperties.length > 0) {
        set({ modal: { type: "EXPO", properties: ownedProperties } });
      } else {
        set({
          modal: {
            type: "INFO",
            text: "소유한 땅이 없어 박람회 효과를 받을 수 없습니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        });
      }
      break;
    }
    case "세계여행":
      set((state) => {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...updatedPlayers[state.currentPlayerIndex],
          isTraveling: true,
        };
        return {
          players: updatedPlayers,
          modal: {
            type: "INFO",
            text: "세계여행! 다음 턴에 원하는 곳으로 이동할 수 있습니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } }),
          },
        };
      });
      break;
    default:
      set({ modal: { type: "NONE" as const } });
      break;
  }
};

export const handleInsufficientFundsForToll = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
  requiredAmount: number,
  propertiesToSell: { index: number; price: number }[],
  currentPlayer: Player,
  players: Player[],
  currentPlayerIndex: number,
  tileIndex: number,
  toll: number
) => {
  let moneyRaised = 0;
  const soldProperties: number[] = [];

  for (const prop of propertiesToSell) {
    if (moneyRaised >= requiredAmount) break;

    const salePrice = prop.price * 0.8;
    moneyRaised += salePrice;
    soldProperties.push(prop.index);
  }

  if (currentPlayer.money + moneyRaised >= toll) {
    const updatedPlayer = {
      ...currentPlayer,
      money: currentPlayer.money + moneyRaised - toll,
      properties: currentPlayer.properties.filter(
        (p) => !soldProperties.includes(p)
      ),
    };

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = updatedPlayer;

    const finalOwner = updatedPlayers.find((p) =>
      p.properties.includes(tileIndex)
    )!;
    const ownerIndex = updatedPlayers.findIndex((p) => p.id === finalOwner.id);
    updatedPlayers[ownerIndex] = {
      ...finalOwner,
      money: finalOwner.money + toll,
    };

    return {
      players: updatedPlayers,
      modal: {
        type: "INFO" as const,
        text: `현금이 부족하여 부동산 ${soldProperties.length}개를 자동 매각하고 통행료를 지불했습니다.`,
      },
    };
  }
};