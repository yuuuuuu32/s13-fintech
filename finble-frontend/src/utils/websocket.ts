import { useWebSocketStore } from '../stores/useWebSocketStore';

const getWebSocketUrl = (): string => {
	// 개발 환경(Vite dev server)에서는 프록시 `/ws`를 사용해 동일 출처로 연결
	// 프로덕션 또는 외부 접근 시에는 현재 호스트/프로토콜 기반으로 구성
	const { protocol, host } = window.location;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
	// dev 프록시를 타면 `/ws` 그대로, 그 외엔 호스트:8081/ws 로 시도
	// 로컬 개발 서버(5173 등)에서도 프록시 `/ws`가 설정되어 있으므로 그대로 사용 가능
	if (host.includes('localhost') || host.includes('127.0.0.1')) {
		return `${wsProtocol}//${host}/ws`;
	}
	return `${wsProtocol}//${host}/ws`;
};

const WEBSOCKET_URL = getWebSocketUrl();

let webSocket: WebSocket | null = null; // 순수 WebSocket 객체
let reconnectTimeout: NodeJS.Timeout | null = null;
let connectionQualityMonitor: NodeJS.Timeout | null = null;
let isConnected = false; // 연결 상태 추적
let manualDisconnect = false; // 수동 연결 종료 플래그
let reconnectAttempts = 0; // 재연결 시도 횟수
const MAX_RECONNECT_ATTEMPTS = 5;

export const getWebSocketStatus = (): boolean => {
  return isConnected;
};

// 연결 품질 모니터링 함수
const startConnectionQualityMonitor = () => {
  if (connectionQualityMonitor) {
    clearInterval(connectionQualityMonitor);
  }

  connectionQualityMonitor = setInterval(() => {
    const store = useWebSocketStore.getState();
    const now = Date.now();
    const timeSinceLastMessage = now - store.lastMessageTime;

    // 경제 효과 업데이트 중이면 더 관대한 기준 적용
    const timeout = store.isEconomicUpdateInProgress ? store.heavyOperationTimeout : 15000;

    if (!isConnected) {
      store.setConnectionQuality('disconnected');
    } else if (timeSinceLastMessage > timeout) {
      store.setConnectionQuality('poor');
      console.warn('🔔 [CONNECTION_MONITOR] Poor connection quality detected:', {
        timeSinceLastMessage,
        timeout,
        isEconomicUpdate: store.isEconomicUpdateInProgress
      });
    } else if (timeSinceLastMessage > timeout / 2) {
      store.setConnectionQuality('unstable');
    } else {
      store.setConnectionQuality('good');
    }
  }, 5000); // 5초마다 체크
};

const stopConnectionQualityMonitor = () => {
  if (connectionQualityMonitor) {
    clearInterval(connectionQualityMonitor);
    connectionQualityMonitor = null;
  }
};

// 구독 콜백을 저장할 맵 (메시지 타입별로 여러 콜백이 있을 수 있음)
const subscriptions: { [messageType: string]: ((message: unknown) => void)[] } = {};

