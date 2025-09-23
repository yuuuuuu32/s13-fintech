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




  if (!owner) {
    const baseLandPrice = (currentTile as TileData & { landPrice?: number }).landPrice ?? currentTile.price ?? 0;
    const adjustedLandPrice = get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');
    if (currentPlayer.money >= adjustedLandPrice) {
      if (isMyTurn) {
        set({ modal: { type: "BUY_PROPERTY", tile: currentTile } });
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
    const baseToll = currentTile.toll;
    if (!baseToll) {
      console.error("💰 [TOLL_ERROR] 서버에서 통행료 정보를 받지 못했습니다:", {
        tileName: currentTile.name,
        currentTile
      });
      return;
    }

    let toll = get().applyEconomicMultiplier(baseToll, 'tollMultiplier');

    if (get().expoLocation === currentPlayer.position) {
      toll *= 2;
    }

    // 먼저 통행료 자동 지불 (내 턴, 다른 플레이어 턴 상관없이)
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
        players: updatedPlayers
      };
    });

    if (isMyTurn) {
      // 통행료 지불 후 인수 여부만 묻기
      const baseLandPrice = (currentTile as TileData & { landPrice?: number }).landPrice ?? currentTile.price ?? 0;
      const adjustedLandPrice = get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');
      const acquireCost = adjustedLandPrice * 2;

      // 통행료 지불 완료 후 바로 인수 선택 모달 표시
      set({
        modal: {
          type: "ACQUIRE_PROPERTY",
          tile: currentTile,
          acquireCost,
          toll: 0, // 이미 지불했으므로 0
          isPaidToll: true // 통행료 이미 지불됨을 표시
        }
      });
    } else {
      // 다른 플레이어의 턴: 모달 표시하지 않음 (통행료는 이미 위에서 지불됨)
      set({ modal: { type: "NONE" as const } });
    }
  } else {
    // 자신의 땅에 도착한 경우
    if (isMyTurn) {
      const canBuildMore = (currentTile.buildings?.level ?? 0) < 3;
      const isBuildableType = (currentTile as TileData & { type?: string }).type === "NORMAL";


      if (isBuildableType && canBuildMore) {
        set({
          gamePhase: "MANAGE_PROPERTY",
          modal: { type: "MANAGE_PROPERTY", tile: currentTile },
        });
      } else {
        // 건물 건설 불가능한 경우 바로 턴 종료
        set({ modal: { type: "NONE" as const } });
        get().endTurn();
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


  switch (currentTile.type) {
    case "SPECIAL":
      // 스페셜 땅 처리 - 핸들러에 위임
      if (isMyTurn) {
        const { handleSpecialLandInteraction } = get();
        handleSpecialLandInteraction(currentPlayer.position, currentTile);
      } else {
        set({ modal: { type: "NONE" as const } });
      }
      break;

    case "JAIL":
      set((state) => {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...updatedPlayers[state.currentPlayerIndex],
          isInJail: true,
          jailTurns: 3,
        };

        const playerName = updatedPlayers[state.currentPlayerIndex].name;
        const modalText = isMyTurn
          ? "감옥에 갇혔습니다! 다음 턴부터 3턴 동안 머물게 됩니다."
          : `${playerName}님이 감옥에 갇혔습니다!`;

        return {
          players: updatedPlayers,
          modal: {
            type: "INFO",
            text: modalText,
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              console.log("🔒 [JAIL] 감옥 도착 처리 완료, 턴 종료");
              get().endTurn();
            },
          },
        };
      });
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
      if (isMyTurn) {
        console.log("🏠 [START] 내 턴 - 모달 표시");
        set({
          modal: {
            type: "INFO",
            text: "시작점에 도착했습니다! 월급을 받았습니다.",
            onConfirm: () => {
              console.log("🏠 [START] 모달 확인 버튼 클릭됨");
              set({ modal: { type: "NONE" as const } });
              get().endTurn();
            },
          },
        });
      } else {
        console.log("🏠 [START] 다른 플레이어 턴 - endTurn 호출");
        setTimeout(() => get().endTurn(), 100);
      }
      break;

    case "AIRPLANE":
      // AIRPLANE 타일: 플레이어를 세계여행 모드로 설정만 함 (실제 여행은 다음 턴에 목적지 선택 시)

      if (isMyTurn) {
        console.log("✈️ [AIRPLANE] 내 턴 - 모달 표시");
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
              onConfirm: () => {
                console.log("✈️ [AIRPLANE] 모달 확인 버튼 클릭됨");
                set({ modal: { type: "NONE" as const } });
                get().endTurn();
              },
            },
          };
        });
      } else {
        console.log("✈️ [AIRPLANE] 다른 플레이어 턴 - 상태만 업데이트하고 endTurn 호출");
        set((state) => {
          const updatedPlayers = [...state.players];
          updatedPlayers[state.currentPlayerIndex] = {
            ...updatedPlayers[state.currentPlayerIndex],
            isTraveling: true,
          };
          return {
            players: updatedPlayers,
            modal: { type: "NONE" as const },
          };
        });
        setTimeout(() => get().endTurn(), 100);
      }
      break;

    default:
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