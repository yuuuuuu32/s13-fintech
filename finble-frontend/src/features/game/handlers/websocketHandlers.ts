import type { GameState, GameInitialState, Player } from "../types/gameTypes.ts";
import { sendMessage, subscribeToTopic } from "../../../utils/websocket.ts";
import { CHARACTER_PREFABS } from "../constants/gameConstants.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";

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

            // Check for game over after turn change
            setTimeout(() => {
              get().checkGameOver();
            }, 1000);

            return newState;
          }
          return {};
        });
      } else {
        // GAME_STATE_CHANGE should not update player positions to prevent snap-back
        const { players, ...safePayload } = payload;
        get().updateGameState(safePayload);
      }
    });

    subscribeToTopic("START_GAME_OBSERVE", (message) => {
      console.log("📥 [WEBSOCKET] START_GAME_OBSERVE received:", message);
      console.log("📥 [WEBSOCKET] START_GAME_OBSERVE payload detail:", JSON.stringify(message.payload, null, 2));

      // START_GAME_OBSERVE should not update player positions to prevent snap-back
      const { players, ...safePayload } = message.payload;
      get().updateGameState(safePayload);
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
        console.log("✅ Turn change completed. New player index:", payload.currentPlayerIndex);
      }
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("📥 [WEBSOCKET] USE_DICE received:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn } = payload;

      set(() => {
        return {
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
        console.log("📍 [POSITION] TRADE_LAND server positions:", Object.entries(serverPlayersMap).map(([id, player]) => ({
          playerId: id,
          nickname: player.nickname,
          serverPosition: player.position
        })));

        set((state) => {
          console.log("📍 [POSITION] TRADE_LAND current client positions:", state.players.map(p => ({
            playerId: p.id,
            nickname: p.name,
            clientPosition: p.position
          })));

          const updatedPlayers = state.players.map(clientPlayer => {
            const serverPlayerState = serverPlayersMap[clientPlayer.id];
            if (serverPlayerState) {
              return {
                ...clientPlayer,
                money: serverPlayerState.money,
                properties: serverPlayerState.ownedProperties || [],
                // position: serverPlayerState.position, // DO NOT UPDATE POSITION - This prevents snap-back bug
                isInJail: serverPlayerState.inJail,
                jailTurns: serverPlayerState.jailTurns,
              };
            }
            return clientPlayer;
          });

          console.log("📍 [POSITION] TRADE_LAND after update positions:", updatedPlayers.map(p => ({
            playerId: p.id,
            nickname: p.name,
            positionAfterUpdate: p.position
          })));

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
            console.log("🎲 [MODAL] 찬스카드 모달 확인 버튼 클릭");
            set({ modal: { type: "NONE" as const } });
            // 위치가 변경되었다면 다시 타일 액션 처리
            if (newPosition !== undefined && newPosition !== null) {
              console.log("🎲 [MODAL] 위치 변경으로 인한 타일 액션 처리");
              get().handleTileAction();
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

      set((state) => {
        const updatedPlayers = state.players.map(player => {
          if (player.name === payload.nickname) {
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

        return {
          players: updatedPlayers,
          modal: { type: "NONE" }
        };
      });
    });

    // WORLD_TRAVEL_EVENT 메시지 처리
    subscribeToTopic("WORLD_TRAVEL_EVENT", (message) => {
      console.log("📥 [WEBSOCKET] WORLD_TRAVEL_EVENT received:", message);
      const { payload } = message;

      if (payload.result) {
        set((state) => {
          const updatedPlayers = state.players.map(player => {
            if (player.name === payload.nickname) {
              return {
                ...player,
                position: payload.endLand,
                money: payload.travelerAsset ? payload.travelerAsset.money : player.money,
                properties: payload.travelerAsset ? payload.travelerAsset.lands || [] : player.properties
              };
            }
            // 땅 소유자 자산 업데이트
            if (payload.landOwner && player.name === payload.landOwner && payload.ownerAsset) {
              return {
                ...player,
                money: payload.ownerAsset.money,
                properties: payload.ownerAsset.lands || []
              };
            }
            return player;
          });

          return {
            players: updatedPlayers,
            gamePhase: "TILE_ACTION",
            modal: { type: "NONE" }
          };
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
  },

  disconnect: () => {
    console.log("Game store disconnected.");
  },

  send: (destination: string, body: Record<string, unknown>) => {
    sendMessage(destination, body);
  },

  initializeGame: (initialState: GameInitialState) => {
    console.log("📍 [POSITION] initializeGame called - forcing all players to start position (0):", {
      roomId: initialState.roomId,
      playerOrder: initialState.playerOrder,
      serverPlayers: Object.values(initialState.players).map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        serverPosition: p.position,
        forcedPosition: 0
      }))
    });

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
        return {
          id: serverPlayer.userId,
          name: serverPlayer.nickname,
          money: serverPlayer.money,
          position: 0, // 게임 시작 시 모든 플레이어를 시작칸(0번)에 배치
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
    console.log("📍 [POSITION] updateGameState called:", {
      hasPlayers: !!newState.players,
      newStateKeys: Object.keys(newState),
      playersType: newState.players ? (Array.isArray(newState.players) ? 'array' : 'object') : 'none',
      playerCount: newState.players ? (Array.isArray(newState.players) ? newState.players.length : Object.keys(newState.players).length) : 0
    });

    if (newState.players) {
      const players = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);
      console.log("📍 [POSITION] updateGameState player positions:", players.map(p => ({
        playerId: p.id,
        nickname: p.name,
        position: p.position
      })));

      // Check for position 0 resets
      players.forEach(p => {
        if (p.position === 0) {
          console.warn("⚠️ [WARNING] updateGameState setting player to position 0:", {
            playerId: p.id,
            nickname: p.name,
            position: p.position
          });
        }
      });
    }

    set(newState);
  },
});