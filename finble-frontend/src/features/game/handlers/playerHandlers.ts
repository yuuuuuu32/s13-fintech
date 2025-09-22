import type { GameState } from "../types/gameTypes.ts";
import { BuildingType } from "../data/boardData.ts";
import { BAIL_AMOUNT } from "../constants/gameConstants.ts";
import { handleInsufficientFundsForToll } from "./tileHandlers.ts";

export const createPlayerActions = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  buyProperty: () => {
    const { gameId, send, players, currentPlayerIndex, modal, board } = get();
    const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
    if (tileIndex === -1 || !modal.tile?.price) return;

    const currentPlayer = players[currentPlayerIndex];

    // 클라이언트 사이드 자금 체크
    if (currentPlayer.money < modal.tile.price) {
      set({ modal: { type: "INFO" as const, text: "자산이 부족하여 구매할 수 없습니다." } });
      return;
    }

    // 서버에 건설 메시지 전송
    if (gameId) {
      send(`/app/game/constructBuilding`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          nickname: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: "LAND",
        },
      });
    } else {
      console.error("Cannot construct building, gameId is not set");
    }
    
    set({ modal: { type: "NONE" as const } });
  },

  buyPropertyWithItems: (purchaseData: { selectedItems: Record<string, boolean>; totalCost: number; tile: Record<string, unknown> }) => {
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

    let targetBuildingType = "LAND";
    if (purchaseData.selectedItems.hotel) {
      targetBuildingType = "HOTEL";
    } else if (purchaseData.selectedItems.building) {
      targetBuildingType = "BUILDING";
    } else if (purchaseData.selectedItems.house) {
      targetBuildingType = "VILLA";
    }

    // 3. Send message to the server to make the change permanent
    if (gameId) {
      send(`/app/game/constructBuilding`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          nickname: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: targetBuildingType,
        },
      });
    } else {
      console.error("Cannot sync property purchase, gameId is not set");
    }

    set({ modal: { type: "NONE" as const } });
  },

  acquireProperty: () => {
    const { gameId, send, players, currentPlayerIndex, modal, board } = get();
    const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
    if (tileIndex === -1 || !modal.acquireCost) return;

    const currentPlayer = players[currentPlayerIndex];
    const owner = players.find((p) => p.properties.includes(tileIndex))!;

    // 클라이언트 사이드 자금 체크
    if (currentPlayer.money < modal.acquireCost) {
      set({ modal: { type: "INFO" as const, text: "자산이 부족하여 인수할 수 없습니다." } });
      return;
    }

    // 낙관적 업데이트
    set((state) => {
      const updatedPlayers = [...state.players];
      const ownerIndex = updatedPlayers.findIndex((p) => p.id === owner.id);

      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - modal.acquireCost,
        properties: [...currentPlayer.properties, tileIndex],
      };

      updatedPlayers[ownerIndex] = {
        ...owner,
        money: owner.money + modal.acquireCost,
        properties: owner.properties.filter((p) => p !== tileIndex),
      };

      return {
        players: updatedPlayers,
        modal: { type: "NONE" as const }
      };
    });

    // 서버에 동기화 메시지 전송
    if (gameId) {
      send(`/app/game/${gameId}/trade-land`, {
        type: "TRADE_LAND",
        payload: {
          buyerName: currentPlayer.name,
          landNum: tileIndex,
          // 인수 거래임을 명시하고 인수 가격 전송
          isAcquisition: true,
          acquisitionPrice: modal.acquireCost,
          sellerName: owner.name,
        },
      });
    } else {
      console.error("Cannot sync property acquisition, gameId is not set");
    }
  },

  payToll: () => {
    const { gameId, send, players, currentPlayerIndex, modal, board } = get();
    if (!modal.toll) {
      set({ modal: { type: "NONE" as const } });
      return;
    }

    const currentPlayer = players[currentPlayerIndex];
    const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
    const toll = modal.toll;

    // 자금 부족 시 부동산 매각 로직 (기존 로직 유지)
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
      if (result) {
        set(result);
        return;
      }
    }

    // 낙관적 업데이트
    set((state) => {
      const currentPlayers = [...state.players];
      const player = currentPlayers[state.currentPlayerIndex];
      const currentOwner = currentPlayers.find((p) =>
        p.properties.includes(tileIndex)
      )!;
      const ownerIdx = currentPlayers.findIndex(
        (p) => p.id === currentOwner.id
      );

      currentPlayers[state.currentPlayerIndex] = {
        ...player,
        money: player.money - toll,
      };
      currentPlayers[ownerIdx] = {
        ...currentOwner,
        money: currentOwner.money + toll,
      };

      const updatedPlayer = currentPlayers[state.currentPlayerIndex];
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

    // 서버에 동기화 메시지 전송 (통행료는 별도 API가 필요할 수 있지만 일단 TRADE_LAND 사용)
    if (gameId) {
      const landOwner = players.find((p) => p.properties.includes(tileIndex));
      send(`/app/game/${gameId}/trade-land`, {
        type: "TRADE_LAND",
        payload: {
          buyerName: currentPlayer.name,
          landNum: tileIndex,
          // 통행료 지불임을 표시하는 플래그 추가 (백엔드에서 처리 필요)
          isTollPayment: true,
          tollAmount: toll,
          landOwnerName: landOwner?.name
        },
      });
    } else {
      console.error("Cannot sync toll payment, gameId is not set");
    }
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
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              get().endTurn();
            },
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
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              get().endTurn();
            },
          },
        };
      }
    });
  },

  payBail: () => {
    const { gameId, send, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    // 클라이언트 사이드 자금 체크
    if (currentPlayer.money < BAIL_AMOUNT) {
      set({ modal: { type: "INFO" as const, text: "보석금이 부족합니다." } });
      return;
    }

    // 낙관적 업데이트 (서버 응답 전에 UI 즉시 반영)
    set((state) => {
      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - BAIL_AMOUNT,
        isInJail: false,
        jailTurns: 0,
      };

      console.log("💰 [BAIL] 보석금 지불 낙관적 업데이트:", {
        playerName: currentPlayer.name,
        bailAmount: BAIL_AMOUNT,
        remainingMoney: currentPlayer.money - BAIL_AMOUNT,
        isInJail: false
      });

      return {
        players: updatedPlayers,
        modal: { type: "NONE" as const },
        gamePhase: "WAITING_FOR_ROLL" as const,
      };
    });

    // 서버에 감옥 탈출 메시지 전송
    if (gameId) {
      send(`/app/game/${gameId}/jail-event`, {
        type: "JAIL_EVENT",
        payload: {
          nickname: currentPlayer.name,
          escape: true,
        },
      });
    } else {
      console.error("Cannot sync bail payment, gameId is not set");
    }

    // 보석금 지불 후 턴 종료
    setTimeout(() => {
      console.log("🔄 [BAIL] 보석금 지불 후 턴 종료");
      get().endTurn();
    }, 100);
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

  cancelWorldTravel: () => {
    set({
      gamePhase: "WAITING_FOR_ROLL",
      modal: { type: "NONE" as const }
    });
  },

  selectTravelDestination: (tileIndex: number) => {
    const { send, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    console.log("✈️ [WORLD_TRAVEL] 세계여행 목적지 선택:", {
      playerName: currentPlayer.name,
      currentPosition: currentPlayer.position,
      destinationPosition: tileIndex,
      willSendToServer: !!send
    });

    // 백엔드에 세계여행 목적지 전송
    if (send) {
      send('/app/game/world-travel', {
        type: "WORLD_TRAVEL_EVENT",
        payload: {
          nickname: currentPlayer.name,
          destination: tileIndex
        }
      });
    }

    // 서버 응답을 기다리는 동안 로딩 상태로 설정
    set({
      gamePhase: "TILE_ACTION" as const,
      modal: {
        type: "INFO" as const,
        text: "세계여행 중입니다... 잠시만 기다려주세요.",
      },
    });

    console.log("✈️ [WORLD_TRAVEL] 서버 응답 대기 중...");

    // 타임아웃 처리: 10초 후에도 서버 응답이 없으면 오류 처리
    setTimeout(() => {
      const currentState = get();
      if (currentState.modal?.text === "세계여행 중입니다... 잠시만 기다려주세요.") {
        console.error("⚠️ [WORLD_TRAVEL] 서버 응답 타임아웃");
        set({
          gamePhase: "WAITING_FOR_ROLL" as const,
          modal: {
            type: "INFO" as const,
            text: "세계여행 중 오류가 발생했습니다. 다시 시도해주세요.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              get().endTurn();
            }
          }
        });
      }
    }, 10000);
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