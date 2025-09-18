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

    // Capture stack trace for all position changes
    const fullStackTrace = new Error().stack;
    const callChain = fullStackTrace?.split('\n').slice(1, 8).map(line => line.trim()).join(' → ');

    // Track player position changes with comprehensive analysis
    if (newState.players && currentState.players) {
      const currentPlayers = Array.isArray(currentState.players) ? currentState.players : Object.values(currentState.players);
      const newPlayers = Array.isArray(newState.players) ? newState.players : Object.values(newState.players);

      newPlayers.forEach((newPlayer, index) => {
        const currentPlayer = currentPlayers.find(p => p.id === newPlayer.id);
        if (currentPlayer && currentPlayer.position !== newPlayer.position) {
          console.log("📍 [POSITION_CHAIN] Store position change:", {
            timestamp,
            playerId: newPlayer.id,
            playerName: newPlayer.name,
            from: currentPlayer.position,
            to: newPlayer.position,
            source: 'GameStore.wrappedSet',
            gamePhase: currentState.gamePhase,
            currentPlayerIndex: currentState.currentPlayerIndex,
            isCurrentPlayer: currentState.currentPlayerIndex === currentPlayers.findIndex(p => p.id === newPlayer.id),
            callChain
          });

          // CRITICAL: Alert if position becomes 0 unexpectedly
          if (newPlayer.position === 0 && currentPlayer.position !== 0) {
            console.error("🚨 [CRITICAL_CHAIN] Player position reset to 0!", {
              timestamp,
              playerId: newPlayer.id,
              playerName: newPlayer.name,
              from: currentPlayer.position,
              to: newPlayer.position,
              gamePhase: currentState.gamePhase,
              currentPlayerIndex: currentState.currentPlayerIndex,
              modal: currentState.modal,
              callChain,
              fullStackTrace
            });
          }

          // Detect position jumps (non-sequential moves)
          const positionDiff = Math.abs(newPlayer.position - currentPlayer.position);
          if (positionDiff > 12 && newPlayer.position !== 0) { // Large jumps might indicate teleportation
            console.warn("⚠️ [POSITION_CHAIN] Large position jump detected:", {
              timestamp,
              playerId: newPlayer.id,
              playerName: newPlayer.name,
              from: currentPlayer.position,
              to: newPlayer.position,
              positionDiff,
              gamePhase: currentState.gamePhase,
              callChain
            });
          }
        }
      });
    }

    // Log all state changes that might affect positions
    if (newState.gamePhase && newState.gamePhase !== currentState.gamePhase) {
      console.log("🔄 [POSITION_CHAIN] Game phase change:", {
        timestamp,
        from: currentState.gamePhase,
        to: newState.gamePhase,
        callChain
      });
    }

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
  };
});