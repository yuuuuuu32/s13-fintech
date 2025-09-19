import type { GameState, Player } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";

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
  const currentUserId = useUserStore.getState().userInfo?.userId;
  const isMyTurn = currentPlayer.id === currentUserId;

  console.log("🎮 [CITY/COMPANY] 턴 체크:", {
    currentPlayerId: currentPlayer.id,
    currentPlayerName: currentPlayer.name,
    currentUserId: currentUserId,
    isMyTurn: isMyTurn,
    tileType: currentTile?.type,
    tileName: currentTile?.name,
    hasOwner: !!owner,
    ownerName: owner?.name
  });

  if (!owner) {
    const baseLandPrice = (currentTile as TileData & { landPrice?: number }).landPrice ?? currentTile.price ?? 0;
    const adjustedLandPrice = get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');
    if (currentPlayer.money >= adjustedLandPrice) {
      if (isMyTurn) {
        // 조정된 가격으로 모달 표시
        const adjustedTile = { ...currentTile, price: adjustedLandPrice };
        set({ modal: { type: "BUY_PROPERTY", tile: adjustedTile } });
      } else {
        // 다른 플레이어의 턴: 모달 표시하지 않음
        set({ modal: { type: "NONE" as const } });
      }
    } else {
      if (isMyTurn) {
        set({ modal: { type: "NONE" as const } }); // Or show not enough money modal
      } else {
        // 다른 플레이어의 턴: 모달 표시하지 않음
        set({ modal: { type: "NONE" as const } });
      }
    }
  } else if (owner.id !== currentPlayer.id) {
    const baseToll = (currentTile as TileData & { toll?: number }).toll || currentTile.tolls?.[currentTile.buildings?.level || 0] || 50000;
    let toll = get().applyEconomicMultiplier(baseToll, 'tollMultiplier');

    if (get().expoLocation === currentPlayer.position) {
      toll *= 2;
    }

    if (isMyTurn) {
      const baseLandPrice = (currentTile as TileData & { landPrice?: number }).landPrice ?? currentTile.price ?? 0;
      const adjustedLandPrice = get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');
      const acquireCost = adjustedLandPrice * 2;
      set({
        modal: { type: "ACQUIRE_PROPERTY", tile: currentTile, acquireCost, toll },
      });
    } else {
      // 다른 플레이어의 턴: 통행료 자동 지불
      set((state) => {
        const updatedPlayers = [...state.players];
        const currentPlayerIndex = state.currentPlayerIndex;
        const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id);

        // 통행료 지불
        updatedPlayers[currentPlayerIndex] = {
          ...updatedPlayers[currentPlayerIndex],
          money: updatedPlayers[currentPlayerIndex].money - toll
        };

        // 소유자에게 통행료 지급
        updatedPlayers[ownerIndex] = {
          ...updatedPlayers[ownerIndex],
          money: updatedPlayers[ownerIndex].money + toll
        };

        return {
          players: updatedPlayers,
          modal: { type: "NONE" as const }
        };
      });
    }
  } else {
    // 자신의 땅에 도착한 경우
    if (isMyTurn) {
      const canBuildMore = (currentTile.buildings?.level ?? 0) < 3;
      const isBuildableType = currentTile.type === "city" || (currentTile as TileData & { type?: string }).type === "NORMAL";

      console.log("🏗️ [BUILDING_CHECK] 건물 건설 가능 여부 확인:", {
        tileName: currentTile.name,
        tileType: currentTile.type,
        currentBuildingLevel: currentTile.buildings?.level ?? 0,
        playerLapCount: currentPlayer.lapCount,
        isBuildableType,
        canBuildMore,
        willShowModal: isBuildableType && canBuildMore
      });

      if (isBuildableType && canBuildMore) {
        console.log("🏗️ [BUILDING_MODAL] 건물 관리 모달 표시");
        set({
          gamePhase: "MANAGE_PROPERTY",
          modal: { type: "MANAGE_PROPERTY", tile: currentTile },
        });
      } else {
        console.log("🏗️ [BUILDING_SKIP] 건물 건설 불가능:", {
          reason: !isBuildableType ? "건설 불가능한 타일 타입" : "최대 건물 레벨 도달"
        });
        set({ modal: { type: "NONE" as const } });
      }
    } else {
      // 다른 플레이어의 턴: 모달 표시하지 않음
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
  const currentUserId = useUserStore.getState().userInfo?.userId;
  const isMyTurn = currentPlayer.id === currentUserId;

  console.log("🎲 [CHANCE] 턴 체크:", {
    currentPlayerId: currentPlayer.id,
    currentPlayerName: currentPlayer.name,
    currentUserId: currentUserId,
    isMyTurn: isMyTurn,
    tileType: currentTile?.type,
    tileName: currentTile?.name
  });
  const randomCard =
    chanceCards[Math.floor(Math.random() * chanceCards.length)];

  set((state) => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const playerAfterAction = randomCard.action(currentPlayer);
    const updatedPlayers = state.players.map((p) =>
      p.id === playerAfterAction.id ? playerAfterAction : p
    );

    return {
      players: updatedPlayers,
      modal: isMyTurn ? {
        type: "CHANCE_CARD",
        text: randomCard.text,
        onConfirm: () => {
          set({ modal: { type: "NONE" as const } });
          // Do not trigger handleTileAction again to prevent chain reactions
          // The chance card effect has already been applied
          get().endTurn();
        },
      } : { type: "NONE" as const },
    };
  });

  // 다른 플레이어의 턴이면 바로 턴 종료
  if (!isMyTurn) {
    // Do not trigger additional tile actions for other players
    // to prevent chain reactions and unexpected behavior
    setTimeout(() => get().endTurn(), 100);
  }
};

