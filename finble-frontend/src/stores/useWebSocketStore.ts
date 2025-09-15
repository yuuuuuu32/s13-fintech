import { create } from 'zustand';

interface WebSocketState {
  isConnected: boolean;
  isWebSocketReady: boolean; // WebSocket이 완전히 초기화되었는지 여부
  initialGameState: any | null; // 게임 시작 시 초기 상태 저장
  setIsConnected: (isConnected: boolean) => void;
  setIsWebSocketReady: (isReady: boolean) => void;
  setInitialGameState: (state: any) => void; // 초기 상태 설정
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  isWebSocketReady: false,
  initialGameState: null,
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsWebSocketReady: (isReady) => set({ isWebSocketReady: isReady }),
  setInitialGameState: (state) => set({ initialGameState: state }),
}));