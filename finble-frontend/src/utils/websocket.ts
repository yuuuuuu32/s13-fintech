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
let isConnected = false; // 연결 상태 추적
let manualDisconnect = false; // 수동 연결 종료 플래그

export const getWebSocketStatus = (): boolean => {
  return isConnected;
};

// 구독 콜백을 저장할 맵 (메시지 타입별로 여러 콜백이 있을 수 있음)
const subscriptions: { [messageType: string]: ((message: any) => void)[] } = {};

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
    console.log('WebSocket connection established.');
    isConnected = true;
    useWebSocketStore.getState().setIsConnected(true);
    useWebSocketStore.getState().setIsWebSocketReady(true); // WebSocket 준비 완료 상태 설정
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  webSocket.onmessage = (event) => {
    console.log('Received raw WebSocket message:', event.data);
    try {
      const parsedMessage = JSON.parse(event.data as string);
      const messageType = parsedMessage.type;

      console.log(`Received message of type: ${messageType}`);

      if (subscriptions[messageType]) {
        subscriptions[messageType].forEach(callback => callback(parsedMessage));
      } else {
        console.log(`No subscription found for message type: ${messageType}`);
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  webSocket.onclose = (event) => {
    console.log('WebSocket disconnected:', event);
    isConnected = false;
    useWebSocketStore.getState().setIsConnected(false);
    useWebSocketStore.getState().setIsWebSocketReady(false); // WebSocket 준비 상태 초기화
    if (!manualDisconnect) { // 수동 종료가 아닐 경우에만 재연결
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          initializeWebSocket();
        }, 5000);
      }
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

export const subscribeToTopic = (messageType: string, callback: (message: any) => void): (() => void) => {
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

export const sendMessage = (destination: string, body: any) => {
  if (!webSocket || !isConnected) {
    console.warn('WebSocket not connected. Cannot send message to:', destination);
    return;
  }
  console.log(`Sending message to ${destination}: `, body);
  webSocket.send(JSON.stringify(body));
};