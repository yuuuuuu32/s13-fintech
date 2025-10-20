import type { GameState } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";

// 스페셜 땅 위치 (MapService.java의 EVENT_CELLS와 동일)
const SPECIAL_LAND_POSITIONS = [5, 13, 21, 28, 31]; // 광주, 대전, 구미, 부산, 서울

export const createSpecialLandHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  // 스페셜 땅인지 확인
  isSpecialLand: (tileIndex: number): boolean => {
    return SPECIAL_LAND_POSITIONS.includes(tileIndex);
  },

  // 스페셜 땅 구매
  buySpecialLand: (tile: TileData, landPrice: number) => {
    const { gameId, send, players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];
    const tileIndex = board.findIndex(t => t.name === tile.name);

    if (tileIndex === -1) {
      console.error("Cannot find special land to buy:", tile.name);
      return;
    }

    // 클라이언트 사이드 자금 체크
    if (currentPlayer.money < landPrice) {
      set({ modal: { type: "INFO", text: "자산이 부족하여 구매할 수 없습니다." } });
      return;
    }

    // 서버에 특수 땅 구매 메시지 전송 - CONSTRUCT_BUILDING 사용 (API 명세에 따름)
    if (gameId) {

      send(`/app/game/${gameId}/construct-building`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          nickname: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: "FIELD", // SPECIAL 땅은 땅만 구매 (FIELD)
        },
      });

      // 모달 닫기 - 서버 응답은 CONSTRUCT_BUILDING 핸들러에서 처리
      set({ modal: { type: "NONE" } });
    } else {
      console.error("Cannot construct building, gameId is not set");
      // 오류 시에만 모달 유지하고 에러 표시
      set({
        modal: {
          type: "INFO",
          text: "게임 연결에 문제가 있어 구매할 수 없습니다.",
          onConfirm: () => set({ modal: { type: "NONE" } })
        }
      });
    }
  },

  // 스페셜 땅 통행료 지불 (모달 없이 바로 처리)
  paySpecialLandToll: (tileIndex: number, toll: number) => {
    const { players } = get();
    const owner = players.find((p) => p.properties.includes(tileIndex));

    if (!owner) {
      console.error("Special land has no owner");
      return;
    }

    set((state) => {
      const updatedPlayers = [...state.players];
      const playerIdx = state.currentPlayerIndex;
      const ownerIdx = updatedPlayers.findIndex((p) => p.id === owner.id);

      // 통행료 지불
      updatedPlayers[playerIdx] = {
        ...updatedPlayers[playerIdx],
        money: updatedPlayers[playerIdx].money - toll,
      };

      // 소유자에게 통행료 지급
      updatedPlayers[ownerIdx] = {
        ...updatedPlayers[ownerIdx],
        money: updatedPlayers[ownerIdx].money + toll,
      };

      const { board } = get();
      const tileName = board[tileIndex]?.name || "스페셜 땅";

      return {
        players: updatedPlayers,
        modal: {
          type: "INFO" as const,
          text: `${tileName}의 통행료 ${toll.toLocaleString()}원을 지불했습니다.`,
          onConfirm: () => set({ modal: { type: "NONE" as const } }),
        },
      };
    });
  },

  // 스페셜 땅 독점 승리 조건 확인
  checkSpecialLandMonopoly: () => {
    const { players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    // 현재 플레이어가 소유한 스페셜 땅 개수 확인
    const ownedSpecialLands = currentPlayer.properties.filter((propertyIndex) =>
      SPECIAL_LAND_POSITIONS.includes(propertyIndex)
    );

    // 5개 스페셜 땅을 모두 소유했는지 확인
    if (ownedSpecialLands.length === 5) {
      set((state) => ({
        ...state,
        winnerId: currentPlayer.id,
        gamePhase: "GAME_OVER" as const,
        modal: {
          type: "INFO" as const,
          text: `🎉 ${currentPlayer.name}님이 모든 SSAFY 특별 땅을 독점하여 승리했습니다!`,
          onConfirm: () => set({ modal: { type: "NONE" as const } }),
        },
      }));

      // 서버에 게임 종료 알림
      const { gameId, send } = get();
      if (gameId) {
        send(`/app/game/${gameId}/game-over`, {
          type: "GAME_OVER",
          payload: {
            winnerId: currentPlayer.id,
            winnerName: currentPlayer.name,
            winCondition: "SPECIAL_LAND_MONOPOLY",
          },
        });
      }
    }
  },

  // 스페셜 땅 상호작용 처리
  handleSpecialLandInteraction: (tileIndex: number, tile: TileData) => {
    const { players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];
    const owner = players.find((p) => p.properties.includes(tileIndex));

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
      // 주인이 없는 경우 - SPECIAL 땅 구매 모달 표시 (건물 건설 불가능)
      const baseLandPrice = tile?.landPrice || tile?.price || 0;
      const adjustedLandPrice = acquireCostFromServer ?? get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');


      set({
        modal: {
          type: "BUY_SPECIAL_LAND" as const,
          tile: tile,
          landPrice: adjustedLandPrice,
        },
      });
    } else if (owner.id !== currentPlayer.id) {
      // 다른 플레이어 소유 - 통행료만 지불 (인수 불가능)
      const baseToll = tile?.toll;
      if (!baseToll) {
        console.error("💰 [SPECIAL_TOLL_ERROR] 특수 땅 통행료 정보를 받지 못했습니다:", {
          tileName: tile.name,
          tile
        });
        return;
      }
      const adjustedToll = tollFromServer ?? get().applyEconomicMultiplier(baseToll, 'tollMultiplier');

      const currentUserId = useUserStore.getState().userInfo?.userId;
      const isMyTurn = currentPlayer.id === currentUserId;

      // 통행료 자동 지불 (내 턴, 다른 플레이어 턴 상관없이) - 모달과 함께 한 번에 처리
      set((state) => {
        const updatedPlayers = [...state.players];
        const currentPlayerIndex = state.currentPlayerIndex;
        const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id);

        // 통행료 지불
        updatedPlayers[currentPlayerIndex] = {
          ...updatedPlayers[currentPlayerIndex],
          money: updatedPlayers[currentPlayerIndex].money - adjustedToll
        };

        // 소유자에게 통행료 지급
        updatedPlayers[ownerIndex] = {
          ...updatedPlayers[ownerIndex],
          money: updatedPlayers[ownerIndex].money + adjustedToll
        };

        // 통행료 지불은 토스트로 표시 (모달 충돌 방지)
        if (isMyTurn) {
          get().addToast(
            "warning",
            `💰 ${tile.name} 통행료`,
            `${adjustedToll.toLocaleString()}원을 지불했습니다.\n\n스페셜 땅은 인수할 수 없습니다.`,
            3000
          );
          setTimeout(() => get().endTurn(), 500);
        }

        return {
          players: updatedPlayers,
          modal: { type: "NONE" as const }
        };
      });
    } else {
      // 자신 소유 - 모달 확인 후 턴 종료
      const currentUserId = useUserStore.getState().userInfo?.userId;
      const isMyTurn = currentPlayer.id === currentUserId;

      if (isMyTurn) {
        get().addToast("info", `🏠 ${tile.name}`, "당신의 소유입니다.", 2000);
        get().endTurn();
      } else {
        // 다른 플레이어 턴: 모달 없이 자동 처리
        set({ modal: { type: "NONE" as const } });
        get().endTurn();
      }
    }
  },
});
