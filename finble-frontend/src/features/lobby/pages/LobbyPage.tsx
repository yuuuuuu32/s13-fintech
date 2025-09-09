import React, { useState } from 'react';
import './LobbyPage.css';
import { UserInfo } from '../components/UserInfo';
import { LobbyHeader } from '../components/LobbyHeader';
import { RoomList } from '../components/RoomList';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { MatrixRain } from '../components/MatrixRain';

export default function LobbyPage() {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="cyberpunk-lobby">
      <MatrixRain />

      <aside className="lobby-sidebar">
        <UserInfo />
      </aside>

      <main className="lobby-main">
        <LobbyHeader onCreateRoom={() => setCreateModalOpen(true)} />
        <RoomList />
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}