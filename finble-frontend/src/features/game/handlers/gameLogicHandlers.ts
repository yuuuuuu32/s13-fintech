import type { GameState, GamePhase } from "../types/gameTypes.ts";
import { handleCityCompanyTile, handleSpecialTile } from "./tileHandlers.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";
import type { TileData } from "../data/boardData.ts";

// Calculate total assets (money + property values + building values)
const calculateTotalAssets = (player: { properties: number[]; money: number }, board: TileData[]) => {
  const propertyValue = player.properties.reduce((sum: number, index: number) => {
    const tile = board[index];
    if (!tile) return sum;

    // 서버 데이터 구조에 맞게 landPrice 사용
    let value = (tile as TileData & { landPrice?: number })?.landPrice || tile.price || 0;

    // 건물 가치 추가
    if (tile.buildings && tile.buildings.level > 0) {
      const housePrice = (tile as TileData & { housePrice?: number })?.housePrice || 0;
      const buildingPrice = (tile as TileData & { buildingPrice?: number })?.buildingPrice || 0;
      const hotelPrice = (tile as TileData & { hotelPrice?: number })?.hotelPrice || 0;

      switch (tile.buildings.level) {
        case 1: // 주택
          value += housePrice;
          break;
        case 2: // 빌딩
          value += housePrice + buildingPrice;
          break;
        case 3: // 호텔
          value += housePrice + buildingPrice + hotelPrice;
          break;
      }
    }

    return sum + value;
  }, 0);
  return player.money + propertyValue;
};

