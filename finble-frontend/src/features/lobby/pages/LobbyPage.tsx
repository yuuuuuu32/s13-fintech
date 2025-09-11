import React from 'react';
import './LobbyPage.css';
import { UserInfo } from '../components/UserInfo';
import { LobbyHeader } from '../components/LobbyHeader';
import { RoomList } from '../components/RoomList';
import '../../../App.css'; // Import for .app-container

export default function LobbyPage() {
  return (
    <>
      <LobbyHeader />
      <main className="app-container">
        <div className="lobby-page-wrapper">
          <div className="lobby-page-content">
            <UserInfo />
            <RoomList />
          </div>
        </div>
      </main>
    </>
  );
}
