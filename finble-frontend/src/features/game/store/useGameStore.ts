import { create } from "zustand";

import type { GameState, Player } from "../types/gameTypes.ts";
import { createWebSocketHandlers } from "../handlers/websocketHandlers.ts";
import { createGameLogicHandlers } from "../handlers/gameLogicHandlers.ts";
import { createPlayerActions } from "../handlers/playerHandlers.ts";
import { handleInsufficientFundsForToll } from "../handlers/tileHandlers.ts";

export const useGameStore = create<GameState>()((set, get) => {
  // Wrap set function to track player position changes
  const wrappedSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
    const currentState = get();
    const newState = typeof partial === 'function' ? partial(currentState) : partial;
    const timestamp = new Date().toISOString();



    return set(partial);
  };

  const websocketHandlers = createWebSocketHandlers(wrappedSet, get);
  const gameLogicHandlers = createGameLogicHandlers(wrappedSet, get);
  const playerActions = createPlayerActions(wrappedSet, get);

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

    // 웹소켓 관련 메서드
    connect: websocketHandlers.connect,
    disconnect: websocketHandlers.disconnect,
    send: websocketHandlers.send,
    initializeGame: websocketHandlers.initializeGame,
    updateGameState: websocketHandlers.updateGameState,

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
        console.log("⚠️ [ECONOMIC_MULTIPLIER] 경제역사 정보 없음, 기본값 사용:", {
          baseValue,
          multiplierType,
          result: baseValue
        });
        return baseValue; // 경제역사 정보가 없으면 기본값 반환
      }

      const multiplier = economicHistory[multiplierType];
      const result = Math.round(baseValue * multiplier);

      console.log("📊 [ECONOMIC_MULTIPLIER] 경제역사 배수 적용:", {
        baseValue,
        multiplierType,
        multiplier,
        result,
        economicPeriod: economicHistory.fullName,
        isBoom: economicHistory.isBoom
      });

      return result;
    },
  };
});