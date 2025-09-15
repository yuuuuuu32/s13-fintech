import React, { useEffect } from 'react';
import './LobbyPage.css';
import { UserInfo } from '../components/UserInfo';
import { LobbyHeader } from '../components/LobbyHeader';
import { RoomList } from '../components/RoomList';
import '../../../App.css'; // Import for .app-container
import { useLobbyStore } from '../store/useLobbyStore';
import { useUserStore } from '../../../stores/useUserStore'; // useUserStore를 import 합니다.
// import { connectWebSocket, disconnectWebSocket } from '../../../utils/websocket'; // Import WebSocket functions

export default function LobbyPage() {
  const fetchRooms = useLobbyStore((state) => state.fetchRooms);
  const isLoading = useLobbyStore((state) => state.isLoading);
  const error = useLobbyStore((state) => state.error);
  const subscribeToLobbyUpdates = useLobbyStore(
    (state) => state.subscribeToLobbyUpdates
  );
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo); // fetchUserInfo 함수를 가져옵니다.

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (token) {
      fetchUserInfo(); // 사용자 정보를 가져오는 함수는 그대로 유지

      fetchRooms(); // 로비 진입 시 방 목록은 계속 가져옴
      subscribeToLobbyUpdates(); // 로비 업데이트 구독은 계속 유지

      // 자동 새로고침 설정 (5초마다)
      const intervalId = setInterval(() => {
        fetchRooms();
      }, 5000); // 5초

      // 컴포넌트 언마운트 시 인터벌 해제
      return () => clearInterval(intervalId);
    }
  }, [fetchUserInfo, fetchRooms, subscribeToLobbyUpdates]); // fetchUserInfo는 여전히 의존성 배열에 포함

  return (
    <>
      <LobbyHeader />
      <main className="app-container">
        <div className="lobby-page-wrapper">
          <div className="lobby-page-content">
            <UserInfo />
            <RoomList isLoading={isLoading} error={error} />
          </div>
        </div>
      </main>
    </>
  );
}