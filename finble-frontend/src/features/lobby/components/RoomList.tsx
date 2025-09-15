import React, { useState } from 'react';
import { useLobbyStore } from '../store/useLobbyStore';
import { RoomCard } from './RoomCard';
import { CreateRoomModal } from './CreateRoomModal';
import './RoomList.css';

interface RoomListProps {
  isLoading: boolean;
  error: string | null;
}

export function RoomList({ isLoading, error }: RoomListProps) {
  const rooms = useLobbyStore((state) => state.rooms);
  const fetchRooms = useLobbyStore((state) => state.fetchRooms); // Add this line
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading-message">방 목록을 불러오는 중...</div>;
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    const waitingRooms = rooms.filter(room => room.status === 'waiting');

    if (waitingRooms.length === 0) {
      return (
        <div className="no-rooms-message">
          <p>대기 중인 방이 없습니다.</p>
          <p>새로운 방을 만들어보세요!</p>
        </div>
      );
    }

    return (
      <div className="rooms-grid">
        {waitingRooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    );
  };

  return (
    <>
      <section className="room-list-container">
        <header className="room-list-header">
          <h2>ACTIVE ROOMS</h2>
          <div className="header-actions">
            <button className="refresh-button" onClick={fetchRooms}>REFRESH</button>
            <button className="create-room-button" onClick={() => setIsModalOpen(true)}>
              CREATE ROOM
            </button>
          </div>
        </header>
        {renderContent()}
      </section>
      <CreateRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
