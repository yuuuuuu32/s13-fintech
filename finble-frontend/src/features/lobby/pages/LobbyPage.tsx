import { useState } from 'react';
import { MatrixRain } from '../components/MatrixRain';
import { UserInfo } from '../components/UserInfo';
import { RoomList } from '../components/RoomList';
import { LobbyHeader } from '../components/LobbyHeader';
import { CreateRoomModal } from '../components/CreateRoomModal';
import './LobbyPage.css';

export default function LobbyPage() {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const sampleRooms = [
    { name: "NEON WARRIORS", status: "waiting", players: 3, maxPlayers: 8, map: "Neo Tokyo", mode: "Battle Royale" },
    { name: "CYBER ARENA", status: "in-game", players: 6, maxPlayers: 6, map: "Digital Grid", mode: "Team DM" },
    { name: "MATRIX ZONE", status: "waiting", players: 1, maxPlayers: 4, map: "Data Core", mode: "CTF" },
    { name: "NEON CITY", status: "waiting", players: 2, maxPlayers: 8, map: "Chrome District", mode: "Battle Royale" },
    { name: "CYBER SPACE", status: "in-game", players: 4, maxPlayers: 4, map: "Virtual Void", mode: "Team DM" },
  ];

  return (
    <div className="cyberpunk-lobby">
      <MatrixRain />
      
      {/* Sidebar - 유저 정보만, 길게 확장 */}
      <aside className="lobby-sidebar">
        <UserInfo />
      </aside>

      {/* Main Content - 헤더 + 방 목록 */}
      <main className="lobby-main">
        <div className="header-container">
          <h1 className="title">CYBER LOBBY</h1>
          <div className="header-buttons">
            <button 
              className="quick-button"
              onClick={() => alert("Quick Jack-In clicked!")}
            >
              <span>⚡ QUICK JACK-IN</span>
            </button>
            <button 
              className="create-button"
              onClick={() => setCreateModalOpen(true)}
            >
              <span>+ CREATE ROOM</span>
            </button>
          </div>
        </div>
        <RoomList rooms={sampleRooms} />
      </main>

      {/* 방 생성 모달 */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}