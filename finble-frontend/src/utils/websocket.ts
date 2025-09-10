import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import { IMessage } from 'stompjs';

const WEBSOCKET_URL = 'http://localhost:8081/ws'; // Backend WebSocket endpoint

let stompClient: Stomp.Client | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

interface WebSocketCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onMessage: (topic: string, message: any) => void;
}

export const connectWebSocket = (callbacks: WebSocketCallbacks) => {
  if (stompClient && stompClient.connected) {
    console.log('Already connected to WebSocket.');
    return;
  }

  console.log('Connecting to WebSocket...');
  const socket = new SockJS(WEBSOCKET_URL);
  stompClient = Stomp.over(socket);

  stompClient.connect(
    {},
    () => {
      console.log('WebSocket connected.');
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      callbacks.onConnect();
    },
    (error: any) => {
      console.error('WebSocket connection error:', error);
      callbacks.onDisconnect();
      // Reconnect after a delay
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connectWebSocket(callbacks);
        }, 5000); // Reconnect after 5 seconds
      }
    }
  );
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.disconnect(() => {
      console.log('WebSocket disconnected.');
      stompClient = null;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    });
  }
};

export const subscribeToTopic = (topic: string, callback: (message: any) => void) => {
  if (!stompClient || !stompClient.connected) {
    console.warn('WebSocket not connected. Cannot subscribe to topic:', topic);
    return;
  }
  console.log(`Subscribing to topic: ${topic}`);
  stompClient.subscribe(topic, (message: IMessage) => {
    try {
      const parsedMessage = JSON.parse(message.body);
      callback(parsedMessage);
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  });
};

export const sendMessage = (destination: string, body: any) => {
  if (!stompClient || !stompClient.connected) {
    console.warn('WebSocket not connected. Cannot send message to:', destination);
    return;
  }
  console.log(`Sending message to ${destination}: `, body);
  stompClient.send(destination, {}, JSON.stringify(body));
};