export const createGameLogicHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  setDicePower: (power: number) => set({ dicePower: power }),

  finishDiceRoll: () => {
    set((state) => {
        const { serverCurrentPosition, players, currentPlayerIndex, board } = state;
        if (serverCurrentPosition === null) return {};

        // const currentPlayer = players[currentPlayerIndex];
        const finalPosition = Math.max(0, Math.min(serverCurrentPosition, board.length - 1));


        const updatedPlayers = players.map((p, index) => {
            if (index === currentPlayerIndex) {
                return {
                    ...p,
                    position: finalPosition,
                };
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
    console.log('🎲 rollDice 실행! 현재 gameId:', get().gameId);
    const { gamePhase, players, currentPlayerIndex, gameId, send, board } = get();
    const currentPlayer = players[currentPlayerIndex];

    if (gamePhase !== "WAITING_FOR_ROLL") return;

    // 포괄적인 게임 상태 유효성 검사
    if (!gameId || !currentPlayer || players.length === 0 || !board || board.length === 0) {
      console.error("❌ [ROLL_DICE] 게임 상태가 유효하지 않습니다:", {
        gameId: gameId || "NULL",
        currentPlayer: currentPlayer?.name || "NULL",
        playersCount: players.length,
        boardLength: board?.length || 0,
        currentPlayerIndex,
        gamePhase,
        timestamp: new Date().toISOString()
      });
      set({
        modal: {
          type: "INFO",
          text: "게임 상태가 손상되었습니다. 페이지를 새로고침하거나 게임을 다시 시작해주세요.",
          onConfirm: () => set({ modal: { type: "NONE" } })
        }
      });
      return;
    }

    // 플레이어 데이터 무결성 검사
    if (!currentPlayer.name || typeof currentPlayer.position !== 'number' || currentPlayer.position < 0) {
      console.error("❌ [ROLL_DICE] 현재 플레이어 데이터가 유효하지 않습니다:", {
        playerName: currentPlayer.name,
        playerPosition: currentPlayer.position,
        playerId: currentPlayer.id,
        gameId
      });
      set({
        modal: {
          type: "INFO",
          text: "플레이어 데이터가 손상되었습니다. 게임을 다시 시작해주세요.",
          onConfirm: () => set({ modal: { type: "NONE" } })
        }
      });
      return;
    }

    if (currentPlayer.isInJail && currentPlayer.jailTurns > 0) {
      console.log("🔒 [JAIL_CHECK] 감옥에 있는 플레이어 확인:", {
        playerName: currentPlayer.name,
        isInJail: currentPlayer.isInJail,
        jailTurns: currentPlayer.jailTurns
      });
      set({ modal: { type: "JAIL" } });
      return;
    }

    if (currentPlayer.isTraveling) {
      set({
        modal: {
          type: "INFO",
          text: "세계여행! 이동할 칸을 보드에서 직접 클릭하세요.",
          onConfirm: () => set({ gamePhase: "WORLD_TRAVEL_MOVE", modal: { type: "NONE" as const } }),
        },
      });
      return;
    }

    set({ gamePhase: "DICE_ROLLING" });

    // WebSocket 연결 상태 확인
    if (!send || typeof send !== 'function') {
      console.error("❌ [ROLL_DICE] WebSocket send 함수가 유효하지 않습니다");
      set({
        gamePhase: "WAITING_FOR_ROLL",
        modal: {
          type: "INFO",
          text: "서버 연결이 끊어졌습니다. 페이지를 새로고침해주세요.",
          onConfirm: () => set({ modal: { type: "NONE" } })
        }
      });
      return;
    }

    if (gameId && currentPlayer) {
      console.log("📤 [WEBSOCKET] Sending USE_DICE with validation:", {
        destination: `/app/game/${gameId}/roll-dice`,
        type: "USE_DICE",
        payload: {
          userName: currentPlayer.name,
          gameId: gameId,
          playerIndex: currentPlayerIndex
        },
        currentPlayer: {
          name: currentPlayer.name,
          id: currentPlayer.id,
          position: currentPlayer.position,
          isInJail: currentPlayer.isInJail
        },
        gameStateValidation: {
          playersCount: players.length,
          boardLength: board.length,
          gamePhase: get().gamePhase
        }
      });

      try {
        send(`/app/game/${gameId}/roll-dice`, {
          type: "USE_DICE",
          payload: {
            userName: currentPlayer.name,
          },
        });

        // 3초 후에도 응답이 없으면 타임아웃 처리 (5초에서 3초로 단축)
        setTimeout(() => {
          const currentState = get();
          if (currentState.gamePhase === "DICE_ROLLING") {
            console.warn("⏰ [USE_DICE] 서버 응답 타임아웃 - 3초 경과, 게임 상태 문제 가능성");
            set({
              gamePhase: "WAITING_FOR_ROLL",
              modal: {
                type: "INFO",
                text: "서버 응답이 없습니다. 서버의 게임 상태가 손상되었을 수 있습니다. 페이지를 새로고침해주세요.",
                onConfirm: () => {
                  set({ modal: { type: "NONE" } });
                  // 심각한 경우 페이지 새로고침 권장
                  const userChoice = confirm("게임 상태가 비정상적입니다. 페이지를 새로고침하시겠습니까?");
                  if (userChoice) {
                    window.location.reload();
                  }
                }
              }
            });
          }
        }, 3000);

      } catch (error) {
        console.error("❌ [WEBSOCKET] Failed to send USE_DICE:", {
          error: error.message || error,
          gameId,
          playerName: currentPlayer.name,
          gamePhase: get().gamePhase,
          timestamp: new Date().toISOString()
        });
        set({
          gamePhase: "WAITING_FOR_ROLL",
          modal: {
            type: "INFO",
            text: "주사위 굴리기 요청 중 오류가 발생했습니다. 네트워크 연결을 확인한 후 다시 시도해주세요.",
            onConfirm: () => set({ modal: { type: "NONE" } })
          }
        });
      }
    } else {
      console.error("❌ [ROLL_DICE] 치명적 오류 - 게임ID 또는 플레이어 정보 없음:", {
        gameId: gameId || "NOT_SET",
        currentPlayer: currentPlayer || "NOT_SET",
        playerName: currentPlayer?.name || "UNKNOWN",
        hasGameId: !!gameId,
        hasCurrentPlayer: !!currentPlayer,
        timestamp: new Date().toISOString()
      });
      set({
        gamePhase: "WAITING_FOR_ROLL",
        modal: {
          type: "INFO",
          text: "치명적인 게임 상태 오류입니다. 페이지를 새로고침하거나 게임을 다시 시작해주세요.",
          onConfirm: () => set({ modal: { type: "NONE" } })
        }
      });
    }
  },

  movePlayer: (diceValues: [number, number]) => {
    const { players, currentPlayerIndex, board, serverCurrentPosition } = get();
    const currentPlayer = players[currentPlayerIndex];
    const diceSum = diceValues[0] + diceValues[1];

    // 서버에서 받은 정확한 위치 사용 (찬스카드 이동 등이 반영됨)
    const finalPosition = serverCurrentPosition !== null ? serverCurrentPosition : (currentPlayer.position + diceSum) % board.length;

    let lapCount = currentPlayer.lapCount;
    // 시작점 통과 시 lapCount 증가
    if (finalPosition < currentPlayer.position) {
      lapCount += 1;
    }

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      position: finalPosition,
      lapCount,
    };

    console.log("🏃 [MOVE_PLAYER] 서버 기반 이동 처리:", {
      currentPosition: currentPlayer.position,
      serverPosition: serverCurrentPosition,
      finalPosition: finalPosition,
      diceSum,
      lapCountUpdated: lapCount,
      note: "서버에서 받은 위치 사용"
    });

    set({
      players: updatedPlayers,
      dice: diceValues,
      gamePhase: "PLAYER_MOVING",
    });

    // 애니메이션 시뮬레이션을 위한 지연 후 타일 액션 처리
    console.log("🎬 [MOVE_PLAYER] 이동 애니메이션 시뮬레이션 시작");
    setTimeout(() => {
      console.log("🎯 [MOVE_PLAYER] 애니메이션 완료 - 타일 액션 처리 시작");
      get().handleTileAction();
    }, 1000); // 1초 애니메이션 시뮬레이션
  },

  handleTileAction: () => {
    set({ gamePhase: "TILE_ACTION" });
    const { players, currentPlayerIndex, board } = get();
    const currentPlayer = players[currentPlayerIndex];
    const currentUserId = useUserStore.getState().userInfo?.userId;
    const isMyTurn = currentPlayer.id === currentUserId;

    const currentTile = board[currentPlayer.position];

    console.log("🎯 [TILE_ACTION] 타일 액션 처리 시작:", {
      playerName: currentPlayer.name,
      position: currentPlayer.position,
      tileName: currentTile?.name,
      tileType: currentTile?.type,
      isMyTurn,
      gamePhase: "TILE_ACTION",
      calledFrom: "찬스카드 이동 후 또는 일반 이동 후"
    });

    if (currentPlayer.money < 0) {
      console.log("💸 [BANKRUPTCY] Player went bankrupt:", currentPlayer.name);
      get().checkGameOver();
      return;
    }

    switch (currentTile?.type) {
      case "NORMAL":
        handleCityCompanyTile(set, get, currentTile, currentPlayer, players);
        break;

      case "CHANCE":
        // 찬스카드는 서버에서 처리되며, DRAW_CARD 메시지를 기다림
        console.log("🎲 [CHANCE] 찬스 타일 도착, 서버 응답 대기 중");
        set({ gamePhase: "TILE_ACTION" });
        break;

      case "SPECIAL":
      case "JAIL":
      case "START":
      case "AIRPLANE":
      case "NTS":
        handleSpecialTile(set, get, currentTile, currentPlayer, board, get().send);
        break;

      default:
        get().endTurn();
        break;
    }
  },

  endTurn: () => {
    const state = get();
    const { gameId, send, players } = state;
    // const currentPlayer = players[currentPlayerIndex];


    // Log all player positions before turn end with detailed info
    console.log("📍 [BACKEND_SYNC] All player positions BEFORE endTurn (will send to server):");
    players.forEach((p, index) => {
      console.log(`  Player ${index}: ${p.name} (ID: ${p.id}) - Position: ${p.position}`);
    });

    if (gameId) {
      send(`/app/game/${gameId}/end-turn`, {
        type: "TURN_SKIP",
        payload: {},
      });
    }

    set({
      modal: { type: "NONE" as const },
      gamePhase: "WAITING_FOR_TURN_END",
    });


    // Check for game over conditions after turn ends
    setTimeout(() => {
      get().checkGameOver();
    }, 500);

    // Log positions again after state change with server response tracking
    setTimeout(() => {
      const postState = get();
      console.log("📍 [BACKEND_SYNC] All player positions AFTER endTurn (waiting for server response):");
      postState.players.forEach((p, index) => {
        console.log(`  Player ${index}: ${p.name} (ID: ${p.id}) - Position: ${p.position}`);
      });
    }, 100);

    // Additional delayed check to see if server has updated positions
    setTimeout(() => {
      const finalState = get();
      console.log("📍 [BACKEND_SYNC] Final position check (after server response should have arrived):");
      finalState.players.forEach((p, index) => {
        console.log(`  Player ${index}: ${p.name} (ID: ${p.id}) - FINAL Position: ${p.position}`);
      });
    }, 2000);
  },

  checkGameOver: () => {
    const { players, currentTurn, totalTurns, board } = get();
    const alivePlayers = players.filter((p) => p.money >= 0);

    let winner = null;
    if (alivePlayers.length <= 1) {
      winner = alivePlayers[0] ?? null;
      console.log("🏁 [GAME_OVER] Winner by elimination:", winner?.name);
    } else if (currentTurn >= totalTurns) {
      // 20턴이 넘으면 총 자산 기준으로 승자 결정
      winner = alivePlayers.reduce((prev, current) => {
        const prevAssets = calculateTotalAssets(prev, board);
        const currentAssets = calculateTotalAssets(current, board);
        return prevAssets > currentAssets ? prev : current;
      });
      console.log("🏁 [GAME_OVER] Winner by assets after turn limit:", {
        winner: winner?.name,
        assets: calculateTotalAssets(winner, board),
        allAssets: alivePlayers.map(p => ({
          name: p.name,
          assets: calculateTotalAssets(p, board)
        }))
      });
    }

    if (winner || alivePlayers.length === 0 || currentTurn >= totalTurns) {
      set({
        gamePhase: "GAME_OVER",
        winnerId: winner?.id ?? null,
        modal: { type: "NONE" as const },
      });
    }
  },
});