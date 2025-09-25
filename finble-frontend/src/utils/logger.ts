// 환경별 로깅 유틸리티
const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  // 개발 전용 로깅
  dev: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // 위치 동기화 관련 로깅 (항상 표시하되 프로덕션에서는 간소화)
  position: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`🎯 [POSITION] ${message}`, data);
    } else {
      // 프로덕션에서는 중요한 위치 정보만 간략히
      if (message.includes('감지') || message.includes('보정') || message.includes('오류')) {
        console.log(`🎯 ${message}`);
      }
    }
  },

  // WebSocket 메시지 로깅
  websocket: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`📥 [WS] ${message}`, data);
    }
  },

  // 게임 로직 로깅
  game: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`🎮 [GAME] ${message}`, data);
    }
  },

  // 오류 및 경고 (항상 표시)
  error: (message: string, data?: unknown) => {
    console.error(`❌ [ERROR] ${message}`, data);
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },

  // 동기화 관련 (중요하므로 항상 표시)
  sync: (message: string, data?: unknown) => {
    console.log(`🔄 [SYNC] ${message}`, data);
  }
};