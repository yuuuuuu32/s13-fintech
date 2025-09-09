import React from 'react';
import { useLobbyStore } from '../store/useLobbyStore';
import { RoomCard } from './RoomCard';
import './RoomList.css';

export function RoomList() {
  const rooms = useLobbyStore((state) => state.rooms);
  const waitingRooms = rooms.filter((room) => room.status === 'waiting');

  return (
    <main className="lobby-rooms-container glass-panel">
      <div className="room-grid-header">
        <h3>ACTIVE ROOMS</h3>
      </div>
      <div className="room-grid">
        {waitingRooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </main>
  );
}