export const handleSpecialTile = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
  currentTile: TileData,
  currentPlayer: Player,
  board: TileData[],
  send?: (destination: string, body: Record<string, unknown>) => void
) => {
  const currentUserId = useUserStore.getState().userInfo?.userId;
  const isMyTurn = currentPlayer.id === currentUserId;

  console.log("🏛️ [SPECIAL] 턴 체크:", {
    currentPlayerId: currentPlayer.id,
    currentPlayerName: currentPlayer.name,
    currentUserId: currentUserId,
    isMyTurn: isMyTurn,
    tileType: currentTile?.type,
    tileName: currentTile?.name
  });

  switch (currentTile.type) {
    case "JAIL":
      set((state) => {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...updatedPlayers[state.currentPlayerIndex],
          isInJail: true,
          jailTurns: 3,
        };
        return {
          players: updatedPlayers,
          modal: isMyTurn ? {
            type: "INFO",
            text: "감옥에 갇혔습니다! 다음 턴부터 3턴 동안 머물게 됩니다.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              console.log("🔒 [JAIL] 감옥 도착 처리 완료, 턴 종료");
              get().endTurn();
            },
          } : { type: "NONE" as const },
        };
      });

      // 다른 플레이어의 턴이면 바로 턴 종료
      if (!isMyTurn) {
        console.log("🔒 [JAIL] 다른 플레이어 감옥 도착, 턴 종료");
        setTimeout(() => get().endTurn(), 100);
      }
      break;
    // case "박람회": {
    //   if (isMyTurn) {
    //     const ownedProperties = currentPlayer.properties.map((index) => ({
    //       name: board[index].name,
    //       index,
    //     }));
    //     if (ownedProperties.length > 0) {
    //       set({ modal: { type: "EXPO", properties: ownedProperties } });
    //     } else {
    //       set({
    //         modal: {
    //           type: "INFO",
    //           text: "소유한 땅이 없어 박람회 효과를 받을 수 없습니다.",
    //           onConfirm: () => set({ modal: { type: "NONE" as const } }),
    //         },
    //       });
    //     }
    //   } else {
    //     set({ modal: { type: "NONE" as const } });
    //   }
    //   break;
    // }
    case "START":
      console.log("🏠 [START] 시작점 도착");
      if (isMyTurn) {
        set({
          modal: {
            type: "INFO",
            text: "시작점에 도착했습니다! 월급을 받았습니다.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              console.log("🏠 [START] 시작점 처리 완료, 턴 종료");
              get().endTurn();
            },
          },
        });
      } else {
        console.log("🏠 [START] 다른 플레이어 시작점 도착, 턴 종료");
        setTimeout(() => get().endTurn(), 100);
      }
      break;

    case "AIRPLANE":
      // 백엔드에 세계여행 이벤트 요청 전송
      if (send && isMyTurn) {
        send('/app/game/world-travel', {
          type: "WORLD_TRAVEL_EVENT",
          payload: {
            playerId: currentPlayer.id,
            currentPosition: currentPlayer.position
          }
        });
      }

      set((state) => {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...updatedPlayers[state.currentPlayerIndex],
          isTraveling: true,
        };
        return {
          players: updatedPlayers,
          modal: isMyTurn ? {
            type: "INFO",
            text: "세계여행! 다음 턴에 원하는 곳으로 이동할 수 있습니다.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              console.log("✈️ [AIRPLANE] 세계여행 처리 완료, 턴 종료");
              get().endTurn();
            },
          } : { type: "NONE" as const },
        };
      });

      // 다른 플레이어의 턴이면 바로 턴 종료
      if (!isMyTurn) {
        console.log("✈️ [AIRPLANE] 다른 플레이어 세계여행, 턴 종료");
        setTimeout(() => get().endTurn(), 100);
      }
      break;

    default:
      console.log("❓ [SPECIAL] 알 수 없는 특수 타일, 턴 종료");
      get().endTurn();
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