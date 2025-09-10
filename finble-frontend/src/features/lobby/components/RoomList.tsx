import React, { useState } from 'react';
import { useLobbyStore } from '../store/useLobbyStore';
import { RoomCard } from './RoomCard';
import { CreateRoomModal } from './CreateRoomModal';
import './RoomList.css';

export function RoomList() {
  const rooms = useLobbyStore((state) => state.rooms);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="room-list-container">
        <header className="room-list-header">
          <h2>ACTIVE ROOMS</h2>
          <div className="header-actions">
            <button className="quick-join-button">QUICK JOIN</button>
            <button className="create-room-button" onClick={() => setIsModalOpen(true)}>
              CREATE ROOM
            </button>
          </div>
        </header>
        {rooms.length > 0 ? (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="no-rooms-message">
            <p>No active rooms available.</p>
            <p>Why not create one?</p>
          </div>
        )}
      </section>
      <CreateRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}