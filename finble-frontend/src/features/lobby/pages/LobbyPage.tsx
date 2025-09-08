import { useState } from 'react';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { RoomList } from '../components/RoomList';
import './LobbyPage.css';

export default function LobbyPage() {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1 className="lobby-title">게임 대기방</h1>
        <button
          className="create-room-button"
          onClick={() => setCreateModalOpen(true)}
        >
          방 만들기
        </button>
      </header>
      <main className="lobby-main">
        <RoomList />
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
