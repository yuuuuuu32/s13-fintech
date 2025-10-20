import { create } from "zustand";

import type { GameState, Player } from "../types/gameTypes.ts";
import { createWebSocketHandlers } from "../handlers/websocketHandlers.ts";
import { createGameLogicHandlers } from "../handlers/gameLogicHandlers.ts";
import { createPlayerActions } from "../handlers/playerHandlers.ts";
import { createSpecialLandHandlers } from "../handlers/specialLandHandlers.ts";
import { handleInsufficientFundsForToll } from "../handlers/tileHandlers.ts";

export const useGameStore = create<GameState>()((set, get) => {
  // Wrap set function to track player position changes
  const wrappedSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
    return set(partial);
  };

  const websocketHandlers = createWebSocketHandlers(wrappedSet, get);
  const gameLogicHandlers = createGameLogicHandlers(wrappedSet, get);
  const playerActions = createPlayerActions(wrappedSet, get);
  const specialLandHandlers = createSpecialLandHandlers(wrappedSet, get);

  return {
    // 초기 상태
    gameId: null,
    players: [],
    board: [],
    currentPlayerIndex: 0,
    gamePhase: "WAITING_FOR_ROLL",
    dice: [1, 1],
    dicePower: 0,
    winnerId: null,
    modal: { type: "NONE" },
    totalTurns: 20,
    currentTurn: 1,
    expoLocation: null,
    serverDiceNum: null,
    serverCurrentPosition: null,
    isDiceRolled: false,
    economicHistory: null,
    lastEconomicModalTurn: null,
    lastSalaryBonus: 0,
    toastMessages: [],
    isProcessingChanceCard: false, // 찬스카드 처리 중복 방지
    isUpdatingPosition: false, // 위치 업데이트 진행 중 플래그
    syncErrorCount: 0, // 동기화 오류 횟수
    lastSyncCheck: 0, // 마지막 동기화 확인 시간
    pendingTileCost: null, // 백엔드에서 전달된 통행료/인수 비용 (타일 처리 전 보관)

    // 웹소켓 관련 메서드
    connect: websocketHandlers.connect,
    disconnect: websocketHandlers.disconnect,
    send: websocketHandlers.send,
    initializeGame: websocketHandlers.initializeGame,
    updateGameState: websocketHandlers.updateGameState,
    checkSyncStatus: websocketHandlers.checkSyncStatus,
    requestFullSync: websocketHandlers.requestFullSync,
    cleanupMemory: websocketHandlers.cleanupMemory,

    // 게임 로직 메서드
    setDicePower: gameLogicHandlers.setDicePower,
    rollDice: gameLogicHandlers.rollDice,
    finishDiceRoll: gameLogicHandlers.finishDiceRoll,
    setIsDiceRolled: gameLogicHandlers.setIsDiceRolled,
    movePlayer: gameLogicHandlers.movePlayer,
    handleTileAction: gameLogicHandlers.handleTileAction,
    endTurn: gameLogicHandlers.endTurn,
    checkGameOver: gameLogicHandlers.checkGameOver,

    // 플레이어 액션 메서드
    buyProperty: playerActions.buyProperty,
    buyPropertyWithItems: playerActions.buyPropertyWithItems,
    acquireProperty: playerActions.acquireProperty,
    payToll: playerActions.payToll,
    handleJail: playerActions.handleJail,
    payBail: playerActions.payBail,
    selectExpoProperty: playerActions.selectExpoProperty,
    startWorldTravelSelection: playerActions.startWorldTravelSelection,
    selectTravelDestination: playerActions.selectTravelDestination,
    cancelWorldTravel: playerActions.cancelWorldTravel,
    buildBuilding: playerActions.buildBuilding,

    // 스페셜 땅 관련 메서드
    isSpecialLand: specialLandHandlers.isSpecialLand,
    buySpecialLand: specialLandHandlers.buySpecialLand,
    paySpecialLandToll: specialLandHandlers.paySpecialLandToll,
    checkSpecialLandMonopoly: specialLandHandlers.checkSpecialLandMonopoly,
    handleSpecialLandInteraction: specialLandHandlers.handleSpecialLandInteraction,


    // 기타 유틸리티 메서드
    handleInsufficientFundsForToll: (
      requiredAmount: number,
      propertiesToSell: { index: number; price: number }[],
      currentPlayer: Player,
      players: Player[],
      currentPlayerIndex: number,
      tileIndex: number,
      toll: number
    ) => {
      return handleInsufficientFundsForToll(
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
    },

    // 경제역사 배수 적용 함수
    applyEconomicMultiplier: (baseValue: number, multiplierType: keyof Pick<import("../types/gameTypes.ts").EconomicHistory, 'salaryMultiplier' | 'tollMultiplier' | 'propertyPriceMultiplier' | 'buildingCostMultiplier' | 'chanceCardBonusMultiplier' | 'chanceCardPenaltyMultiplier'>) => {
      const economicHistory = get().economicHistory;

      if (!economicHistory) {
        return baseValue; // 경제역사 정보가 없으면 기본값 반환
      }

      const multiplier = economicHistory[multiplierType];

      if (typeof multiplier !== 'number' || isNaN(multiplier)) {
        console.error("❌ [ECONOMIC_MULTIPLIER] 잘못된 배수 값:", { multiplierType, multiplier });
        return baseValue;
      }

      const result = Math.round(baseValue * multiplier);
      return result;
    },

    // 토스트 메시지 관리
    addToast: (type, title, message, duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const toast = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: Date.now()
      };

      set((state) => ({
        toastMessages: [...state.toastMessages, toast]
      }));

      // 자동 제거
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    },

    removeToast: (id) => {
      set((state) => ({
        toastMessages: state.toastMessages.filter(toast => toast.id !== id)
      }));
    },
  };
});
