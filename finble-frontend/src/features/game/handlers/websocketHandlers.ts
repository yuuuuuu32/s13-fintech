import { useUserStore } from "../../../stores/useUserStore.ts";
import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";



// 구독 해제 함수들을 저장할 배열
let unsubscribeFunctions: (() => void)[] = [];

export const createWebSocketHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  connect: (gameId: string) => {
    // 현재 게임 상태 로깅
    const currentState = get();
    console.log("🔌 [WEBSOCKET] Connect called:", {
      gameId,
      currentGameId: currentState.gameId,
      currentPhase: currentState.gamePhase,
      playersCount: currentState.players.length,
      existingSubscriptions: unsubscribeFunctions.length,
      timestamp: new Date().toISOString()
    });

    // 같은 게임ID로 이미 연결되어 있고 구독이 있으면 재연결하지 않음
    if (currentState.gameId === gameId && unsubscribeFunctions.length > 0) {
      console.log("🔌 [WEBSOCKET] Already connected to same game, skipping reconnection");
      return;
    }

    // 기존 구독들을 먼저 정리
    console.log("🧹 [WEBSOCKET] Cleaning up existing subscriptions:", unsubscribeFunctions.length);
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctions = [];

    set({ gameId });
    console.log("🔌 [WEBSOCKET] Connected to game:", gameId);

    // 모든 구독을 등록하고 해제 함수들을 저장
    unsubscribeFunctions.push(subscribeToTopic("GAME_STATE_CHANGE", (message) => {
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE received:", message);
      const { payload } = message;
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE payload detail:", JSON.stringify(payload, null, 2));

      // If the payload has curPlayer, it's likely a turn change from the timer
      if (payload.curPlayer) {
        console.log("🔄 [TURN_DEBUG] 턴 변경 디버깅:", {
          currentPlayer: payload.curPlayer,
          gameTurn: payload.gameTurn,
          currentPlayersInFrontend: get().players.map(p => p.name),
          frontendPlayerCount: get().players.length,
          currentPlayerIndex: get().currentPlayerIndex
        });

        set((state) => {
          const nextPlayerIndex = state.players.findIndex(p => p.name === payload.curPlayer);

          // 중복 턴 변경 무시 (같은 턴 번호 + 같은 플레이어)
          if (state.currentTurn === payload.gameTurn && state.currentPlayerIndex === nextPlayerIndex) {
            console.log("🔄 [TURN_DEBUG] 중복 턴 변경 무시:", {
              currentTurn: state.currentTurn,
              payloadTurn: payload.gameTurn,
              currentPlayerIndex: state.currentPlayerIndex,
              nextPlayerIndex: nextPlayerIndex,
              currentPlayerName: state.players[state.currentPlayerIndex]?.name,
              payloadPlayerName: payload.curPlayer
            });
            return {};
          }

          if (nextPlayerIndex !== -1) {
            console.log("🔄 [TURN_DEBUG] 플레이어 인덱스 변경:", {
              previousIndex: state.currentPlayerIndex,
              nextIndex: nextPlayerIndex,
              previousPlayer: state.players[state.currentPlayerIndex]?.name,
              nextPlayer: state.players[nextPlayerIndex]?.name,
              isLastPlayer: nextPlayerIndex === state.players.length - 1,
              actualChange: true
            });

            const newCurrentPlayer = state.players[nextPlayerIndex];

            // Check if the new player is supposed to be traveling
            if (newCurrentPlayer?.isTraveling) {
                console.log("✈️ [TURN_START] 세계여행 중인 플레이어의 턴 - 모드 설정");

                // 세계여행 중인 플레이어가 본인인지 확인
                const userStore = useUserStore.getState();
                const currentUser = userStore.userInfo;
                const isMyTurn = currentUser && newCurrentPlayer.id === currentUser.userId;

                console.log("✈️ [TURN_START] 세계여행 플레이어 확인:", {
                  travelingPlayerName: newCurrentPlayer.name,
                  travelingPlayerId: newCurrentPlayer.id,
                  currentUserId: currentUser?.userId,
                  isMyTurn: isMyTurn
                });

                return {
                    ...state, // 기존 상태 보존 (players 포함)
                    currentPlayerIndex: nextPlayerIndex,
                    currentTurn: payload.gameTurn ?? state.currentTurn,
                    gamePhase: isMyTurn ? "WORLD_TRAVEL_MOVE" : "WAITING_FOR_ROLL", // 본인만 WORLD_TRAVEL_MOVE 모드
                    isDiceRolled: false,
                    modal: { type: "NONE" },
                };
            }

            const newState = {
              ...state, // 기존 상태 보존 (players 포함)
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
              isDiceRolled: false, // Ensure dice state is reset
              // 찬스카드 모달이 떠있으면 유지
              modal: state.modal.type === "CHANCE_CARD" ? state.modal : { type: "NONE" },
            };

            console.log("🔄 [GAME_STATE_CHANGE] 턴 정보만 업데이트, 위치는 건드리지 않음");

            return newState;
          } else {
            console.log("🔄 [TURN_DEBUG] 플레이어 인덱스 변경 스킵:", {
              reason: nextPlayerIndex === -1 ? "플레이어를 찾을 수 없음" : "이미 동일한 플레이어",
              currentIndex: state.currentPlayerIndex,
              nextIndex: nextPlayerIndex,
              currentPlayer: state.players[state.currentPlayerIndex]?.name,
              targetPlayer: payload.curPlayer
            });
          }
          return {};
        });
              } else {
                // GAME_STATE_CHANGE는 위치 업데이트하지 않음 - 게임 상태만
                console.log("🔍 [BACKEND_DATA] GAME_STATE_CHANGE without curPlayer - merging players state:", JSON.stringify(payload, null, 2));
                
                if (payload.players) {
                  const newPlayers = Array.isArray(payload.players) ? payload.players : Object.values(payload.players);
                  const currentPlayers = get().players;
      
                  const updatedPlayers = currentPlayers.map(clientPlayer => {
                    const serverPlayer = newPlayers.find(p => p.id === clientPlayer.id);
                                  if (serverPlayer) {
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const { position, ...serverData } = serverPlayer;

                                    // 감옥 상태 보호: 클라이언트에서 이미 탈출한 플레이어는 서버 감옥 상태를 무시
                                    const protectedJailState = {};
                                    if (!clientPlayer.isInJail && clientPlayer.jailTurns === 0 && serverPlayer.isInJail) {
                                      console.log("🛡️ [JAIL_PROTECTION] 클라이언트 탈출 상태 보호:", {
                                        playerName: clientPlayer.name,
                                        clientJailState: { isInJail: clientPlayer.isInJail, jailTurns: clientPlayer.jailTurns },
                                        serverJailState: { isInJail: serverPlayer.isInJail, jailTurns: serverPlayer.jailTurns },
                                        action: "서버 감옥 상태 무시"
                                      });
                                      protectedJailState.isInJail = false;
                                      protectedJailState.jailTurns = 0;
                                    }

                                    return {
                                      ...clientPlayer,
                                      ...serverData,
                                      ...protectedJailState,
                                      position: clientPlayer.position,
                                      isTraveling: clientPlayer.isTraveling
                                    };
                                  }
                                  return clientPlayer;
                                });
                                
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { players, ...safePayload } = payload;
                                set({ ...safePayload, players: updatedPlayers });      
                } else {
                  get().updateGameState(payload);
                }
              }    }));

    unsubscribeFunctions.push(subscribeToTopic("START_GAME_OBSERVE", (message) => {
      console.log("📥 [WEBSOCKET] START_GAME_OBSERVE received:", message);
      console.log("🔍 [BACKEND_DATA] START_GAME_OBSERVE payload:", JSON.stringify(message.payload, null, 2));

      // START_GAME_OBSERVE는 게임 시작 시에만 플레이어 위치 초기화
      // 게임 중에는 위치 업데이트 안함
      const currentGamePhase = get().gamePhase;
      if (currentGamePhase === "SELECTING_ORDER") {
        console.log("🔍 [BACKEND_DATA] START_GAME_OBSERVE - Game initialization, allowing full update");
        get().updateGameState(message.payload);
      } else {
        console.log("🔍 [BACKEND_DATA] START_GAME_OBSERVE - Game in progress, excluding players");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { players, ...safePayload } = message.payload;
        get().updateGameState(safePayload);
      }
    }));

    unsubscribeFunctions.push(subscribeToTopic("TURN_CHANGE", (message) => {
      console.log("📥 [WEBSOCKET] TURN_CHANGE received:", message);
      const { payload } = message;
      if (payload.currentPlayerIndex !== undefined) {
        console.log("🔄 Turn changing to player index:", payload.currentPlayerIndex);

        set((state) => {
          const newCurrentPlayer = state.players[payload.currentPlayerIndex];

          // 세계여행 중인 플레이어의 턴이면 바로 세계여행 모드로 설정
          if (newCurrentPlayer?.isTraveling) {
            console.log("✈️ [TURN_START] 세계여행 중인 플레이어의 턴 - 바로 WORLD_TRAVEL_MOVE 모드로 진입");
            return {
              currentPlayerIndex: payload.currentPlayerIndex,
              currentTurn: payload.currentTurn || state.currentTurn,
              gamePhase: "WORLD_TRAVEL_MOVE" as const,
              isDiceRolled: false,
              modal: { type: "NONE" as const },
            };
          } else {
            console.log("🎮 Setting gamePhase to WAITING_FOR_ROLL");
            return {
              currentPlayerIndex: payload.currentPlayerIndex,
              currentTurn: payload.currentTurn || state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL" as const,
              isDiceRolled: false, // Reset for the next turn
              // 찬스카드 모달이 떠있으면 유지
              modal: state.modal.type === "CHANCE_CARD" ? state.modal : { type: "NONE" as const },
            };
          }
        });
      }
    }));

    unsubscribeFunctions.push(subscribeToTopic("USE_DICE", (message) => {
      console.log("📥 [WEBSOCKET] USE_DICE received:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn, userName, updatedAsset, salaryBonus } = payload;

      // 🎲 현재 플레이어의 주사위만 게임 상태 변경
      const currentState = get();
      const currentPlayer = currentState.players[currentState.currentPlayerIndex];
      const isCurrentPlayerDice = currentPlayer && currentPlayer.name === userName;

      if (isCurrentPlayerDice && currentState.gamePhase !== "DICE_ROLLING") {
        console.log("🎲 [DICE_SYNC] 현재 플레이어의 USE_DICE 수신 - 주사위 애니메이션 시작");
        set({ gamePhase: "DICE_ROLLING" });
      } else if (!isCurrentPlayerDice) {
        console.log("👀 [DICE_SYNC] 다른 플레이어의 USE_DICE 수신 - 게임 상태 변경 안함:", {
          dicePlayerName: userName,
          currentPlayerName: currentPlayer?.name,
          currentGamePhase: currentState.gamePhase
        });
      }

      console.log("💰 [USE_DICE] 서버에서 받은 업데이트된 자산:", {
        userName,
        updatedAsset,
        economicHistoryApplied: "서버에서 이미 경제역사 효과 적용됨"
      });

      set((state) => {
        // 서버에서 업데이트된 자산 정보와 위치 정보를 플레이어에게 적용
        const updatedPlayers = state.players.map(player => {
          if (player.name === userName) {
            console.log("💰🏃 [USE_DICE] 플레이어 자산 및 위치 동시 업데이트:", {
              playerName: player.name,
              previousMoney: player.money,
              newMoney: updatedAsset?.money || player.money,
              moneyChange: (updatedAsset?.money || player.money) - player.money,
              previousPosition: player.position,
              newPosition: currentPosition,
              positionChange: currentPosition - player.position,
              properties: updatedAsset?.lands
            });

            return {
              ...player,
              position: currentPosition, // 서버에서 받은 정확한 위치로 동기화
              money: updatedAsset?.money || player.money, // 서버에서 경제역사 효과가 적용된 머니
              properties: updatedAsset?.lands || player.properties
            };
          }
          return player;
        });

        return {
          players: updatedPlayers, // 위치와 자산 모두 여기서 동기화됨
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          lastSalaryBonus: salaryBonus || 0, // 마지막으로 받은 월급 보너스 저장
          // USE_DICE 응답을 받았으므로 주사위 굴리기 완료
        };
      });

      console.log("🎲 [USE_DICE] 백엔드에서 주사위 처리 완료 - 주사위 애니메이션 대기 중");

      // 주사위 애니메이션이 끝난 후 (2초) 기물 이동 시작
      setTimeout(() => {
        console.log("🎬 [USE_DICE] 주사위 애니메이션 완료 - 기물 이동 시작");

        // 현재 턴의 플레이어만 이동 처리
        const currentState = get();
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];

        if (currentPlayer && currentPlayer.name === userName) {
          console.log("🏃 [USE_DICE] 현재 플레이어 이동 처리 (위치는 이미 동기화됨):", {
            playerName: userName,
            currentPlayerIndex: currentState.currentPlayerIndex,
            dice: [diceNum1, diceNum2],
            note: "현재 턴 플레이어만 애니메이션과 타일 액션 처리"
          });

          // 위치는 이미 업데이트되었으므로 애니메이션과 타일 액션만 처리
          set({ gamePhase: "PLAYER_MOVING" });

          // MOVE_PLAYER를 호출하여 이동 애니메이션 처리
          get().movePlayer([diceNum1, diceNum2]);
        } else {
          console.log("👀 [USE_DICE] 다른 플레이어의 주사위 - 위치만 동기화, 게임 상태는 변경 안함:", {
            dicePlayerName: userName,
            currentPlayerName: currentPlayer?.name,
            currentPlayerIndex: currentState.currentPlayerIndex,
            note: "다른 플레이어의 이동이므로 내 gamePhase나 애니메이션 처리 안함"
          });
        }
      }, 2000); // 주사위 애니메이션 시간과 동일
    }));

    unsubscribeFunctions.push(subscribeToTopic("TRADE_LAND", (message) => {
      console.log("📥 [WEBSOCKET] TRADE_LAND received:", message);
      const { payload } = message;
      if (payload.players) {
        const serverPlayersMap = payload.players;
        console.log("📍 [POSITION] TRADE_LAND server positions:");
        Object.entries(serverPlayersMap).forEach(([id, player]) => {
          console.log(`  Server Player: ${player.nickname} (ID: ${id}) - Server Position: ${player.position}`);
        });

        set((state) => {
          console.log("📍 [POSITION] TRADE_LAND current client positions:");
          state.players.forEach((p, index) => {
            console.log(`  Client Player ${index}: ${p.name} (ID: ${p.id}) - Client Position: ${p.position}`);
          });

          const updatedPlayers = state.players.map(clientPlayer => {
            const serverPlayerState = serverPlayersMap[clientPlayer.id];
            if (serverPlayerState) {
              console.log(`🔍 [BACKEND_DATA] TRADE_LAND updating player (EXCLUDING position): ${clientPlayer.name} (ID: ${clientPlayer.id})`);
              console.log(`  Client Position: ${clientPlayer.position} -> Server Position: ${serverPlayerState.position} (BLOCKED)`);
              console.log(`  Money: ${clientPlayer.money} -> ${serverPlayerState.money}`);

              // 금액 변동을 토스트로 알림
              const moneyChange = serverPlayerState.money - clientPlayer.money;
              if (moneyChange !== 0) {
                get().addToast(
                  moneyChange > 0 ? "success" : "info",
                  moneyChange > 0 ? "💰 수입" : "💸 지출",
                  `${clientPlayer.name}: ${moneyChange > 0 ? '+' : ''}${moneyChange.toLocaleString()}원\n현재 보유금: ${serverPlayerState.money.toLocaleString()}원`,
                  3500
                );
              }

              return {
                ...clientPlayer,
                money: serverPlayerState.money,
                properties: serverPlayerState.ownedProperties || [],
                // position: serverPlayerState.position, // BLOCKED - TRADE_LAND는 위치 업데이트 안함
                isInJail: serverPlayerState.inJail,
                jailTurns: serverPlayerState.jailTurns,
              };
            }
            return clientPlayer;
          });

          console.log("📍 [POSITION] TRADE_LAND after update - final positions:");
          updatedPlayers.forEach((p, index) => {
            console.log(`  Final Player ${index}: ${p.name} (ID: ${p.id}) - Position: ${p.position}`);
          });

          return { players: updatedPlayers };
        });
      }
    }));

    // 찬스카드 결과 구독 (DRAW_CARD와 CHANCE_CARD 둘 다)
    const handleChanceCard = (message) => {
      console.log("🎲 [DRAW_CARD] 메시지 수신:", message);
      console.log("🎲 [DRAW_CARD] 메시지 타입:", message?.type);
      console.log("🎲 [DRAW_CARD] 페이로드:", message?.payload);
      console.log("🎲 [DRAW_CARD] 현재 시간:", new Date().toISOString());

      const { payload } = message;
      if (!payload) {
        console.error("🎲 [DRAW_CARD] 페이로드가 없습니다!");
        return;
      }

      set((state) => {
        console.log("🎲 [DRAW_CARD] 현재 상태:", {
          currentModal: state.modal,
          playersCount: state.players?.length
        });

        // 백엔드에서 보내는 구조: { result: { userName, cardName, ... } }
        const result = payload.result;
        if (!result) {
          console.error("🎲 [DRAW_CARD] result가 없습니다!");
          return state;
        }

        const { userName, cardName, effectDescription, moneyChange, newPosition } = result;

        console.log("🎲 [DRAW_CARD] 데이터 파싱 완료:", {
          userName,
          cardName,
          effectDescription,
          moneyChange,
          newPosition,
          modalText: `${cardName}: ${effectDescription}`
        });

        // 플레이어 정보 업데이트
        const updatedPlayers = state.players.map(player => {
          // 카드를 뽑은 플레이어 처리
          if (player.name === userName) {
            const updatedPlayer = { ...player };

            // 돈 변화 적용
            if (moneyChange !== undefined && moneyChange !== null) {
              updatedPlayer.money += moneyChange;
            }

            // 위치 변화 적용
            if (newPosition !== undefined && newPosition !== null) {
              updatedPlayer.position = newPosition;
            }

            return updatedPlayer;
          }

          // 모든 플레이어에게 영향을 주는 카드 처리 (경기 침체, 경기 호황 등)
          const isGlobalEffect = effectDescription && (
            effectDescription.includes("모든 플레이어") ||
            effectDescription.includes("전체 플레이어") ||
            cardName === "경기 침체" ||
            cardName === "경기 호황"
          );

          if (isGlobalEffect && moneyChange !== undefined && moneyChange !== null) {
            console.log("🌍 [GLOBAL_EFFECT] 전체 플레이어 영향 카드 적용:", {
              playerName: player.name,
              cardName,
              moneyChange,
              previousMoney: player.money,
              newMoney: player.money + moneyChange
            });

            return {
              ...player,
              money: player.money + moneyChange
            };
          }

          return player;
        });

        // 찬스카드를 뽑은 당사자만 모달 표시, 다른 플레이어는 토스트
        const currentState = get();
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const currentUserInfo = useUserStore.getState().userInfo;
        const isMyCard = currentUserInfo && currentUserInfo.nickname === userName;

        let newModal;

        if (isMyCard) {
          // 내가 뽑은 카드: 모달 표시
          console.log("🎲 [CHANCE_CARD] 내가 뽑은 찬스카드 - 모달 표시:", {
            userName,
            cardName,
            effectDescription
          });

          newModal = {
            type: "CHANCE_CARD" as const,
            text: `${cardName}: ${effectDescription}`,
            onConfirm: () => {
              console.log("🎲 [CHANCE_CARD] 찬스카드 모달 확인 - 카드 유형별 처리");
              set({ modal: { type: "NONE" as const } });

              if (newPosition !== undefined && newPosition !== null) {
                // 이동 효과 카드: 도착한 타일에서 상호작용 처리 필요
                console.log("🎲 [CHANCE_CARD] 이동 효과 카드 - 타일 액션 처리:", {
                  userName,
                  newPosition,
                  cardName
                });
                // 찬스카드로 타일 액션을 처리했음을 표시
                set({ isProcessingChanceCard: true });
                get().handleTileAction();
              } else {
                // 즉시 효과 카드: 바로 턴 종료
                console.log("🎲 [CHANCE_CARD] 즉시 효과 카드 - 바로 턴 종료:", {
                  userName,
                  cardName,
                  effect: "돈 변동, 감옥 등 즉시 처리 완료"
                });
                get().endTurn();
              }
            }
          };
        } else {
          // 다른 플레이어가 뽑은 카드: 토스트 메시지만 표시
          console.log("🎲 [CHANCE_CARD] 다른 플레이어의 찬스카드 - 토스트 표시:", {
            userName,
            cardName,
            effectDescription,
            newPosition
          });

          // 위치 변화가 있는 카드의 경우 더 명확한 메시지 표시
          let toastMessage = `${userName}님: ${cardName} - ${effectDescription}`;
          if (newPosition !== undefined && newPosition !== null) {
            const currentBoard = get().board;
            const targetTileName = currentBoard[newPosition]?.name || `위치 ${newPosition}`;
            toastMessage = `🎲 ${userName}님이 찬스카드로 ${targetTileName}(${newPosition}번)으로 이동했습니다!`;
            console.log("🎲 [POSITION_CHANGE] 위치 변화 토스트:", {
              userName,
              newPosition,
              targetTileName,
              message: toastMessage
            });
          }

          get().addToast("info", "🎲 찬스카드", toastMessage, 4000);
          newModal = { type: "NONE" as const };
        }

        console.log("🎲 [MODAL] 새 모달 상태 설정:", newModal);
        console.log("🎲 [MODAL] 모달 타입 확인:", newModal.type);
        console.log("🎲 [MODAL] 모달 텍스트 확인:", newModal.text);

        const newState = {
          players: updatedPlayers,
          modal: newModal
        };

        console.log("🎲 [STATE] 새로운 상태 반환:", {
          playersUpdated: updatedPlayers.length,
          modalType: newState.modal.type,
          modalText: newState.modal.text
        });

        return newState;
      });
    };

    unsubscribeFunctions.push(subscribeToTopic("DRAW_CARD", handleChanceCard));
    unsubscribeFunctions.push(subscribeToTopic("CHANCE_CARD", handleChanceCard));

    // 경제역사 업데이트 구독
    unsubscribeFunctions.push(subscribeToTopic("ECONOMIC_HISTORY_UPDATE", (message) => {
      const { payload } = message;

      if (!payload) {
        console.error("❌ [ECONOMIC_HISTORY] payload가 없습니다!");
        return;
      }

      const economicHistory = {
        periodName: payload.economicPeriodName,
        effectName: payload.economicEffectName,
        description: payload.economicDescription,
        isBoom: payload.isBoom ?? payload.boom, // 백엔드에서 isBoom 또는 boom으로 전송 가능
        fullName: payload.economicFullName,
        remainingTurns: payload.remainingTurns,
        // 추가 경제 효과 정보
        salaryMultiplier: payload.salaryMultiplier,
        tollMultiplier: payload.tollMultiplier,
        propertyPriceMultiplier: payload.propertyPriceMultiplier,
        buildingCostMultiplier: payload.buildingCostMultiplier
      };

      console.log("📈 [ECONOMIC_HISTORY] 경제역사 업데이트:", {
        periodName: economicHistory.periodName,
        effectName: economicHistory.effectName,
        fullName: economicHistory.fullName,
        isBoom: economicHistory.isBoom,
        remainingTurns: economicHistory.remainingTurns
      });

      console.log("📈 [ECONOMIC_HISTORY] 게임 상태에 경제역사 설정 중...");
      set({ economicHistory });
      console.log("📈 [ECONOMIC_HISTORY] 게임 상태 업데이트 완료");

      // 맵 정보도 함께 업데이트 (REMOVED TO PREVENT STATE OVERWRITING)
      /* if (payload.currentMap) { ... } */

      // 경제역사 변경 알림 모달 표시 (한 라운드당 한 번만)
      if (payload.economicPeriodName && payload.economicEffectName && payload.remainingTurns > 0) {
        const currentState = get();
        const currentTurn = currentState.currentTurn;

        // 이번 턴에 이미 경제 효과 모달을 표시했는지 확인
        if (currentState.lastEconomicModalTurn !== currentTurn) {
          console.log("📈 [ECONOMIC_HISTORY] 새로운 경제 시대 토스트 표시:", {
            turn: currentTurn,
            lastModalTurn: currentState.lastEconomicModalTurn,
            periodName: economicHistory.periodName,
            effectName: economicHistory.effectName
          });

          // 경제 역사는 이제 토스트로 표시 (모달 충돌 방지)
          get().addToast(
            "info",
            `📈 ${economicHistory.fullName}`,
            `${payload.economicDescription}`,
            5000 // 5초 동안 표시
          );

          set({
            lastEconomicModalTurn: currentTurn // 이번 턴에 토스트를 표시했다고 기록
          });
        } else {
          console.log("📈 [ECONOMIC_HISTORY] 이미 이번 턴에 경제 효과 모달을 표시했으므로 스킵:", {
            turn: currentTurn,
            lastModalTurn: currentState.lastEconomicModalTurn
          });
        }
      }
    }));

    // CONSTRUCT_BUILDING 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("CONSTRUCT_BUILDING", (message) => {
      console.log("📥 [WEBSOCKET] CONSTRUCT_BUILDING received:", message);
      console.log("🔍 [CONSTRUCT_BUILDING] Payload detail:", JSON.stringify(message.payload, null, 2));
      const { payload } = message;

      if (payload.result && payload.updatedAsset) {
        setTimeout(() => {
          set((state) => {
            const updatedPlayers = state.players.map((player) => {
              if (player.name === payload.nickname) {
                return {
                  ...player,
                  money: payload.updatedAsset.money,
                  properties: payload.updatedAsset.lands || [],
                };
              }
              return player;
            });

            const updatedBoard = state.board.map((tile, index) => {
              if (index === payload.landNum) {
                return {
                  ...tile,
                  buildings: {
                    ...tile.buildings,
                    level: payload.buildingType === "FIELD" ? 0
                         : payload.buildingType === "VILLA" ? 1
                         : payload.buildingType === "BUILDING" ? 2
                         : payload.buildingType === "HOTEL" ? 3
                         : 0,
                  },
                };
              }
              return tile;
            });

          return {
            players: updatedPlayers,
            board: updatedBoard,
            modal: { type: "NONE" }
          };
        });
      } else {
        console.error("❌ [CONSTRUCT_BUILDING] Failed. Payload result was not successful or updatedAsset was missing.", payload);
        set({
          modal: {
            type: "INFO" as const,
            text: payload.message || "건설에 실패했습니다. 다시 시도해주세요.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              get().endTurn();
            }
          }
        });
      }
    }));

    // JAIL_EVENT 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("JAIL_EVENT", (message) => {
      console.log("📥 [WEBSOCKET] JAIL_EVENT received:", message);
      const { payload } = message;

      // 서버 응답 검증
      if (payload.result === undefined) {
        console.error("❌ [JAIL_EVENT] 서버 응답에 result가 없습니다:", payload);
        set({
          modal: {
            type: "INFO" as const,
            text: "서버에서 잘못된 응답을 받았습니다. 다시 시도해주세요.",
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
        return;
      }

      // 서버는 userName 또는 nickname을 보낼 수 있음 (호환성 처리)
      const playerName = payload.nickname || payload.userName;
      if (!playerName) {
        console.error("❌ [JAIL_EVENT] 서버 응답에 플레이어 이름이 없습니다:", payload);
        set({
          modal: {
            type: "INFO" as const,
            text: "서버 응답이 올바르지 않습니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
        return;
      }

      const currentUserId = useUserStore.getState().userInfo?.userId;

      set((state) => {
        const updatedPlayers = state.players.map(player => {
          if (player.name === playerName) {
            // 감옥 상태 보호: 클라이언트에서 이미 탈출한 경우 서버 응답 무시
            const shouldProtectJailState = !player.isInJail && player.jailTurns === 0 && payload.turns > 0;

            console.log("🔓 [JAIL_EVENT] 플레이어 상태 업데이트:", {
              playerName: player.name,
              escapeResult: payload.result,
              previousMoney: player.money,
              newMoney: payload.updatedAsset ? payload.updatedAsset.money : player.money,
              previousProperties: player.properties,
              newProperties: payload.updatedAsset ? payload.updatedAsset.lands : player.properties,
              serverJailTurns: payload.turns,
              serverIsInJail: payload.turns > 0,
              clientJailState: { isInJail: player.isInJail, jailTurns: player.jailTurns },
              shouldProtectJailState,
              escapeType: payload.result ? "보석금 지불 성공" : "보석금 지불 실패",
              serverResponse: payload
            });

            if (shouldProtectJailState) {
              console.log("🛡️ [JAIL_EVENT_PROTECTION] 클라이언트 탈출 상태 보호:", {
                playerName: player.name,
                action: "서버 JAIL_EVENT 감옥 상태 무시",
                clientState: "이미 탈출 완료"
              });
            }

            return {
              ...player,
              money: payload.updatedAsset ? payload.updatedAsset.money : player.money,
              properties: payload.updatedAsset ? payload.updatedAsset.lands || [] : player.properties,
              isInJail: shouldProtectJailState ? false : (payload.turns > 0),
              jailTurns: shouldProtectJailState ? 0 : (payload.turns || 0)
            };
          }
          return player;
        });

        const isMyJailEvent = updatedPlayers[state.currentPlayerIndex]?.id === currentUserId &&
                              updatedPlayers[state.currentPlayerIndex]?.name === playerName;

        let resultText: string;

        // JAIL_EVENT는 보석금 지불 결과만 처리 (감옥 입소는 클라이언트에서 자동 처리)
        if (payload.result) {
          // 감옥 탈출 성공
          resultText = `${playerName}님이 보석금을 내고 감옥에서 탈출했습니다!`;
          console.log("🔓 [JAIL_EVENT] 보석금 지불 성공:", {
            playerName: playerName,
            isMyJailEvent
          });
        } else {
          // 감옥 탈출 실패
          if (payload.errorMessage) {
            resultText = `감옥 탈출 실패: ${payload.errorMessage}`;
          } else if (payload.turns !== undefined) {
            resultText = `${playerName}님의 감옥 탈출이 실패했습니다. 남은 감옥 턴: ${payload.turns}`;
          } else {
            resultText = `${playerName}님의 감옥 탈출이 실패했습니다. 감옥 상태를 확인해주세요.`;
          }

          // 내 턴이고 실패한 경우 추가 디버깅 정보 로깅
          if (isMyJailEvent) {
            console.error("❌ [JAIL_EVENT] 내 보석금 지불 실패 상세 정보:", {
              playerName: playerName,
              result: payload.result,
              turns: payload.turns,
              errorMessage: payload.errorMessage,
              serverPayload: payload,
              currentPlayerState: updatedPlayers[state.currentPlayerIndex]
            });
          }
        }

        // 당사자는 모달, 다른 플레이어는 토스트
        if (isMyJailEvent) {
          return {
            players: updatedPlayers,
            gamePhase: payload.result ? "WAITING_FOR_ROLL" as const : state.gamePhase,
            modal: {
              type: "INFO" as const,
              text: payload.result
                ? "보석금을 내고 감옥에서 탈출했습니다! 이번 턴에 주사위를 굴릴 수 있습니다."
                : `감옥 탈출에 실패했습니다. 남은 감옥 턴: ${payload.turns}`,
              onConfirm: () => {
                set({ modal: { type: "NONE" as const } });
                if (payload.result) {
                  console.log("🔄 [JAIL_EVENT] 보석금 지불 성공 - 즉시 주사위 굴리기 가능");
                  // endTurn() 호출 제거 - 플레이어가 같은 턴에 주사위를 굴릴 수 있도록 함
                }
              }
            }
          };
        } else {
          // 다른 플레이어들에게는 토스트로 표시
          get().addToast(
            payload.result ? "success" : "warning",
            payload.result ? "🔓 보석금 지불" : "🔒 감옥 탈출 실패",
            resultText,
            3000
          );

          return {
            players: updatedPlayers,
            gamePhase: state.gamePhase,
            modal: { type: "NONE" as const }
          };
        }
      });
    }));

    // INVALID_JAIL_STATE 에러 처리
    unsubscribeFunctions.push(subscribeToTopic("INVALID_JAIL_STATE", (message) => {
      console.error("❌ [WEBSOCKET] INVALID_JAIL_STATE received:", {
        message: message.message,
        payload: message.payload,
        timestamp: new Date().toISOString(),
        currentPlayerState: get().players[get().currentPlayerIndex]
      });

      // 사용자에게 더 구체적인 안내 제공
      let errorText = "감옥 상태가 올바르지 않습니다.";

      if (message.message) {
        errorText = message.message;
      } else if (message.payload?.errorCode === "JAIL_FIRST_TURN") {
        errorText = "감옥에 들어간 첫 턴에는 보석금을 낼 수 없습니다. 다음 턴부터 보석금으로 탈출할 수 있습니다.";
      } else if (message.payload?.errorCode === "NOT_IN_JAIL") {
        errorText = "현재 감옥에 있지 않아 보석금을 낼 수 없습니다.";
      } else if (message.payload?.errorCode === "INSUFFICIENT_FUNDS") {
        errorText = "보석금이 부족합니다.";
      }

      set({
        modal: {
          type: "INFO" as const,
          text: errorText,
          onConfirm: () => set({ modal: { type: "NONE" as const } })
        }
      });
    }));

    // WORLD_TRAVEL_EVENT 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("WORLD_TRAVEL_EVENT", (message) => {
      console.log("📥 [WEBSOCKET] WORLD_TRAVEL_EVENT received:", message);
      console.log("🔍 [WORLD_TRAVEL_EVENT] Payload detail:", JSON.stringify(message.payload, null, 2));
      const { payload } = message;

      if (!payload) return;

      if (payload.result) {
        console.log("✈️ [WORLD_TRAVEL_EVENT] 세계여행 성공 - 위치 업데이트 수행");

        set((state) => {
          console.log("✈️ [WORLD_TRAVEL_EVENT] 현재 플레이어 위치들:", state.players.map(p => ({ name: p.name, position: p.position })));

          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              console.log("✈️ [WORLD_TRAVEL_EVENT] 여행자 위치 업데이트:", {
                travelerName: player.name,
                previousPosition: player.position,
                newPosition: payload.endLand,
                previousMoney: player.money,
                newMoney: payload.travelerAsset ? payload.travelerAsset.money : player.money
              });

              return {
                ...player,
                position: payload.endLand, // 세계여행은 위치 업데이트 허용
                isTraveling: false, // 여행 완료
                money: payload.travelerAsset ? payload.travelerAsset.money : player.money,
                properties: payload.travelerAsset ? payload.travelerAsset.lands || [] : player.properties
              };
            }

            // 땅 소유자 자산 업데이트
            if (payload.landOwner && player.name === payload.landOwner && payload.ownerAsset) {
              console.log("💰 [WORLD_TRAVEL_SYNC] 땅 소유자 자산 업데이트:", {
                ownerName: player.name,
                oldMoney: player.money,
                newMoney: payload.ownerAsset.money,
                oldProperties: player.properties.length,
                newProperties: payload.ownerAsset.lands?.length || 0
              });

              return {
                ...player,
                money: payload.ownerAsset.money,
                properties: payload.ownerAsset.lands || []
              };
            }

            return player;
          });

          console.log("🔄 [WORLD_TRAVEL_COMPLETE] 세계여행 완료, 게임 상태 업데이트:", {
            allPlayersUpdated: true,
            gamePhase: "TILE_ACTION",
            modalClosed: true
          });

          return {
            players: updatedPlayers,
            gamePhase: "TILE_ACTION",
            modal: { type: "NONE" }
          };
        });

        // 세계여행 완료 후 도착한 타일의 액션 실행
        console.log("✈️ [WORLD_TRAVEL] 세계여행 완료, 즉시 타일 액션 실행:", {
          travelerNickname: payload.nickname,
          destination: payload.endLand
        });

        // 지연 제거 - 즉시 타일 액션 실행
        const currentState = get();
        console.log("✈️ [WORLD_TRAVEL] 즉시 타일 액션 실행 시작:", {
          gamePhase: currentState.gamePhase,
          currentPlayerIndex: currentState.currentPlayerIndex,
          travelerName: payload.nickname,
          destination: payload.endLand
        });

        // 세계여행한 플레이어가 현재 플레이어인지 확인
        const travelerPlayer = currentState.players.find(p => p.name === payload.nickname);
        if (travelerPlayer && currentState.players[currentState.currentPlayerIndex].id === travelerPlayer.id) {
          console.log("✈️ [WORLD_TRAVEL] 현재 플레이어의 세계여행, 즉시 타일 액션 처리");
          get().handleTileAction("세계여행 후");
        } else {
          console.log("✈️ [WORLD_TRAVEL] 다른 플레이어의 세계여행, 타일 액션 건너뛰기");
        }
      } else {
        console.error("❌ [WORLD_TRAVEL] 세계여행 실패:", payload);

        // 실패 시 로딩 모달 제거
        set({
          modal: {
            type: "INFO" as const,
            text: "세계여행에 실패했습니다. 다시 시도해주세요.",
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
      }
    }));

    // 게임 중 방 관련 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("ENTER_ROOM_OK", (message) => {
      console.log("📥 [WEBSOCKET] ENTER_ROOM_OK received in game:", message);
      // 게임 중에는 특별한 처리가 필요하지 않으므로 로그만 기록
    }));

    unsubscribeFunctions.push(subscribeToTopic("ENTER_NEW_USER", (message) => {
      console.log("📥 [WEBSOCKET] ENTER_NEW_USER received in game:", message);
      // 게임 중 새 유저 입장은 일반적으로 발생하지 않지만 로그 기록
    }));

    // NTS_EVENT 메시지 처리 (국세청 세금 납부)
    unsubscribeFunctions.push(subscribeToTopic("NTS_EVENT", (message) => {
      console.log("🏛️ [WEBSOCKET] NTS_EVENT received:", message);
      const { payload } = message;

      if (!payload || !payload.nickname) {
        console.error("❌ [NTS_EVENT] Invalid payload:", payload);
        return;
      }

      console.log("🏛️ [NTS_EVENT] Processing tax payment:", {
        nickname: payload.nickname,
        taxAmount: payload.taxAmount,
        updatedAsset: payload.updatedAsset,
        updatedMoney: payload.updatedAsset?.money,
        hasUpdatedAsset: !!payload.updatedAsset
      });

      const userStore = useUserStore.getState();
      const currentUser = userStore.userInfo;

      // 게임 상태에서 현재 플레이어 찾기
      const gameState = get();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isMyTurn = currentPlayer && currentUser && currentPlayer.id === currentUser.userId;

      console.log("🏛️ [NTS_EVENT] Player comparison:", {
        payloadNickname: payload.nickname,
        currentPlayerName: currentPlayer?.name,
        isMyTurn: isMyTurn
      });

      // 플레이어 자산 업데이트 (모든 경우에 적용)
      set((state) => {
        console.log("🏛️ [NTS_EVENT] 현재 state.players:", state.players.map(p => ({name: p.name, money: p.money})));

        const updatedPlayers = state.players.map(player => {
          if (player.name === payload.nickname) {
            if (!payload.updatedAsset) {
              console.error("❌ [NTS_EVENT] updatedAsset이 없습니다!");
              return player;
            }

            console.log("🏛️ [NTS_EVENT] 플레이어 자산 업데이트:", {
              playerName: player.name,
              payloadNickname: payload.nickname,
              oldMoney: player.money,
              newMoney: payload.updatedAsset.money,
              moneyDifference: payload.updatedAsset.money - player.money,
              taxAmount: payload.taxAmount
            });

            const updatedPlayer = {
              ...player,
              money: payload.updatedAsset.money,
              properties: payload.updatedAsset.lands || player.properties
            };

            console.log("🏛️ [NTS_EVENT] 플레이어 업데이트 완료:", {
              before: { name: player.name, money: player.money },
              after: { name: updatedPlayer.name, money: updatedPlayer.money },
              actualChange: updatedPlayer.money - player.money
            });

            return updatedPlayer;
          }
          return player;
        });

        console.log("🏛️ [NTS_EVENT] 업데이트 후 players:", updatedPlayers.map(p => ({name: p.name, money: p.money})));

        // 내 턴이고 내가 세금을 낸 경우에만 모달 표시
        if (isMyTurn && payload.nickname === currentPlayer.name) {
          console.log("🏛️ [NTS_EVENT] My turn - showing NTS modal");
          return {
            players: updatedPlayers,
            modal: {
              type: "NTS" as const,
              text: `국세청에 도착했습니다!\n세금 ${payload.taxAmount.toLocaleString()}원을 납부했습니다.`,
              taxAmount: payload.taxAmount,
              onConfirm: () => {
                console.log("🏛️ [NTS_EVENT] Tax payment confirmed - ending turn");

                // 세금 납부 완료 토스트 표시
                const updatedPlayer = updatedPlayers.find(p => p.name === payload.nickname);
                if (updatedPlayer) {
                  get().addToast(
                    "success",
                    "💰 세금 납부 완료",
                    `${payload.taxAmount.toLocaleString()}원 납부\n현재 보유금: ${updatedPlayer.money.toLocaleString()}원`,
                    4000
                  );
                }

                set({ modal: { type: "NONE" as const } });
                get().endTurn();
              }
            }
          };
        } else {
          // 다른 플레이어의 세금 납부는 토스트로 표시
          console.log("🏛️ [NTS_EVENT] Other player's tax payment - showing toast");
          get().addToast(
            "info",
            "🏛️ 국세청 세금 납부",
            `${payload.nickname}님이 세금 ${payload.taxAmount.toLocaleString()}원을 납부했습니다.`,
            3000
          );
          return { players: updatedPlayers };
        }
      });
    }));

    // INTERNAL_SERVER_ERROR 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("INTERNAL_SERVER_ERROR", (message) => {
      console.error("❌ [WEBSOCKET] INTERNAL_SERVER_ERROR received:", message);
      console.error("❌ [WEBSOCKET] Error details:", {
        payload: message.payload,
        message: message.message,
        timestamp: new Date().toISOString(),
        currentGamePhase: get().gamePhase,
        currentPlayer: get().players[get().currentPlayerIndex]?.name
      });
      const { payload } = message;

      // 세계여행 중 오류라면 세계여행 모드 해제
      const currentState = get();
      if (currentState.gamePhase === "WORLD_TRAVEL_MOVE" ||
          (currentState.modal?.text && currentState.modal.text.includes("세계여행"))) {
        console.log("🔄 [INTERNAL_SERVER_ERROR] 세계여행 중 오류 발생 - 상태 복원");
        set({
          gamePhase: "WAITING_FOR_ROLL",
          modal: {
            type: "INFO" as const,
            text: payload?.message || "서버 내부 오류가 발생했습니다. 다시 시도해주세요.",
            onConfirm: () => {
              set({ modal: { type: "NONE" as const } });
              // 턴을 강제로 종료하여 다음 플레이어로 넘어감
              get().endTurn();
            }
          }
        });

        // 여행 상태인 플레이어들의 상태 복원
        set((state) => ({
          players: state.players.map(player => ({
            ...player,
            isTraveling: false
          }))
        }));
      } else {
        // 일반적인 서버 오류 처리
        const currentState = get();

        // 주사위 굴리는 중 오류가 발생한 경우 (gameState가 null일 가능성 높음)
        if (currentState.gamePhase === "DICE_ROLLING") {
          console.log("🎲 [INTERNAL_SERVER_ERROR] 주사위 굴리기 중 오류 발생 - 게임 상태 재동기화 시도");

          // 게임 상태 문제 감지 - 로그만 기록
          console.log("🔄 [GAME_STATE_RESYNC] 서버 게임 상태가 null일 가능성 감지", {
            gameId: currentState.gameId,
            reason: "INTERNAL_SERVER_ERROR_ON_USE_DICE",
            timestamp: new Date().toISOString()
          });

          set({
            gamePhase: "WAITING_FOR_ROLL",
            modal: {
              type: "INFO" as const,
              text: "서버 게임 상태 오류가 발생했습니다. 게임 상태를 재동기화하고 있습니다. 잠시 후 다시 시도해주세요.",
              onConfirm: () => set({ modal: { type: "NONE" as const } })
            }
          });
        } else {
          // 기타 상황에서의 서버 오류 처리
          set({
            modal: {
              type: "INFO" as const,
              text: payload?.message || "서버 내부 오류가 발생했습니다.",
              onConfirm: () => set({ modal: { type: "NONE" as const } })
            }
          });
        }
      }
    }));

    // INVALID_BEHAVIOR 메시지 처리
    unsubscribeFunctions.push(subscribeToTopic("INVALID_BEHAVIOR", (message) => {
      console.error("❌ [WEBSOCKET] INVALID_BEHAVIOR received:", message);
      console.error("❌ [INVALID_BEHAVIOR] Error details:", {
        message: message.message,
        timestamp: new Date().toISOString(),
        currentGamePhase: get().gamePhase,
        currentPlayer: get().players[get().currentPlayerIndex]?.name
      });

      // 사용자에게 경고 메시지 표시
      get().addToast(
        "error",
        "⚠️ 비정상적 동작",
        message.message || "비정상적인 동작이 감지되었습니다.",
        5000
      );

      // 게임 상태를 안전한 상태로 복원
      const currentState = get();
      if (currentState.gamePhase === "DICE_ROLLING" || currentState.gamePhase === "PLAYER_MOVING") {
        set({
          gamePhase: "WAITING_FOR_ROLL",
          modal: { type: "NONE" as const }
        });
      }
    }));
  },

  disconnect: () => {
    console.log("🧹 [WEBSOCKET] Disconnecting and cleaning up subscriptions:", unsubscribeFunctions.length);
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctions = [];
    console.log("Game store disconnected.");
  },

  send: (destination: string, body: Record<string, unknown>) => {
    sendMessage(destination, body);
  },

  initializeGame: (initialState: GameInitialState) => {
    const currentState = get();
    const isGameInProgress = currentState.gamePhase !== "SELECTING_ORDER" && currentState.players.length > 0;



    const playerNicknamesOrder: string[] = initialState.playerOrder;
    const playersMap = initialState.players;
    const allServerPlayers = Object.values(playersMap);

    const playersArray: Player[] = playerNicknamesOrder
      .map((nickname, index) => {
        const serverPlayer = allServerPlayers.find(
          (p) => p.nickname === nickname
        );
        if (!serverPlayer) {
          console.error(
            `Player with nickname ${nickname} not found in players map.`
          );
          return null;
        }

        // 게임이 진행 중이면 현재 위치를 보존, 아니면 시작칸(0)으로 초기화
        const existingPlayer = currentState.players.find(p => p.id === serverPlayer.userId);
        const playerPosition = isGameInProgress && existingPlayer
          ? existingPlayer.position
          : 0; // 게임 시작 시에만 시작칸(0번)에 배치


        return {
          id: serverPlayer.userId,
          name: serverPlayer.nickname,
          money: serverPlayer.money,
          position: playerPosition,
          properties: serverPlayer.ownedProperties || [],
          isInJail: serverPlayer.inJail,
          jailTurns: serverPlayer.jailTurns,
          character: CHARACTER_PREFABS[index % CHARACTER_PREFABS.length],
          isTraveling: false,
          lapCount: 0,
        };
      })
      .filter((p) => p !== null) as Player[];

    if (playersArray.length !== allServerPlayers.length) {
      console.error(
        "Mismatch between playerOrder and players map. Falling back to default order."
      );
    }

    // 게임 초기화 상태 검증
    if (!initialState.roomId || !initialState.currentMap?.cells || playersArray.length === 0) {
      console.error("❌ [GAME_INIT] 게임 초기화 데이터가 유효하지 않습니다:", {
        roomId: initialState.roomId,
        cellsLength: initialState.currentMap?.cells?.length || 0,
        playersCount: playersArray.length,
        timestamp: new Date().toISOString()
      });
      set({
        modal: {
          type: "INFO" as const,
          text: "게임 초기화에 실패했습니다. 방을 나가서 다시 시작해주세요.",
          onConfirm: () => {
            set({ modal: { type: "NONE" as const } });
            window.location.href = '/lobby';
          }
        }
      });
      return;
    }

    const mappedState = {
      gameId: initialState.roomId,
      board: initialState.currentMap.cells.map((cell) => ({
        name: cell?.name || "빈칸",
        type: cell?.type || "SPECIAL" as const,
        price: cell?.landPrice || cell?.toll,
        landPrice: cell?.landPrice,
        toll: cell?.toll, // 통행료 정보 추가
        housePrice: cell?.housePrice,
        buildingPrice: cell?.buildingPrice,
        hotelPrice: cell?.hotelPrice,
        buildings: cell?.buildingType === 'FIELD' ? { level: 0 as const } :
                   cell?.buildingType === 'HOUSE' ? { level: 1 as const } :
                   cell?.buildingType === 'BUILDING' ? { level: 2 as const } :
                   cell?.buildingType === 'HOTEL' ? { level: 3 as const } : { level: 0 as const },
        description: cell?.description
      })),
      players: playersArray,
      currentPlayerIndex: initialState.currentPlayerIndex,
      gamePhase: "SELECTING_ORDER" as const,
    };

    console.log("✅ [GAME_INIT] 게임 초기화 성공:", {
      gameId: mappedState.gameId,
      playersCount: mappedState.players.length,
      boardLength: mappedState.board.length,
      currentPlayerIndex: mappedState.currentPlayerIndex
    });

    set(mappedState);

    // 게임 초기화 완료 후 대기상태로 전환 (게임이 이미 진행 중이 아닐 때만)
    setTimeout(() => {
      const currentState = get();
      if (currentState.gamePhase === "SELECTING_ORDER") {
        console.log("🔍 [GAME_INIT] 게임 초기화 완료 - 대기상태로 전환", {
          gameId: initialState.roomId,
          playersCount: playersArray.length,
          boardSize: mappedState.board.length
        });
        set({ gamePhase: "WAITING_FOR_ROLL" });
      } else {
        console.log("🔍 [GAME_INIT] 게임이 이미 진행 중이므로 gamePhase 변경하지 않음:", currentState.gamePhase);
      }
    }, 5000);
  },

  updateGameState: (newState: Partial<GameState>) => {
    console.log("🔍 [BACKEND_DATA] updateGameState called with full payload:", {
      hasPlayers: !!newState.players,
      newStateKeys: Object.keys(newState),
      fullPayload: JSON.stringify(newState, null, 2)
    });

    if (newState.players) {
      const players = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);
      console.log("🔍 [BACKEND_DATA] Received player positions from server:");
      players.forEach((p, index) => {
        console.log(`  Server Player ${index}: ${p.name} (ID: ${p.id}) - Position: ${p.position}`);
      });
    }

    // 위치는 제외하고 상태 업데이트 (위치는 USE_DICE와 찬스카드에서만)
    const currentState = get();

    if (newState.players) {
      console.log("🚨 [BLOCKED] updateGameState called with players data - COMPLETELY BLOCKED to prevent position sync issues");
      const newPlayers = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);

      currentState.players.forEach((currentPlayer) => {
        const serverPlayer = newPlayers.find(p => p.id === currentPlayer.id);
        if (serverPlayer && serverPlayer.position !== currentPlayer.position) {
          console.log(`🚨 [POSITION_MISMATCH_BLOCKED] ${currentPlayer.name}:`);
          console.log(`  Current: ${currentPlayer.position} -> Server wants: ${serverPlayer.position} (IGNORED)`);
        }
      });

      // 플레이어 데이터가 있는 경우 완전히 차단 - curPlayer만 업데이트
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { players, ...safeState } = newState;
      console.log("🛡️ [COMPLETE_BLOCK] ONLY updating non-player state to prevent any position corruption");

      // curPlayer가 있으면 currentPlayerIndex만 업데이트 (다른 모든 것 무시)
      if (safeState.curPlayer) {
        const nextPlayerIndex = currentState.players.findIndex(p => p.name === safeState.curPlayer);
        if (nextPlayerIndex !== -1) {
          console.log("🔄 [MINIMAL_UPDATE] ONLY updating currentPlayerIndex:", {
            curPlayer: safeState.curPlayer,
            nextPlayerIndex,
            previousIndex: currentState.currentPlayerIndex
          });
          set({
            currentPlayerIndex: nextPlayerIndex,
            currentTurn: safeState.gameTurn || currentState.currentTurn
          });
        }
      }
    } else {
      console.log("✅ [SAFE_UPDATE] No players in state, applying full update");

      // curPlayer가 있으면 currentPlayerIndex도 업데이트
      if (newState.curPlayer) {
        const currentState = get();
        const nextPlayerIndex = currentState.players.findIndex(p => p.name === newState.curPlayer);
        if (nextPlayerIndex !== -1) {
          console.log("🔄 [SAFE_UPDATE] curPlayer 감지 - currentPlayerIndex 업데이트:", {
            curPlayer: newState.curPlayer,
            nextPlayerIndex,
            previousIndex: currentState.currentPlayerIndex
          });
          set({
            ...newState,
            currentPlayerIndex: nextPlayerIndex
          });
        } else {
          set(newState);
        }
      } else {
        set(newState);
      }
    }
  },
});