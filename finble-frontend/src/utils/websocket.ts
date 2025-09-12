// import * as Stomp from 'stompjs'; // StompJS 임포트 제거
// import { IMessage } from 'stompjs'; // IMessage 임포트 제거

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

// ... (다른 함수들)

export const getWebSocketStatus = (): boolean => {
  return isConnected;
};

// 구독 콜백을 저장할 맵 (메시지 타입별로 여러 콜백이 있을 수 있음)
const subscriptions: { [messageType: string]: ((message: any) => void)[] } = {};

interface WebSocketCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onMessage: (messageType: string, message: any) => void; // 이제 messageType도 전달
}

export const connectWebSocket = (callbacks: WebSocketCallbacks) => {
  if (webSocket && isConnected) {
    console.log('Already connected to WebSocket.');
    callbacks.onConnect(); // 이미 연결되어 있다면 바로 onConnect 호출
    return;
  }

  const token = localStorage.getItem('jwt');
  if (!token) {
    console.error('WebSocket connection failed: No JWT token found.');
    callbacks.onDisconnect(); // 토큰이 없으면 연결 실패 처리
    return;
  }

  // WebSocket URL에 토큰을 쿼리 파라미터로 추가
  const authenticatedUrl = `${WEBSOCKET_URL}?token=${token}`;
  
  console.log('Connecting to WebSocket with authentication...');
  webSocket = new WebSocket(authenticatedUrl);

  webSocket.onopen = () => {
    console.log('WebSocket connected.');
    isConnected = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    callbacks.onConnect();

    // 연결 성공 후, 이전에 구독했던 메시지 타입들을 다시 구독 (필요시)
    // 순수 WebSocket에서는 토픽 재구독 개념이 없으므로, 메시지 핸들러를 다시 설정하는 것으로 대체
    // 또는 백엔드에서 연결 시 모든 구독 정보를 다시 보내주는 방식이 필요
  };

  webSocket.onmessage = (event) => {
    console.log('Received raw WebSocket message:', event.data); // 원본 메시지 출력
    try {
      const parsedMessage = JSON.parse(event.data as string);
      // 백엔드에서 메시지에 'type' 필드를 포함하여 보내준다고 가정
      const messageType = parsedMessage.type; // 백엔드와 협의 필요
      callbacks.onMessage(messageType, parsedMessage);

      // 구독된 메시지 타입에 대한 콜백 호출
      if (subscriptions[messageType]) {
        subscriptions[messageType].forEach(callback => callback(parsedMessage));
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  webSocket.onclose = (event) => {
    console.log('WebSocket disconnected:', event);
    isConnected = false;
    callbacks.onDisconnect();
    // Reconnect after a delay
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket(callbacks);
      }, 5000); // Reconnect after 5 seconds
    }
  };

  webSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    isConnected = false;
    callbacks.onDisconnect();
    // 에러 발생 시에도 재연결 시도
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket after error...');
        connectWebSocket(callbacks);
      }, 5000);
    }
  };
};

export const disconnectWebSocket = () => {
  if (webSocket && isConnected) {
    webSocket.close();
    console.log('WebSocket disconnected.');
    isConnected = false;
    webSocket = null;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  } else {
    console.log('WebSocket is not connected, no need to disconnect.');
    webSocket = null;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }
};

export const subscribeToTopic = (messageType: string, callback: (message: any) => void): (() => void) => {
  // 순수 WebSocket은 STOMP처럼 토픽 구독 개념이 없음.
  // 백엔드에서 메시지에 토픽 정보를 포함하여 보내주고, 프론트엔드에서 필터링해야 함.
  // 여기서는 단순히 콜백을 저장하고, onmessage에서 해당 메시지 타입 수신 시 호출하도록 구현.
  if (!subscriptions[messageType]) {
    subscriptions[messageType] = [];
  }
  subscriptions[messageType].push(callback);
  console.log(`Subscribing to message type: ${messageType} (pure WebSocket simulation)`);

  // 구독을 해제할 수 있는 함수 반환
  const unsubscribe = () => {
    if (subscriptions[messageType]) {
      subscriptions[messageType] = subscriptions[messageType].filter(cb => cb !== callback);
      if (subscriptions[messageType].length === 0) {
        delete subscriptions[messageType]; // 더 이상 구독자가 없으면 메시지 타입 제거
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
  // 백엔드가 최상위 type과 payload를 기대하므로, body를 그대로 보냄
  // destination은 WebSocket 경로로만 사용하고 메시지 본문에는 포함하지 않음
  console.log(`Sending message to ${destination}: `, body);
  webSocket.send(JSON.stringify(body)); // body를 직접 보냄
};