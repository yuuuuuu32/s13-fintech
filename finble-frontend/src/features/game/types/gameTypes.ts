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
  | "BUY_SPECIAL_LAND"
  | "ACQUIRE_PROPERTY"
  | "CHANCE_CARD"
  | "INFO"
  | "JAIL"
  | "EXPO"
  | "MANAGE_PROPERTY"
  | "INSUFFICIENT_FUNDS"
  | "NTS";

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
  totalAsset?: number; // 백엔드에서 계산된 총자산 (totalasset)
}

export interface ToastMessage {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  duration?: number; // ms, 기본값 3000
  timestamp: number;
}

export interface EconomicHistory {
  periodName: string;
  effectName: string;
  description: string;
  isBoom: boolean;
  fullName: string;
  remainingTurns: number;
  // 백엔드에서 전송되는 배수 정보 (선택적)
  salaryMultiplier?: number;
  tollMultiplier?: number;
  propertyPriceMultiplier?: number;
  buildingCostMultiplier?: number;
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
    isPaidToll?: boolean;
    properties?: { name: string; index: number }[];
    requiredAmount?: number;
    taxAmount?: number; // 국세청 세금 금액
    onConfirm?: () => void;
  };
  totalTurns: number;
  currentTurn: number;
  expoLocation: number | null;
  serverDiceNum: number | null;
  serverCurrentPosition: number | null;
  isDiceRolled: boolean;
  economicHistory: EconomicHistory | null;
  lastEconomicModalTurn: number | null; // 마지막으로 경제 효과 모달을 표시한 턴
  lastSalaryBonus: number; // 마지막 주사위 굴리기에서 받은 월급 보너스
  toastMessages: ToastMessage[]; // 토스트 메시지 배열
  isUpdatingPosition: boolean; // 위치 업데이트 진행 중 플래그 (동시성 제어)
  syncErrorCount: number; // 동기화 오류 발생 횟수
  lastSyncCheck: number; // 마지막 동기화 확인 시간 (timestamp)
  lastProcessedDiceMessage?: string; // 마지막으로 처리된 주사위 메시지 키 (중복 방지)
  pendingTileCost: {
    tollAmount?: number;
    acquisitionCost?: number;
  } | null; // 백엔드에서 전달된 통행료/인수 비용 정보 (타일 액션 시 1회용)
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
  addToast: (type: ToastMessage["type"], title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}
