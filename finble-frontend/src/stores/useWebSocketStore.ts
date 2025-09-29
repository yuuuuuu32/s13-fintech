import { create } from 'zustand';

interface WebSocketState {
  isConnected: boolean;
  isWebSocketReady: boolean; // WebSocket이 완전히 초기화되었는지 여부
  initialGameState: unknown | null; // 게임 시작 시 초기 상태 저장
  gameInitialized: boolean; // 게임이 한 번 초기화되었는지 여부
  connectionQuality: 'good' | 'unstable' | 'poor' | 'disconnected'; // 연결 품질 상태
  lastMessageTime: number; // 마지막 메시지 수신 시간
  isEconomicUpdateInProgress: boolean; // 경제 효과 업데이트 진행 중 여부
  heavyOperationTimeout: number; // 무거운 작업용 타임아웃 (ms)
  setIsConnected: (isConnected: boolean) => void;
  setIsWebSocketReady: (isReady: boolean) => void;
  setInitialGameState: (state: unknown) => void; // 초기 상태 설정
  setGameInitialized: (initialized: boolean) => void; // 게임 초기화 상태 설정
  setConnectionQuality: (quality: 'good' | 'unstable' | 'poor' | 'disconnected') => void;
  updateLastMessageTime: () => void;
  setEconomicUpdateInProgress: (inProgress: boolean) => void;
  setHeavyOperationTimeout: (timeout: number) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  isWebSocketReady: false,
  initialGameState: null,
  gameInitialized: false,
  connectionQuality: 'disconnected',
  lastMessageTime: Date.now(),
  isEconomicUpdateInProgress: false,
  heavyOperationTimeout: 30000, // 기본 30초
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsWebSocketReady: (isReady) => set({ isWebSocketReady: isReady }),
  setInitialGameState: (state) => set({ initialGameState: state }),
  setGameInitialized: (initialized) => set({ gameInitialized: initialized }),
  setConnectionQuality: (quality) => set({ connectionQuality: quality }),
  updateLastMessageTime: () => set({ lastMessageTime: Date.now() }),
  setEconomicUpdateInProgress: (inProgress) => set({ isEconomicUpdateInProgress: inProgress }),
  setHeavyOperationTimeout: (timeout) => set({ heavyOperationTimeout: timeout }),
}));