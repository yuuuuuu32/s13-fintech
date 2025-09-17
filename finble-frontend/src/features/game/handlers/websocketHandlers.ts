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
    console.log("Game store connected to game:", gameId);

    subscribeToTopic("GAME_STATE_CHANGE", (message) => {
      console.log("Received game update (GAME_STATE_CHANGE):", message);
      const { payload } = message;

      // If the payload has curPlayer, it's likely a turn change from the timer
      if (payload.curPlayer) {
        console.log("🔄 GAME_STATE_CHANGE with curPlayer:", payload.curPlayer);
        set((state) => {
          const nextPlayerIndex = state.players.findIndex(p => p.name === payload.curPlayer);
          if (nextPlayerIndex !== -1) {
            console.log("✅ Player found, changing turn to index:", nextPlayerIndex);
            return {
              currentPlayerIndex: nextPlayerIndex,
              currentTurn: payload.gameTurn ?? state.currentTurn,
              gamePhase: "WAITING_FOR_ROLL",
              isDiceRolled: false, // Ensure dice state is reset
              modal: { type: "NONE" }, // Clear any modals
            };
          }
          console.warn("❌ Player not found:", payload.curPlayer);
          return {}; // No change if player not found
        });
      } else {
        // Handle other generic game state updates
        console.log("📝 Updating game state with payload:", payload);
        get().updateGameState(payload);
      }
    });

    subscribeToTopic("START_GAME_OBSERVE", (message) => {
      console.log("Received game update (START_GAME_OBSERVE):", message);
      get().updateGameState(message.payload);
    });

    subscribeToTopic("TURN_CHANGE", (message) => {
      console.log("Received TURN_CHANGE message:", message);
      const { payload } = message;
      if (payload.currentPlayerIndex !== undefined) {
        console.log("🔄 Turn changing to player index:", payload.currentPlayerIndex);
        console.log("🎮 Setting gamePhase to WAITING_FOR_ROLL");
        set({
          currentPlayerIndex: payload.currentPlayerIndex,
          currentTurn: payload.currentTurn || get().currentTurn,
          gamePhase: "WAITING_FOR_ROLL",
          isDiceRolled: false, // Reset for the next turn
          modal: { type: "NONE" }, // Clear any modals from previous turn
        });
        console.log("✅ Turn change completed. New player index:", payload.currentPlayerIndex);
      }
    });

    subscribeToTopic("USE_DICE", (message) => {
      console.log("Received USE_DICE message:", message);
      const { payload } = message;

      const { diceNum1, diceNum2, diceNumSum, currentPosition, curTurn } = payload;

      set(() => {
        return {
          dice: [diceNum1, diceNum2],
          serverDiceNum: diceNumSum,
          serverCurrentPosition: currentPosition,
          currentTurn: curTurn,
          gamePhase: "DICE_ROLLING", // Trigger animation for all clients
        };
      });
    });

    subscribeToTopic("TRADE_LAND", (message) => {
      console.log("Received TRADE_LAND message:", message);
      const { payload } = message;
      if (payload.players) {
        const serverPlayersMap = payload.players;
        set((state) => {
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

        const { userName, result } = payload;
        if (!result) {
          console.error("🎲 [DRAW_CARD] result가 없습니다!");
          return state;
        }

        const { cardName, effectDescription, moneyChange, newPosition } = result;

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
  },

  disconnect: () => {
    console.log("Game store disconnected.");
  },

  send: (destination: string, body: Record<string, unknown>) => {
    sendMessage(destination, body);
  },

  initializeGame: (initialState: GameInitialState) => {
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
          position: serverPlayer.position, // 서버에서 받은 위치 값 사용
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
    set(newState);
  },
});