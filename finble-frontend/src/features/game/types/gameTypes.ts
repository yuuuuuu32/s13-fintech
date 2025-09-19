import type { TileData } from "../data/boardData.ts";

export type GamePhase =
  | "WAITING_FOR_ROLL"
  | "DICE_ROLLING"
  | "PLAYER_MOVING"
  | "TILE_ACTION"
  | "WORLD_TRAVEL"
  | "GAME_OVER"
  | "MANAGE_PROPERTY"
  | "WORLD_TRAVEL_MOVE"
  | "SELECTING_ORDER";


export type ModalType =
  | "NONE"
  | "BUY_PROPERTY"
  | "ACQUIRE_PROPERTY"
  | "CHANCE_CARD"
  | "INFO"
  | "JAIL"
  | "EXPO"
  | "MANAGE_PROPERTY"
  | "INSUFFICIENT_FUNDS";

export interface Player {
  id: string;
  name: string;
  money: number;
  position: number;
  character: string;
  properties: number[];
  isInJail: boolean;
  jailTurns: number;
  isTraveling: boolean;
  lapCount: number;
}

export interface EconomicHistory {
  periodName: string;
  effectName: string;
  description: string;
  isBoom: boolean;
  fullName: string;
  salaryMultiplier: number;
  tollMultiplier: number;
  propertyPriceMultiplier: number;
  buildingCostMultiplier: number;
  chanceCardBonusMultiplier: number;
  chanceCardPenaltyMultiplier: number;
  remainingTurns: number;
}

export interface GameInitialState {
  roomId: string;
  playerOrder: string[];
  players: { [key: string]: {
    userId: string;
    nickname: string;
    money: number;
    position: number;
    ownedProperties?: number[];
    inJail: boolean;
    jailTurns: number;
  }};
  currentPlayerIndex: number;
  currentMap: {
    cells: TileData[];
  };
}

export interface GameState {
  gameId: string | null;
  players: Player[];
  board: TileData[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  dice: [number, number];
  dicePower: number;
  winnerId: string | null;
  modal: {
    type: ModalType;
    tile?: TileData;
    text?: string;
    acquireCost?: number;
    toll?: number;
    properties?: { name: string; index: number }[];
    requiredAmount?: number;
    onConfirm?: () => void;
  };
  totalTurns: number;
  currentTurn: number;
  expoLocation: number | null;
  serverDiceNum: number | null;
  serverCurrentPosition: number | null;
  isDiceRolled: boolean;
  economicHistory: EconomicHistory | null;
  initializeGame: (initialState: GameInitialState) => void;
  setDicePower: (power: number) => void;
  rollDice: () => void;
  finishDiceRoll: () => void;
  setIsDiceRolled: (isRolled: boolean) => void;
  movePlayer: (diceValues: [number, number]) => void;
  handleTileAction: () => void;
  buyProperty: () => void;
  acquireProperty: () => void;
  payToll: () => void;
  endTurn: () => void;
  checkGameOver: () => void;
  handleJail: () => void;
  handleInsufficientFundsForToll: (
    requiredAmount: number,
    propertiesToSell: { index: number; price: number }[],
    currentPlayer: Player,
    players: Player[],
    currentPlayerIndex: number,
    tileIndex: number,
    toll: number
  ) => { players: Player[]; modal: { type: string; text: string } } | undefined;
  payBail: () => void;
  selectExpoProperty: (propertyIndex: number) => void;
  startWorldTravelSelection: () => void;
  selectTravelDestination: (tileIndex: number) => void;
  cancelWorldTravel: () => void;
  buildBuilding: (tileIndex: number) => void;
  connect: (gameId: string) => void;
  disconnect: () => void;
  send: (destination: string, body: Record<string, unknown>) => void;
  updateGameState: (newState: Partial<GameState>) => void;
  applyEconomicMultiplier: (baseValue: number, multiplierType: keyof Pick<EconomicHistory, 'salaryMultiplier' | 'tollMultiplier' | 'propertyPriceMultiplier' | 'buildingCostMultiplier' | 'chanceCardBonusMultiplier' | 'chanceCardPenaltyMultiplier'>) => number;
}