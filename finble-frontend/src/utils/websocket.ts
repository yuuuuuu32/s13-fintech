import { useWebSocketStore } from '../stores/useWebSocketStore';

const WEBSOCKET_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`; // 백엔드 WebSocket 주소

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