export const initializeWebSocket = () => {
  if (webSocket && isConnected) {
    console.log('WebSocket already initialized.');
    return;
  }
  manualDisconnect = false;

  const token = localStorage.getItem('jwt');
  if (!token) {
    console.error('Cannot initialize WebSocket: No JWT token.');
    return;
  }

  const authenticatedUrl = `${WEBSOCKET_URL}?token=${token}`;
  console.log('Initializing WebSocket connection with URL:', authenticatedUrl); // Log the URL with token
  webSocket = new WebSocket(authenticatedUrl);

  webSocket.onopen = () => {
    const timestamp = new Date().toISOString();
    console.log('🔌 [SERVER_AUDIT] WebSocket connection established:', {
      timestamp,
      url: authenticatedUrl.replace(/token=[^&]+/, 'token=***'),
      connectionId: Math.random().toString(36).substr(2, 9),
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' → ')
    });

    isConnected = true;
    reconnectAttempts = 0; // 재연결 성공 시 카운터 리셋
    const store = useWebSocketStore.getState();
    store.setIsConnected(true);
    store.setIsWebSocketReady(true);
    store.setConnectionQuality('good');
    store.updateLastMessageTime();

    // 연결 품질 모니터링 시작
    startConnectionQualityMonitor();

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  webSocket.onmessage = (event) => {
    const timestamp = new Date().toISOString();

    // 메시지 수신 시 마지막 메시지 시간 업데이트
    useWebSocketStore.getState().updateLastMessageTime();

    console.log('🌐 [WEBSOCKET_INTERCEPTOR] RAW MESSAGE RECEIVED:', {
      timestamp,
      rawData: event.data,
      dataLength: event.data?.length || 0
    });

    try {
      const parsedMessage = JSON.parse(event.data as string);
      const messageType = parsedMessage.type;

      // COMPREHENSIVE MESSAGE LOGGING
      console.log('📨 [WEBSOCKET_INTERCEPTOR] PARSED MESSAGE:', {
        timestamp,
        messageType,
        fullPayload: JSON.stringify(parsedMessage, null, 2),
        hasPlayers: !!(parsedMessage.payload && parsedMessage.payload.players),
        hasPosition: !!(parsedMessage.payload && (parsedMessage.payload.position !== undefined || parsedMessage.payload.currentPosition !== undefined)),
        payloadKeys: parsedMessage.payload ? Object.keys(parsedMessage.payload) : [],
        isSubscribed: !!subscriptions[messageType]
      });

      // Check if message contains player position data
      if (parsedMessage.payload && parsedMessage.payload.players) {
        const players = parsedMessage.payload.players;
        const playersArray = Array.isArray(players) ? players : Object.values(players);
        console.log("📍 [WEBSOCKET_INTERCEPTOR] PLAYER POSITION DATA:", {
          timestamp,
          messageType,
          playerCount: playersArray.length,
          positions: playersArray.map(p => ({
            playerId: p.userId || p.id,
            nickname: p.nickname || p.name,
            position: p.position,
            money: p.money
          }))
        });
      }

      // Check for individual position updates
      if (parsedMessage.payload && (parsedMessage.payload.position !== undefined || parsedMessage.payload.currentPosition !== undefined)) {
        console.log("📍 [WEBSOCKET_INTERCEPTOR] INDIVIDUAL POSITION UPDATE:", {
          timestamp,
          messageType,
          position: parsedMessage.payload.position,
          currentPosition: parsedMessage.payload.currentPosition,
          userName: parsedMessage.payload.userName,
          curPlayer: parsedMessage.payload.curPlayer,
          fullPayload: parsedMessage.payload
        });
      }

      // Log ANY message that might cause state changes
      if (messageType && ['GAME_STATE_CHANGE', 'TURN_CHANGE', 'USE_DICE', 'TRADE_LAND', 'START_GAME_OBSERVE', 'PLAYER_UPDATE', 'POSITION_UPDATE'].includes(messageType)) {
        console.log("🚨 [WEBSOCKET_INTERCEPTOR] CRITICAL STATE MESSAGE:", {
          timestamp,
          messageType,
          criticalData: {
            curPlayer: parsedMessage.payload?.curPlayer,
            currentPlayerIndex: parsedMessage.payload?.currentPlayerIndex,
            players: parsedMessage.payload?.players ? Object.keys(parsedMessage.payload.players) : 'none',
            position: parsedMessage.payload?.position,
            currentPosition: parsedMessage.payload?.currentPosition
          }
        });
      }

      // 찬스카드 관련 메시지 특별 로깅
      if (messageType.includes('CARD') || messageType.includes('CHANCE') || messageType.includes('DRAW')) {
        console.log('🎲 CHANCE/CARD related message detected:', parsedMessage);
      }

      if (subscriptions[messageType]) {
        console.log(`🎯 [WEBSOCKET_INTERCEPTOR] DISPATCHING to ${subscriptions[messageType].length} subscribers for: ${messageType}`);
        subscriptions[messageType].forEach(callback => callback(parsedMessage));
      } else {
        console.warn(`❌ [WEBSOCKET_INTERCEPTOR] NO SUBSCRIPTION for message type: ${messageType}`, {
          timestamp,
          messageType,
          payload: parsedMessage.payload,
          availableSubscriptions: Object.keys(subscriptions)
        });
      }
    } catch (e) {
      console.error('🚨 [WEBSOCKET_INTERCEPTOR] ERROR parsing message:', {
        timestamp,
        error: e,
        rawData: event.data
      });
    }
  };

  webSocket.onclose = (event) => {
    const timestamp = new Date().toISOString();
    console.log('🔌 [SERVER_AUDIT] WebSocket disconnected:', {
      timestamp,
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      manualDisconnect,
      reconnectAttempts,
      willReconnect: !manualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' → ')
    });

    isConnected = false;
    const store = useWebSocketStore.getState();
    store.setIsConnected(false);
    store.setIsWebSocketReady(false);
    store.setConnectionQuality('disconnected');

    // 연결 품질 모니터링 중지
    stopConnectionQualityMonitor();

    // 경제 효과 업데이트 중이었다면 상태 리셋
    if (store.isEconomicUpdateInProgress) {
      console.warn('🔄 [CONNECTION] Economic update was in progress during disconnect');
      store.setEconomicUpdateInProgress(false);
    }

    if (!manualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      if (!reconnectTimeout) {
        reconnectAttempts++;
        const delay = Math.min(5000 * reconnectAttempts, 30000); // 점진적 지연 (최대 30초)

        reconnectTimeout = setTimeout(() => {
          console.log('🔄 [SERVER_AUDIT] Attempting WebSocket reconnection...', {
            timestamp: new Date().toISOString(),
            attemptNumber: reconnectAttempts,
            maxAttempts: MAX_RECONNECT_ATTEMPTS
          });
          initializeWebSocket();
        }, delay);
      }
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('🚨 [CONNECTION] Max reconnection attempts reached. Manual intervention required.');
      // 여기서 사용자에게 알림을 보낼 수 있음
    }
  };

  webSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    // onclose가 자동으로 호출되어 재연결을 처리합니다.
  };
};

