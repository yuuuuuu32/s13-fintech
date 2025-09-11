import React, { useEffect } from 'react';
import './LobbyPage.css';
import { UserInfo } from '../components/UserInfo';
import { LobbyHeader } from '../components/LobbyHeader';
import { RoomList } from '../components/RoomList';
import '../../../App.css'; // Import for .app-container
import { useLobbyStore } from '../store/useLobbyStore';

export default function LobbyPage() {
  const fetchRooms = useLobbyStore((state) => state.fetchRooms);
  const isLoading = useLobbyStore((state) => state.isLoading);
  const error = useLobbyStore((state) => state.error);

  useEffect(() => {
    // 로그인하지 않은 상태에서는 토큰이 없으므로, 토큰이 있을 때만 방 목록을 가져옵니다.
    const token = localStorage.getItem('jwt');
    if (token) {
      fetchRooms();
    }
  }, [fetchRooms]);

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