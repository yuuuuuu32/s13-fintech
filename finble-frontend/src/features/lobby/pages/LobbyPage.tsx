import React, { useEffect } from 'react';
import './LobbyPage.css';
import { UserInfo } from '../components/UserInfo';
import { LobbyHeader } from '../components/LobbyHeader';
import { RoomList } from '../components/RoomList';
import '../../../App.css'; // Import for .app-container
import { useLobbyStore } from '../store/useLobbyStore';
import { useUserStore } from '../../../stores/useUserStore'; // useUserStore를 import 합니다.
import bgImage from '../../../assets/lobby_background.png';
// import { connectWebSocket, disconnectWebSocket } from '../../../utils/websocket'; // Import WebSocket functions

// 0. 로비 css 디자인
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
    {/* 1. 헤더 디자인 */}
      <LobbyHeader />
      <main className="app-container">
        <div 
        className="lobby-page-wrapper"
          style={
            {
              // CSS 변수에 이미지 URL 주입
              // 타입스크립트일 때 캐스팅 필요
              '--bg-url': `url(${bgImage})`,
            } as React.CSSProperties
          }
        >
          <div className="lobby-page-content">



            {/* 2. 유저 정보 디자인 */}
            <UserInfo />
            {/* 3. 방정보 디자인 */}
            <RoomList isLoading={isLoading} error={error} />
          </div>
        </div>
      </main>
    </>
  );
}