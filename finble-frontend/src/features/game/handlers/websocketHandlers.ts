import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";

// 찬스카드 처리 후 다음 GAME_STATE_CHANGE에서 플레이어 정보 허용
let allowNextPlayerUpdate = false;

// 찬스카드 처리 후 다음 GAME_STATE_CHANGE에서 플레이어 정보 허용
let allowNextPlayerUpdate = false;

// 찬스카드 처리 후 다음 GAME_STATE_CHANGE에서 플레이어 정보 허용
let allowNextPlayerUpdate = false;

export const createWebSocketHandlers = (
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
  get: () => GameState
) => ({
  connect: (gameId: string) => {
    set({ gameId });
    console.log("🔌 [WEBSOCKET] Connected to game:", gameId);

    subscribeToTopic("GAME_STATE_CHANGE", (message) => {
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE received:", message);
      const { payload } = message;
      console.log("📥 [WEBSOCKET] GAME_STATE_CHANGE payload detail:", JSON.stringify(payload, null, 2));

      // If the payload has curPlayer, it's likely a turn change from the timer
      if (payload.curPlayer) {
        set((state) => {
          const nextPlayerIndex = state.players.findIndex(p => p.name === payload.curPlayer);
          if (nextPlayerIndex !== -1) {
            const newState = {
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
              isDiceRolled: false, // Ensure dice state is reset
              // 찬스카드 모달이 떠있으면 유지
              modal: state.modal.type === "CHANCE_CARD" ? state.modal : { type: "NONE" },
            };

            // Note: checkGameOver will be called at the end of endTurn, no need to call here

            return newState;
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
            console.log("🔍 [BACKEND_DATA] GAME_STATE_CHANGE BLOCKED player updates to prevent snap-back");
          }
          get().updateGameState(safePayload);
        }
      }
    });

    subscribeToTopic("START_GAME_OBSERVE", (message) => {
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
    });

    subscribeToTopic("TURN_CHANGE", (message) => {
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
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("📥 [WEBSOCKET] USE_DICE received:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn, userName, updatedAsset } = payload;

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
          players: updatedPlayers,
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          gamePhase: "DICE_ROLLING",
        };
      });
    });

    subscribeToTopic("TRADE_LAND", (message) => {
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
    });

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

    subscribeToTopic("DRAW_CARD", handleChanceCard);
    subscribeToTopic("CHANCE_CARD", handleChanceCard);

    // 경제역사 업데이트 구독
    subscribeToTopic("ECONOMIC_HISTORY_UPDATE", (message) => {
      const { payload } = message;

      if (!payload) {
        console.error("❌ [ECONOMIC_HISTORY] payload가 없습니다!");
        return;
      }

      const economicHistory = {
        periodName: payload.periodName,
        effectName: payload.effectName,
        description: payload.description,
        isBoom: payload.isBoom,
        fullName: payload.fullName,
        salaryMultiplier: payload.salaryMultiplier,
        tollMultiplier: payload.tollMultiplier,
        propertyPriceMultiplier: payload.propertyPriceMultiplier,
        buildingCostMultiplier: payload.buildingCostMultiplier,
        chanceCardBonusMultiplier: payload.isBoom ? 1.2 : 0.8,
        chanceCardPenaltyMultiplier: payload.isBoom ? 0.8 : 1.2,
        remainingTurns: payload.remainingTurns
      };

      set({ economicHistory });

      // 경제역사 변경 알림 모달 표시
      if (payload.periodName && payload.effectName) {
        set({
          modal: {
            type: "INFO" as const,
            text: `📈 ${economicHistory.fullName}\n\n${payload.description}\n\n남은 턴: ${payload.remainingTurns}턴`,
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
      }
    });

    // CONSTRUCT_BUILDING 메시지 처리
    subscribeToTopic("CONSTRUCT_BUILDING", (message) => {
      console.log("📥 [WEBSOCKET] CONSTRUCT_BUILDING received:", message);
      const { payload } = message;

      if (payload.result && payload.updatedAsset) {
        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              return {
                ...player,
                money: payload.updatedAsset.money,
                properties: payload.updatedAsset.lands || []
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
                         payload.buildingType === "HOUSE" ? 1 :
                         payload.buildingType === "BUILDING" ? 2 :
                         payload.buildingType === "HOTEL" ? 3 : 0
                }
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
      }
    });

    // JAIL_EVENT 메시지 처리
    subscribeToTopic("JAIL_EVENT", (message) => {
      console.log("📥 [WEBSOCKET] JAIL_EVENT received:", message);
      const { payload } = message;

      if (payload.result !== undefined) {
        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              console.log("🔓 [JAIL_EVENT] 플레이어 상태 업데이트:", {
                playerName: player.name,
                escapeResult: payload.result,
                previousMoney: player.money,
                newMoney: payload.updatedAsset ? payload.updatedAsset.money : player.money,
                jailTurns: payload.turns,
                isInJail: payload.turns > 0
              });

              return {
                ...player,
                money: payload.updatedAsset ? payload.updatedAsset.money : player.money,
                properties: payload.updatedAsset ? payload.updatedAsset.lands || [] : player.properties,
                isInJail: payload.turns > 0,
                jailTurns: payload.turns
              };
            }
            return player;
          });

          const resultText = payload.result
            ? `${payload.nickname}님이 보석금을 내고 감옥에서 탈출했습니다!`
            : `${payload.nickname}님의 감옥 탈출이 실패했습니다.`;

          return {
            players: updatedPlayers,
            modal: {
              type: "INFO" as const,
              text: resultText,
              onConfirm: () => set({ modal: { type: "NONE" as const } })
            }
          };
        });
      }
    });

    // WORLD_TRAVEL_EVENT 메시지 처리
    subscribeToTopic("WORLD_TRAVEL_EVENT", (message) => {
      console.log("✈️ [WORLD_TRAVEL_RESPONSE] 서버 응답 수신:", {
        message,
        timestamp: new Date().toISOString()
      });

      const { payload } = message;

      if (!payload) {
        console.error("❌ [WORLD_TRAVEL] payload 없음!");
        return;
      }

      if (payload.result) {
        console.log("✅ [WORLD_TRAVEL] 세계여행 성공, 모든 클라이언트 동기화 시작:", {
          travelerNickname: payload.nickname,
          destination: payload.endLand,
          travelerAsset: payload.travelerAsset,
          landOwner: payload.landOwner,
          ownerAsset: payload.ownerAsset
        });

        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              console.log("🎯 [WORLD_TRAVEL_SYNC] 여행자 위치 업데이트:", {
                playerId: player.id,
                nickname: player.name,
                oldPosition: player.position,
                newPosition: payload.endLand,
                positionChanged: player.position !== payload.endLand,
                oldMoney: player.money,
                newMoney: payload.travelerAsset ? payload.travelerAsset.money : player.money
              });

              return {
                ...player,
                position: payload.endLand,
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
    });

    // 게임 중 방 관련 메시지 처리
    subscribeToTopic("ENTER_ROOM_OK", (message) => {
      console.log("📥 [WEBSOCKET] ENTER_ROOM_OK received in game:", message);
      // 게임 중에는 특별한 처리가 필요하지 않으므로 로그만 기록
    });

    subscribeToTopic("ENTER_NEW_USER", (message) => {
      console.log("📥 [WEBSOCKET] ENTER_NEW_USER received in game:", message);
      // 게임 중 새 유저 입장은 일반적으로 발생하지 않지만 로그 기록
    });

    // INTERNAL_SERVER_ERROR 메시지 처리
    subscribeToTopic("INTERNAL_SERVER_ERROR", (message) => {
      console.error("❌ [WEBSOCKET] INTERNAL_SERVER_ERROR received:", message);
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
        set({
          modal: {
            type: "INFO" as const,
            text: payload?.message || "서버 내부 오류가 발생했습니다.",
            onConfirm: () => set({ modal: { type: "NONE" as const } })
          }
        });
      }
    });
  },

  disconnect: () => {
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

    const mappedState = {
      gameId: initialState.roomId,
                  board: initialState.currentMap.cells.map(
        (cell) => cell || { name: "빈칸", type: "special" as const }
      ),
      players: playersArray,
      currentPlayerIndex: initialState.currentPlayerIndex,
      gamePhase: "SELECTING_ORDER" as const,
    };
    set(mappedState);

    setTimeout(() => {
      set({ gamePhase: "WAITING_FOR_ROLL" });
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
      set(safeState);
    } else {
      console.log("✅ [SAFE_UPDATE] No players in state, applying full update");
      set(newState);
    }
  },
});