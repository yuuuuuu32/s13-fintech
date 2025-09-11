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
  const subscribeToLobbyUpdates = useLobbyStore((state) => state.subscribeToLobbyUpdates);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (token) {
      fetchRooms();
      subscribeToLobbyUpdates();
    }
  }, [fetchRooms, subscribeToLobbyUpdates]);

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