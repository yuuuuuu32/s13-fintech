import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";

// 찬스카드 처리 후 다음 GAME_STATE_CHANGE에서 플레이어 정보 허용
let allowNextPlayerUpdate = false;

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
          if (nextPlayerIndex !== -1 && nextPlayerIndex !== state.currentPlayerIndex) {
            console.log("🔄 [TURN_DEBUG] 플레이어 인덱스 변경:", {
              previousIndex: state.currentPlayerIndex,
              nextIndex: nextPlayerIndex,
              previousPlayer: state.players[state.currentPlayerIndex]?.name,
              nextPlayer: state.players[nextPlayerIndex]?.name,
              isLastPlayer: nextPlayerIndex === state.players.length - 1,
              actualChange: true
            });

            const newState = {
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
              isDiceRolled: false, // Ensure dice state is reset
              // 찬스카드 모달이 떠있으면 유지
              modal: state.modal.type === "CHANCE_CARD" ? state.modal : { type: "NONE" },
            };

            // 위치 무결성 검증 및 복원
            setTimeout(() => {
              const currentState = get();
              const positionCheck = new Map();
              let duplicateDetected = false;
              const duplicateInfo: any[] = [];

              currentState.players.forEach((player, index) => {
                if (positionCheck.has(player.position)) {
                  duplicateDetected = true;
                  const existingPlayer = positionCheck.get(player.position);
                  duplicateInfo.push({
                    position: player.position,
                    player1: existingPlayer,
                    player2: { name: player.name, id: player.id, index }
                  });
                  console.error("🚨 [CRITICAL] GAME_STATE_CHANGE 후 위치 중복 감지!", {
                    position: player.position,
                    player1: existingPlayer,
                    player2: { name: player.name, id: player.id, index },
                    allPositions: currentState.players.map(p => ({ name: p.name, position: p.position })),
                    currentPlayerIndex: currentState.currentPlayerIndex
                  });
                } else {
                  positionCheck.set(player.position, { name: player.name, id: player.id, index });
                }
              });

              // 위치 중복이 감지되면 복원 시도
              if (duplicateDetected) {
                console.log("🔧 [POSITION_RESTORE] 위치 중복 복원 시도:", duplicateInfo);

                set((state) => {
                  const restoredPlayers = [...state.players];

                  // 중복된 플레이어들의 위치를 다른 안전한 위치로 분산
                  duplicateInfo.forEach(({ position, player1, player2 }) => {
                    // player1의 인덱스 찾기
                    const player1Index = restoredPlayers.findIndex(p => p.id === player1.id);
                    // player2의 인덱스 찾기
                    const player2Index = restoredPlayers.findIndex(p => p.id === player2.id);

                    if (player1Index !== -1 && player2Index !== -1) {
                      // 현재 플레이어가 아닌 플레이어의 위치를 약간 조정
                      if (player1Index !== state.currentPlayerIndex) {
                        // player1을 이전 위치로 이동 (안전한 위치)
                        restoredPlayers[player1Index] = {
                          ...restoredPlayers[player1Index],
                          position: Math.max(0, position - 1)
                        };
                        console.log("🔧 [POSITION_RESTORE] player1 위치 복원:", {
                          playerName: player1.name,
                          oldPosition: position,
                          newPosition: Math.max(0, position - 1)
                        });
                      } else if (player2Index !== state.currentPlayerIndex) {
                        // player2를 다음 위치로 이동 (안전한 위치)
                        restoredPlayers[player2Index] = {
                          ...restoredPlayers[player2Index],
                          position: Math.min(35, position + 1) // 보드 크기를 36으로 가정
                        };
                        console.log("🔧 [POSITION_RESTORE] player2 위치 복원:", {
                          playerName: player2.name,
                          oldPosition: position,
                          newPosition: Math.min(35, position + 1)
                        });
                      }
                    }
                  });

                  console.log("🔧 [POSITION_RESTORE] 위치 복원 완료:", {
                    beforeRestore: state.players.map(p => ({ name: p.name, position: p.position })),
                    afterRestore: restoredPlayers.map(p => ({ name: p.name, position: p.position }))
                  });

                  return {
                    players: restoredPlayers
                  };
                });

                // 복원 후 다시 검증
                setTimeout(() => {
                  const verificationState = get();
                  const verificationCheck = new Map();
                  let stillDuplicated = false;

                  verificationState.players.forEach((player, index) => {
                    if (verificationCheck.has(player.position)) {
                      stillDuplicated = true;
                      console.error("🚨 [CRITICAL] 위치 복원 후에도 중복 존재!", {
                        position: player.position,
                        player1: verificationCheck.get(player.position),
                        player2: { name: player.name, id: player.id, index }
                      });
                    } else {
                      verificationCheck.set(player.position, { name: player.name, id: player.id, index });
                    }
                  });

                  if (!stillDuplicated) {
                    console.log("✅ [POSITION_RESTORE] 위치 복원 성공 - 중복 해결됨");
                  }
                }, 100);
              }
            }, 50);

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
        // 찬스카드 후 플레이어 업데이트 허용 체크
        if (allowNextPlayerUpdate && payload.players) {
          console.log("🎲 [CHANCE_CARD_UPDATE] 찬스카드 후 서버 플레이어 상태 업데이트 허용:", JSON.stringify(payload, null, 2));
          allowNextPlayerUpdate = false; // 한 번만 허용
          get().updateGameState(payload);
        } else {
          // GAME_STATE_CHANGE는 위치 업데이트하지 않음 - 게임 상태만
          console.log("🔍 [BACKEND_DATA] GAME_STATE_CHANGE without curPlayer - excluding players:", JSON.stringify(payload, null, 2));
          const { players, ...safePayload } = payload;
          if (players) {
            console.log("🚨 [CRITICAL] GAME_STATE_CHANGE has player data - this could cause position desync!");
            console.log("🚨 [CRITICAL] Player data in GAME_STATE_CHANGE:", players);
            console.log("🔍 [BACKEND_DATA] GAME_STATE_CHANGE BLOCKED player updates to prevent snap-back");
          }
          get().updateGameState(safePayload);
        }
      }
    }));

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
        console.log("🎮 Setting gamePhase to WAITING_FOR_ROLL");
        set((state) => ({
          currentPlayerIndex: payload.currentPlayerIndex,
          currentTurn: payload.currentTurn || get().currentTurn,
          gamePhase: "WAITING_FOR_ROLL",
          isDiceRolled: false, // Reset for the next turn
          // 찬스카드 모달이 떠있으면 유지
          modal: state.modal.type === "CHANCE_CARD" ? state.modal : { type: "NONE" },
        }));
      }
    }));

    unsubscribeFunctions.push(subscribeToTopic("USE_DICE", (message) => {
      console.log("📥 [WEBSOCKET] USE_DICE received:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn, userName, updatedAsset } = payload;

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
        // 서버에서 업데이트된 자산 정보를 플레이어에게 적용
        const updatedPlayers = state.players.map(player => {
          if (player.name === userName && updatedAsset) {
            console.log("💰 [USE_DICE] 플레이어 자산 업데이트:", {
              playerName: player.name,
              previousMoney: player.money,
              newMoney: updatedAsset.money,
              moneyChange: updatedAsset.money - player.money,
              properties: updatedAsset.lands
            });

            return {
              ...player,
              money: updatedAsset.money, // 서버에서 경제역사 효과가 적용된 머니
              properties: updatedAsset.lands || player.properties
            };
          }
          return player;
        });

        return {
          players: updatedPlayers, // 위치는 여기서 업데이트하지 않음 - movePlayer에서 처리
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
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
          console.log("🏃 [USE_DICE] 현재 플레이어 이동 처리:", {
            playerName: userName,
            currentPlayerIndex: currentState.currentPlayerIndex,
            dice: [diceNum1, diceNum2]
          });
          get().movePlayer([diceNum1, diceNum2]);
        } else {
          console.log("👀 [USE_DICE] 다른 플레이어의 주사위 - 이동 처리 건너뛰기:", {
            dicePlayerName: userName,
            currentPlayerName: currentPlayer?.name,
            currentPlayerIndex: currentState.currentPlayerIndex
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

        // 찬스카드는 모든 플레이어가 봐야 함
        console.log("🎲 Modal display check - showing to all players:", {
          userName,
          cardName,
          effectDescription
        });

        const newModal = {
          type: "CHANCE_CARD" as const,
          text: `${cardName}: ${effectDescription}`,
          onConfirm: () => {
            console.log("🎲 [CHANCE_CARD] 찬스카드 모달 확인 버튼 클릭");
            set({ modal: { type: "NONE" as const } });

            // 현재 플레이어만 게임 로직 실행
            const currentState = get();
            const currentPlayer = currentState.players[currentState.currentPlayerIndex];
            const currentUserId = useUserStore.getState().userInfo?.userId;
            const isMyTurn = currentPlayer.id === currentUserId;

            if (!isMyTurn) {
              console.log("🎲 [CHANCE_CARD] 내 턴이 아니므로 확인만 처리:", {
                currentPlayer: currentPlayer.name,
                myUserId: currentUserId,
                isMyTurn
              });
              return;
            }

            console.log("🎲 [CHANCE_CARD] 현재 플레이어 - 게임 로직 실행:", {
              currentPlayer: currentPlayer.name,
              myUserId: currentUserId
            });

            // 모든 플레이어 영향 카드의 경우 서버 업데이트 허용
            const isGlobalEffect = effectDescription && (
              effectDescription.includes("모든 플레이어") ||
              effectDescription.includes("전체 플레이어") ||
              cardName === "경기 침체" ||
              cardName === "경기 호황"
            );

            if (isGlobalEffect) {
              console.log("🌍 [GLOBAL_EFFECT] 전체 영향 카드 - 서버 플레이어 업데이트 허용 설정");
              allowNextPlayerUpdate = true;
            }

            // 위치가 변경되었다면 다시 타일 액션 처리
            if (newPosition !== undefined && newPosition !== null) {
              console.log("🎲 [CHANCE_CARD] 위치 변경됨 - 새 위치에서 타일 액션 처리:", {
                userName,
                previousPosition: "unknown",
                newPosition,
                willTriggerTileAction: true
              });
              get().handleTileAction();
            } else {
              // 위치 변경이 없으면 턴 종료
              console.log("🎲 [CHANCE_CARD] 위치 변경 없음 - 바로 턴 종료:", {
                userName,
                moneyChange,
                turnEnding: true
              });
              get().endTurn();
            }
          }
        };

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

      // 맵 정보도 함께 업데이트
      if (payload.currentMap) {
        const updatedBoard = payload.currentMap.cells.map((cell) => ({
          name: cell.name,
          type: cell.type, // 백엔드에서 보내는 대문자 타입을 그대로 사용
          price: cell.landPrice || cell.toll,
          landPrice: cell.landPrice,
          toll: cell.toll, // 통행료 정보 추가
          housePrice: cell.housePrice,
          buildingPrice: cell.buildingPrice,
          hotelPrice: cell.hotelPrice,
          buildings: cell.buildingType === 'FIELD' ? { level: 0 as const } :
                     cell.buildingType === 'HOUSE' ? { level: 1 as const } :
                     cell.buildingType === 'BUILDING' ? { level: 2 as const } :
                     cell.buildingType === 'HOTEL' ? { level: 3 as const } : { level: 0 as const },
          description: cell.description
        }));
        set({ board: updatedBoard });
      }

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
        set((state) => {
          console.log("🏗️ [CONSTRUCT_BUILDING] 플레이어 상태 업데이트 (위치 제외):", {
            targetPlayer: payload.nickname,
            currentPlayers: state.players.map(p => ({ name: p.name, position: p.position }))
          });

          const updatedPlayers = state.players.map((player, index) => {
            if (player.name === payload.nickname) {
              console.log("🏗️ [CONSTRUCT_BUILDING] 타겟 플레이어 업데이트:", {
                name: player.name,
                playerId: player.id,
                playerIndex: index,
                currentPlayerIndex: state.currentPlayerIndex,
                previousMoney: player.money,
                newMoney: payload.updatedAsset.money,
                previousProperties: player.properties,
                newProperties: payload.updatedAsset.lands,
                positionKept: player.position // 위치는 유지됨
              });

              // 안전성 검증: 다른 플레이어의 데이터를 실수로 덮어쓰지 않도록
              if (player.position === undefined || player.position < 0) {
                console.error("🚨 [CRITICAL] CONSTRUCT_BUILDING: 플레이어 위치 데이터 이상:", {
                  playerName: player.name,
                  position: player.position,
                  fullPlayer: player
                });
              }

              return {
                ...player,
                money: payload.updatedAsset.money,
                properties: payload.updatedAsset.lands || []
                // position은 의도적으로 업데이트하지 않음 - 클라이언트에서 관리
              };
            }
            return player;
          });

          // 보드에서 해당 땅의 건물 레벨 업데이트
          const updatedBoard = state.board.map((tile, index) => {
            if (index === payload.landNum) {
              return {
                ...tile,
                buildings: {
                  ...tile.buildings,
                  level: payload.buildingType === "FIELD" ? 0 :
                         payload.buildingType === "VILLA" ? 1 :
                         payload.buildingType === "BUILDING" ? 2 :
                         payload.buildingType === "HOTEL" ? 3 : 0
                }
              };
            }
            return tile;
          });

          // 위치 중복 검사 및 즉시 복원
          const positionCheck = new Map();
          let duplicateDetected = false;
          const duplicateInfo: any[] = [];

          updatedPlayers.forEach((player, index) => {
            if (positionCheck.has(player.position)) {
              duplicateDetected = true;
              const existingPlayer = positionCheck.get(player.position);
              duplicateInfo.push({
                position: player.position,
                player1: existingPlayer,
                player2: { name: player.name, id: player.id, index }
              });
              console.error("🚨 [CRITICAL] CONSTRUCT_BUILDING: 위치 중복 감지!", {
                position: player.position,
                player1: existingPlayer,
                player2: { name: player.name, id: player.id, index },
                allPositions: updatedPlayers.map(p => ({ name: p.name, position: p.position }))
              });
            } else {
              positionCheck.set(player.position, { name: player.name, id: player.id, index });
            }
          });

          // 위치 중복이 감지되면 즉시 복원
          if (duplicateDetected) {
            console.log("🔧 [CONSTRUCT_BUILDING] 위치 중복 즉시 복원:", duplicateInfo);

            duplicateInfo.forEach(({ position, player1, player2 }) => {
              const player1Index = updatedPlayers.findIndex(p => p.id === player1.id);
              const player2Index = updatedPlayers.findIndex(p => p.id === player2.id);

              if (player1Index !== -1 && player2Index !== -1) {
                // 현재 플레이어가 아닌 플레이어의 위치를 조정
                if (player1Index !== state.currentPlayerIndex) {
                  updatedPlayers[player1Index] = {
                    ...updatedPlayers[player1Index],
                    position: Math.max(0, position - 1)
                  };
                  console.log("🔧 [CONSTRUCT_BUILDING] player1 위치 복원:", {
                    playerName: player1.name,
                    oldPosition: position,
                    newPosition: Math.max(0, position - 1)
                  });
                } else if (player2Index !== state.currentPlayerIndex) {
                  updatedPlayers[player2Index] = {
                    ...updatedPlayers[player2Index],
                    position: Math.min(35, position + 1)
                  };
                  console.log("🔧 [CONSTRUCT_BUILDING] player2 위치 복원:", {
                    playerName: player2.name,
                    oldPosition: position,
                    newPosition: Math.min(35, position + 1)
                  });
                }
              }
            });
          }

          return {
            players: updatedPlayers,
            board: updatedBoard,
            modal: { type: "NONE" }
          };
        });
      } else {
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

      if (payload.result !== undefined) {
        const currentUserId = useUserStore.getState().userInfo?.userId;

        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              console.log("🔓 [JAIL_EVENT] 플레이어 상태 업데이트:", {
                playerName: player.name,
                escapeResult: payload.result,
                previousMoney: player.money,
                newMoney: payload.updatedAsset ? payload.updatedAsset.money : player.money,
                previousProperties: player.properties,
                newProperties: payload.updatedAsset ? payload.updatedAsset.lands : player.properties,
                jailTurns: payload.turns,
                isInJail: payload.turns > 0
              });

              return {
                ...player,
                money: payload.updatedAsset ? payload.updatedAsset.money : player.money,
                properties: payload.updatedAsset ? payload.updatedAsset.lands || [] : player.properties,
                isInJail: payload.turns > 0,
                jailTurns: payload.turns || 0
              };
            }
            return player;
          });

          const isMyJailEvent = updatedPlayers[state.currentPlayerIndex]?.id === currentUserId &&
                                updatedPlayers[state.currentPlayerIndex]?.name === payload.nickname;

          const resultText = payload.result
            ? `${payload.nickname}님이 보석금을 내고 감옥에서 탈출했습니다!`
            : `${payload.nickname}님의 감옥 탈출이 실패했습니다. 남은 감옥 턴: ${payload.turns}`;

          // 당사자는 모달, 다른 플레이어는 토스트
          if (isMyJailEvent) {
            return {
              players: updatedPlayers,
              gamePhase: payload.result ? "WAITING_FOR_ROLL" as const : state.gamePhase,
              modal: {
                type: "INFO" as const,
                text: payload.result
                  ? "보석금을 내고 감옥에서 탈출했습니다!"
                  : `감옥 탈출에 실패했습니다. 남은 감옥 턴: ${payload.turns}`,
                onConfirm: () => {
                  set({ modal: { type: "NONE" as const } });
                  if (payload.result) {
                    console.log("🔄 [JAIL_EVENT] 보석금 지불 성공 후 턴 종료");
                    setTimeout(() => get().endTurn(), 100);
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
      }
    }));

    // INVALID_JAIL_STATE 에러 처리
    unsubscribeFunctions.push(subscribeToTopic("INVALID_JAIL_STATE", (message) => {
      console.log("❌ [WEBSOCKET] INVALID_JAIL_STATE received:", message);

      set({
        modal: {
          type: "INFO" as const,
          text: message.message || "감옥 상태가 올바르지 않습니다.",
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
        console.log("✈️ [WORLD_TRAVEL] 세계여행 완료, 도착 타일 액션 실행:", {
          travelerNickname: payload.nickname,
          destination: payload.endLand
        });

        setTimeout(() => {
          const currentState = get();
          console.log("✈️ [WORLD_TRAVEL] 타일 액션 실행 시작:", {
            gamePhase: currentState.gamePhase,
            currentPlayerIndex: currentState.currentPlayerIndex,
            travelerName: payload.nickname
          });

          // 세계여행한 플레이어가 현재 플레이어인지 확인
          const travelerPlayer = currentState.players.find(p => p.name === payload.nickname);
          if (travelerPlayer && currentState.players[currentState.currentPlayerIndex].id === travelerPlayer.id) {
            console.log("✈️ [WORLD_TRAVEL] 현재 플레이어의 세계여행, 타일 액션 처리");
            get().handleTileAction("세계여행 후");
          } else {
            console.log("✈️ [WORLD_TRAVEL] 다른 플레이어의 세계여행, 타일 액션 건너뛰기");
          }
        }, 100); // 상태 업데이트 완료 후 실행
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
      console.log("🚨 [CRITICAL] updateGameState called with players data - comparing positions:");
      const newPlayers = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);

      currentState.players.forEach((currentPlayer) => {
        const serverPlayer = newPlayers.find(p => p.id === currentPlayer.id);
        if (serverPlayer && serverPlayer.position !== currentPlayer.position) {
          console.log(`🚨 [CRITICAL] Position mismatch for ${currentPlayer.name}:`);
          console.log(`  Current: ${currentPlayer.position} -> Server wants: ${serverPlayer.position}`);
          console.log(`  This would cause SNAP-BACK if applied!`);
        }
      });

      // 위치 제외한 안전한 업데이트
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { players, ...safeState } = newState;
      console.log("🛡️ [SAFE_UPDATE] Applying state without player positions to prevent snap-back");

      // curPlayer가 있으면 currentPlayerIndex도 업데이트
      if (safeState.curPlayer) {
        const nextPlayerIndex = currentState.players.findIndex(p => p.name === safeState.curPlayer);
        if (nextPlayerIndex !== -1) {
          console.log("🔄 [SAFE_UPDATE] curPlayer 감지 (with players) - currentPlayerIndex 업데이트:", {
            curPlayer: safeState.curPlayer,
            nextPlayerIndex,
            previousIndex: currentState.currentPlayerIndex
          });
          set({
            ...safeState,
            currentPlayerIndex: nextPlayerIndex
          });
        } else {
          set(safeState);
        }
      } else {
        set(safeState);
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