export const disconnectWebSocket = () => {
  if (webSocket) {
    manualDisconnect = true;
    webSocket.close();
    webSocket = null;
    isConnected = false;
    useWebSocketStore.getState().setIsConnected(false);
    useWebSocketStore.getState().setIsWebSocketReady(false); // WebSocket 준비 상태 초기화
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    console.log('WebSocket manually disconnected.');
  }
};

export const subscribeToTopic = (messageType: string, callback: (message: unknown) => void): (() => void) => {
  if (!subscriptions[messageType]) {
    subscriptions[messageType] = [];
  }
  subscriptions[messageType].push(callback);
  console.log(`Subscribing to message type: ${messageType} (pure WebSocket simulation)`);

  const unsubscribe = () => {
    if (subscriptions[messageType]) {
      subscriptions[messageType] = subscriptions[messageType].filter(cb => cb !== callback);
      if (subscriptions[messageType].length === 0) {
        delete subscriptions[messageType];
      }
      console.log(`Unsubscribed from message type: ${messageType}`);
    }
  };
  return unsubscribe;
};

export const sendMessage = (destination: string, body: unknown) => {
  const timestamp = new Date().toISOString();
  const fullStackTrace = new Error().stack;
  const callChain = fullStackTrace?.split('\n').slice(1, 6).map(line => line.trim()).join(' → ');

  if (!webSocket || !isConnected) {
    console.warn('🚨 [SERVER_AUDIT] WebSocket not connected - message blocked:', {
      timestamp,
      destination,
      body,
      callChain
    });
    return;
  }

  console.log("📤 [SERVER_AUDIT] OUTGOING MESSAGE:", {
    timestamp,
    destination,
    messageType: body.type,
    fullPayload: JSON.stringify(body, null, 2),
    hasPosition: !!(body.payload && (body.payload.position !== undefined || body.payload.currentPosition !== undefined)),
    isPositionRelated: destination.includes('roll-dice') || destination.includes('end-turn') || destination.includes('move') || body.type?.includes('POSITION'),
    callChain,
    connectionStatus: isConnected
  });

  try {
    webSocket.send(JSON.stringify(body));
    console.log("✅ [SERVER_AUDIT] Message sent successfully:", {
      timestamp,
      destination,
      messageType: body.type,
      size: JSON.stringify(body).length
    });
  } catch (error) {
    console.error("❌ [SERVER_AUDIT] Failed to send message:", {
      timestamp,
      destination,
      messageType: body.type,
      error,
      callChain
    });
  }
};