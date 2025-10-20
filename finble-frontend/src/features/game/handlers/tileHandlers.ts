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




  const pendingCostInfo = get().pendingTileCost;
  const normalizeServerNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };
  const tollFromServer = normalizeServerNumber(pendingCostInfo?.tollAmount);
  const acquireCostFromServer = normalizeServerNumber(pendingCostInfo?.acquisitionCost);

  if (pendingCostInfo) {
    set({ pendingTileCost: null });
  }

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

    let toll = tollFromServer ?? get().applyEconomicMultiplier(baseToll, 'tollMultiplier');

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
      const acquireCost = acquireCostFromServer ?? adjustedLandPrice * 2;

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
        get().addToast("info", `🏠 ${currentTile.name}`, "당신의 소유 땅입니다. 건물을 더 지을 수 없습니다.", 2000);
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
  board?: TileData[],
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
      // API 명세: 감옥 도착 시 자동으로 3턴간 이동 불가 (서버 통신 불필요)
      if (isMyTurn) {
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
              text: "감옥에 갇혔습니다! 다음 턴부터 3턴 동안 머물게 됩니다.",
              onConfirm: () => {
                set({ modal: { type: "NONE" as const } });
                console.log("🔒 [JAIL] 내 턴 - 감옥 도착 처리 완료, 턴 종료");
                get().endTurn();
              },
            },
          };
        });
      } else {
        // 다른 플레이어의 턴: 토스트로 표시하고 자동 처리
        set((state) => {
          const updatedPlayers = [...state.players];
          updatedPlayers[state.currentPlayerIndex] = {
            ...updatedPlayers[state.currentPlayerIndex],
            isInJail: true,
            jailTurns: 3,
          };

          const playerName = updatedPlayers[state.currentPlayerIndex].name;
          console.log(`🔒 [JAIL] 다른 플레이어 턴 - ${playerName}님이 감옥에 갇힘 (토스트 표시)`);

          // 다른 플레이어들에게 토스트로 알림
          get().addToast(
            "warning",
            "🔒 감옥 입성",
            `${playerName}님이 감옥에 갇혔습니다! (3턴간 움직일 수 없음)`,
            4000
          );

          return {
            players: updatedPlayers,
            modal: { type: "NONE" as const }
          };
        });

        // 다른 플레이어의 턴에는 턴 종료를 호출하지 않음
        // setTimeout(() => get().endTurn(), 100);
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
      if (isMyTurn) {
        const gameState = get();
        const salaryReceived = gameState.lastSalaryBonus > 0;

        console.log("🏠 [START] 내 턴 - 월급 확인:", {
          lastSalaryBonus: gameState.lastSalaryBonus,
          salaryReceived: salaryReceived
        });

        if (salaryReceived) {
          // 실제로 월급을 받았을 때만 토스트 표시
          get().addToast("success", "🏠 시작점 도착!", `월급 ${gameState.lastSalaryBonus.toLocaleString()}원을 받았습니다!`, 3000);
        } else {
          // 월급을 받지 않았을 때 (단순 도착)
          console.log("🏠 [START] 시작점 도착했지만 월급 없음 - 일반 타일처럼 처리");
        }

        // 월급 받았든 안 받았든 턴은 종료 (시작점은 특별한 액션이 없음)
        get().endTurn();
      } else {
        console.log("🏠 [START] 다른 플레이어 턴 - endTurn 호출");
        setTimeout(() => get().endTurn(), 100);
      }
      break;

    case "AIRPLANE":
      // AIRPLANE 타일: 플레이어를 세계여행 모드로 설정만 함 (실제 여행은 다음 턴에 목적지 선택 시)

      if (isMyTurn) {
        // 감옥에 있는 플레이어는 세계여행 불가
        if (currentPlayer.isInJail && currentPlayer.jailTurns > 0) {
          console.log("✈️ [AIRPLANE] 감옥에 있는 플레이어는 세계여행 불가");
          get().addToast("warning", "✈️ 세계여행 불가", "감옥에 있는 동안은 세계여행을 할 수 없습니다.", 3000);
          get().endTurn();
          return;
        }

        console.log("✈️ [AIRPLANE] 내 턴 - 모달 표시");
        console.log("✈️ [AIRPLANE] 현재 상태:", {
          gamePhase: get().gamePhase,
          currentModal: get().modal,
          currentPlayerIndex: get().currentPlayerIndex
        });

        set((state) => {
          const updatedPlayers = [...state.players];
          updatedPlayers[state.currentPlayerIndex] = {
            ...updatedPlayers[state.currentPlayerIndex],
            isTraveling: true,
          };

          console.log("✈️ [AIRPLANE] 세계여행 모달 설정 중...");

          return {
            players: updatedPlayers,
            gamePhase: "TILE_ACTION", // 안정적인 상태 유지
            modal: {
              type: "INFO",
              text: "세계여행! 다음 턴에 원하는 곳으로 이동할 수 있습니다.",
              onConfirm: () => {
                console.log("✈️ [AIRPLANE] 모달 확인 버튼 클릭됨");
                set({
                  modal: { type: "NONE" as const },
                  gamePhase: "WAITING_FOR_ROLL" // 다음 턴 대기 상태로 설정
                });
                console.log("✈️ [AIRPLANE] 세계여행 설정 완료, 턴 종료");
                get().endTurn();
              },
            },
          };
        });

        // 모달 자동 복원 로직 제거 (근본 원인 해결로 불필요)
      } else {
        console.log("✈️ [AIRPLANE] 다른 플레이어 턴 - 상태만 업데이트 (턴 종료 호출 안함)");
        set((state) => {
          const playerToUpdateIndex = state.players.findIndex(p => p.id === currentPlayer.id);
          if (playerToUpdateIndex === -1) {
            console.error("✈️ [AIRPLANE] 버그: 상태 업데이트할 플레이어를 찾지 못했습니다.", { playerToUpdateName: currentPlayer.name });
            return {};
          }
          const updatedPlayers = [...state.players];
          updatedPlayers[playerToUpdateIndex] = {
            ...updatedPlayers[playerToUpdateIndex],
            isTraveling: true,
          };
          return {
            players: updatedPlayers,
            modal: { type: "NONE" as const },
          };
        });
        // setTimeout(() => get().endTurn(), 100); // BUG: 다른 클라이언트가 턴을 종료시키면 안됨
      }
      break;

    case "NTS":
      // 국세청: 서버에 NTS 이벤트 요청 전송
      console.log("🏛️ [NTS] 국세청 도착 - 서버에 이벤트 요청");

      if (isMyTurn) {
        const { gameId } = get();
        const sendFunction = send || get().send;

        if (gameId && sendFunction) {
          // 서버에 국세청 이벤트 처리 요청 전송 (WebSocket 메시지로)
          sendFunction(`/app/game/${gameId}`, {
            type: "NTS_EVENT",
            payload: {
              nickname: currentPlayer.name,
              payTax: true
            },
          });
          console.log("🏛️ [NTS] 서버에 NTS 이벤트 요청 전송 완료");
        } else {
          console.error("❌ [NTS] gameId 또는 send 함수가 설정되지 않음");
          get().endTurn();
        }
      } else {
        // 다른 플레이어의 턴은 서버에서 자동 처리됨
        console.log("🏛️ [NTS] 다른 플레이어 턴 - 서버 처리 대기");
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
