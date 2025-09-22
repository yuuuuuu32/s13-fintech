import type { GameState } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";

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

    // 서버에 건설 메시지 전송
    if (gameId) {
      send(`/app/game/${gameId}/construct-building`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          nickname: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: "LAND", // 특수 땅도 'LAND' 타입으로 구매
        },
      });
    } else {
      console.error("Cannot construct building, gameId is not set");
    }

    // 모달 닫기
    set({ modal: { type: "NONE" } });
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

    if (!owner) {
      // 주인이 없는 경우 - 구매 모달 표시
      const landPrice = tile?.landPrice || tile?.price || 0;
      set({
        modal: {
          type: "BUY_SPECIAL_LAND" as const,
          tile: tile,
          landPrice: landPrice,
        },
      });
    } else if (owner.id !== currentPlayer.id) {
      // 다른 플레이어 소유 - 통행료 바로 지불
      const toll = tile?.landPrice || tile?.price || 0;
      const { paySpecialLandToll } = get();
      paySpecialLandToll(tileIndex, toll);
    } else {
      // 자신 소유 - 아무 동작 없음
      set({
        modal: {
          type: "INFO" as const,
          text: `${tile.name}은(는) 당신의 소유입니다.`,
          onConfirm: () => set({ modal: { type: "NONE" as const } }),
        },
      });
    }
  },
});