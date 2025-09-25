import type { GameState } from "../types/gameTypes.ts";
import { BuildingType } from "../data/boardData.ts";
import { BAIL_AMOUNT } from "../constants/gameConstants.ts";
import { handleInsufficientFundsForToll } from "./tileHandlers.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";

export const createPlayerActions = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  buyProperty: () => {
    const { gameId, send, players, currentPlayerIndex, modal, board } = get();
    const tileIndex = board.findIndex((t) => t.name === modal.tile?.name);
    if (tileIndex === -1) return;

    const currentPlayer = players[currentPlayerIndex];
    const tile = modal.tile;

    // 경제 효과가 적용된 가격 계산 (BuyPropertyModalContent와 동일한 로직)
    const baseLandPrice = tile?.landPrice || tile?.price || 0;
    const adjustedLandPrice = get().applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');


    // 클라이언트 사이드 자금 체크 (경제 효과 적용된 가격 사용)
    if (currentPlayer.money < adjustedLandPrice) {
      set({ modal: { type: "INFO" as const, text: "자산이 부족하여 구매할 수 없습니다." } });
      return;
    }

    // 서버에 건설 메시지 전송
    if (gameId) {
      send(`/app/game/${gameId}/construct-building`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          nickname: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: "FIELD", // 백엔드 enum에 맞게 FIELD 사용
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

    if (currentPlayer.money < purchaseData.totalCost) {
      set({ modal: { type: "INFO" as const, text: "자산이 부족하여 구매할 수 없습니다." } });
      return;
    }

    const tileIndex = board.findIndex((t) => t.name === purchaseData.tile?.name);
    if (tileIndex === -1) {
      console.error("Could not find tile to buy:", purchaseData.tile?.name);
      return;
    }

    let targetBuildingType = "FIELD";
    if (purchaseData.selectedItems.hotel) {
      targetBuildingType = "HOTEL";
    } else if (purchaseData.selectedItems.building) {
      targetBuildingType = "BUILDING";
    } else if (purchaseData.selectedItems.house) {
      targetBuildingType = "VILLA";
    } else if (purchaseData.selectedItems.land) {
      targetBuildingType = "FIELD";
    }

    if (gameId) {
      send(`/app/game/${gameId}/construct-building`, {
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

    // 건물 구매 후 턴 종료는 서버 응답(CONSTRUCT_BUILDING)에서 처리
    console.log("🏗️ [buyPropertyWithItems] 건물 구매 요청 전송 - 서버 응답 대기 중");
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

    // 모달 닫기 (서버 응답을 기다림)
    set({ modal: { type: "NONE" as const } });

    console.log("🏢 [ACQUIRE_PROPERTY] 인수 요청 전송:", {
      buyer: currentPlayer.name,
      seller: owner.name,
      tileIndex,
      modalAcquireCost: modal.acquireCost
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
    const { players, currentPlayerIndex, modal, board } = get();
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

      // 통행료 지불은 토스트로 표시 (모달 충돌 방지)
      get().addToast(
        updatedPlayer.money < 0 ? "error" : "warning",
        "💰 통행료 지불",
        text,
        3000
      );

      return {
        players: currentPlayers,
        modal: { type: "NONE" as const },
      };
    });

    // 통행료 지불은 클라이언트 사이드에서만 처리하고 서버에 전송하지 않음
    // (백엔드에서 TRADE_LAND로 처리되어 땅이 거래되는 문제 방지)
  },

  handleJail: () => {
    const currentUserId = useUserStore.getState().userInfo?.userId;

    console.log("🔒 [HANDLE_JAIL] 감옥 턴 처리 시작:", {
      currentPlayer: get().players[get().currentPlayerIndex],
      note: "머물기 선택 또는 3턴 후 자동 탈출 처리"
    });

    set((state) => {
      const updatedPlayers = [...state.players];
      const currentPlayer = updatedPlayers[state.currentPlayerIndex];
      const newJailTurns = currentPlayer.jailTurns - 1;
      const isMyTurn = currentPlayer.id === currentUserId;

      if (newJailTurns <= 0) {
        // 3턴 완료 - 자동 탈출
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          isInJail: false,
          jailTurns: 0,
        };

        console.log("🔓 [HANDLE_JAIL] 3턴 완료로 자동 탈출:", {
          playerName: currentPlayer.name,
          isMyTurn,
          note: "감옥 기간 완료로 자동 탈출"
        });

        if (isMyTurn) {
          return {
            players: updatedPlayers,
            gamePhase: "WAITING_FOR_ROLL" as const,
            modal: {
              type: "JAIL_ESCAPE" as const,
              text: "감옥 기간이 끝나 자동으로 탈출했습니다!",
              onConfirm: () => {
                console.log("🔓 [JAIL_ESCAPE] 탈출 모달 확인 - 주사위 굴리기 가능");
                set({ modal: { type: "NONE" as const } });
              },
            },
          };
        } else {
          // 다른 플레이어의 턴: 토스트로 표시하고 자동 처리
          console.log(`🔓 [JAIL_ESCAPE] ${currentPlayer.name}님이 감옥에서 자동 탈출 (토스트 표시)`);
          get().addToast(
            "success",
            "🔓 감옥 탈출",
            `${currentPlayer.name}님이 감옥에서 자동 탈출했습니다!`,
            3000
          );
          setTimeout(() => get().endTurn(), 100);
          return {
            players: updatedPlayers,
            modal: { type: "NONE" as const }
          };
        }
      } else {
        // 감옥에서 계속 머무름 (턴만 소모)
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          jailTurns: newJailTurns,
        };

        console.log("🔒 [HANDLE_JAIL] 감옥에서 턴 소모:", {
          playerName: currentPlayer.name,
          previousJailTurns: currentPlayer.jailTurns,
          newJailTurns: newJailTurns,
          isMyTurn,
          note: "머물기 선택으로 턴만 소모"
        });

        if (isMyTurn) {
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
        } else {
          // 다른 플레이어의 턴: 토스트로 표시하고 자동 처리
          console.log(`🔒 [JAIL_STAY] ${currentPlayer.name}님이 감옥에서 ${newJailTurns}턴 더 머무름 (토스트 표시)`);
          get().addToast(
            "info",
            "🔒 감옥 대기",
            `${currentPlayer.name}님이 감옥에서 ${newJailTurns}턴 더 머물게 됩니다.`,
            3000
          );
          setTimeout(() => get().endTurn(), 100);
          return {
            players: updatedPlayers,
            modal: { type: "NONE" as const }
          };
        }
      }
    });
  },

  payBail: () => {
    const { gameId, send, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    console.log("🔓 [PAY_BAIL] 보석금 지불 시도 - 상세 상태:", {
      playerName: currentPlayer.name,
      playerId: currentPlayer.id,
      playerMoney: currentPlayer.money,
      bailAmount: BAIL_AMOUNT,
      isInJail: currentPlayer.isInJail,
      jailTurns: currentPlayer.jailTurns,
      gameId,
      gamePhase: get().gamePhase,
      currentPlayerIndex,
      allPlayersJailStatus: players.map(p => ({
        name: p.name,
        isInJail: p.isInJail,
        jailTurns: p.jailTurns
      })),
      timestamp: new Date().toISOString()
    });

    // 감옥 상태 검증
    if (!currentPlayer.isInJail) {
      console.error("❌ [PAY_BAIL] 플레이어가 감옥에 있지 않습니다:", {
        playerName: currentPlayer.name,
        isInJail: currentPlayer.isInJail,
        jailTurns: currentPlayer.jailTurns
      });
      set({
        modal: {
          type: "INFO" as const,
          text: "현재 감옥에 있지 않아 보석금을 낼 수 없습니다."
        }
      });
      return;
    }

    if (currentPlayer.jailTurns <= 0) {
      console.error("❌ [PAY_BAIL] 감옥 턴이 0 이하입니다:", {
        playerName: currentPlayer.name,
        jailTurns: currentPlayer.jailTurns
      });
      set({
        modal: {
          type: "INFO" as const,
          text: "감옥 상태가 올바르지 않습니다."
        }
      });
      return;
    }


    // 클라이언트 사이드 자금 체크
    if (currentPlayer.money < BAIL_AMOUNT) {
      console.warn("💰 [PAY_BAIL] 보석금 부족:", {
        playerMoney: currentPlayer.money,
        requiredAmount: BAIL_AMOUNT,
        shortage: BAIL_AMOUNT - currentPlayer.money
      });
      set({ modal: { type: "INFO" as const, text: "보석금이 부족합니다." } });
      return;
    }

    // 서버에 감옥 탈출 메시지 전송
    if (gameId) {
      const payload = {
        nickname: currentPlayer.name,
        escape: true,
      };

      console.log("📤 [PAY_BAIL] 서버에 보석금 지불 요청 전송:", {
        destination: `/app/game/${gameId}/jail-event`,
        type: "JAIL_EVENT",
        payload,
        playerState: {
          name: currentPlayer.name,
          money: currentPlayer.money,
          isInJail: currentPlayer.isInJail,
          jailTurns: currentPlayer.jailTurns
        },
        gameState: {
          gamePhase: get().gamePhase,
          currentPlayerIndex,
          gameId
        },
        expectation: "서버가 플레이어 감옥 상태를 인식하고 보석금 지불을 처리해야 함",
        timestamp: new Date().toISOString()
      });

      try {
        send(`/app/game/${gameId}/jail-event`, {
          type: "JAIL_EVENT",
          payload,
        });

        // 서버 응답 대기 모달 표시
        set({
          modal: {
            type: "INFO" as const,
            text: "보석금을 지불하는 중입니다...",
          }
        });

        // 타임아웃 처리: 10초 후에도 응답이 없으면 에러 처리
        setTimeout(() => {
          const currentState = get();
          if (currentState.modal?.text === "보석금을 지불하는 중입니다...") {
            console.error("⏰ [PAY_BAIL] 서버 응답 타임아웃");
            set({
              modal: {
                type: "INFO" as const,
                text: "서버 응답이 없습니다. 다시 시도해주세요.",
                onConfirm: () => set({ modal: { type: "NONE" as const } })
              }
            });
          }
        }, 10000);

      } catch (error) {
        console.error("❌ [PAY_BAIL] 서버 전송 중 오류:", {
          error: error.message || error,
          gameId,
          playerName: currentPlayer.name
        });
        set({
          modal: {
            type: "INFO" as const,
            text: "보석금 지불 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
      }
    } else {
      console.error("❌ [PAY_BAIL] 게임 ID가 설정되지 않음");
      set({
        modal: {
          type: "INFO" as const,
          text: "게임 연결 상태에 문제가 있습니다. 페이지를 새로고침해주세요.",
          onConfirm: () => set({ modal: { type: "NONE" as const } })
        }
      });
    }
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
    const state = get();
    const { send, players, currentPlayerIndex, gamePhase } = state;
    const currentPlayer = players[currentPlayerIndex];

    // 이미 요청 진행 중이면 중복 요청 방지
    if (gamePhase !== "WORLD_TRAVEL_MOVE") {
      console.log("⚠️ [WORLD_TRAVEL] 세계여행 모드가 아니므로 요청 무시:", {
        currentPhase: gamePhase,
        expectedPhase: "WORLD_TRAVEL_MOVE"
      });
      return;
    }

    // 백엔드에 세계여행 목적지 전송
    if (send) {
      const gameId = state.gameId;
      if (gameId) {
        console.log("✈️ [WORLD_TRAVEL] 목적지 선택 요청:", {
          nickname: currentPlayer.name,
          destination: tileIndex,
          gamePhase: gamePhase
        });

        // 즉시 상태 변경으로 중복 요청 방지
        set({ gamePhase: "TILE_ACTION" });

        send(`/app/game/${gameId}/world-travel`, {
          type: "WORLD_TRAVEL_EVENT",
          payload: {
            nickname: currentPlayer.name,
            destination: tileIndex
          }
        });
      }
    }

    // 서버 응답을 기다리는 동안 로딩 상태로 설정
    set({
      gamePhase: "TILE_ACTION" as const,
      modal: {
        type: "INFO" as const,
        text: "세계여행 중입니다... 잠시만 기다려주세요.",
      },
    });


    // 타임아웃 처리: 10초 후에도 서버 응답이 없으면 오류 처리
    setTimeout(() => {
      const currentState = get();
      if (currentState.modal?.text === "세계여행 중입니다... 잠시만 기다려주세요.") {
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
    const { gameId, send, players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];
    const tile = board[tileIndex];
    const newLevel = (tile.buildings?.level || 0) + 1;
    let targetBuildingType = "FIELD";
    if (newLevel === 1) {
      targetBuildingType = "VILLA";
    } else if (newLevel === 2) {
      targetBuildingType = "BUILDING";
    } else if (newLevel === 3) {
      targetBuildingType = "HOTEL";
    }

    if (gameId) {
      send(`/app/game/${gameId}/construct-building`, {
        type: "CONSTRUCT_BUILDING",
        payload: {
          userName: currentPlayer.name,
          landNum: tileIndex,
          targetBuildingType: targetBuildingType,
        },
      });
    }
  },
});