import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameRoom } from '../store/useLobbyStore';
import './RoomCard.css';

interface RoomCardProps {
  room: GameRoom;
}

export const RoomCard = ({ room }: RoomCardProps) => {
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    navigate(`/room/${room.id}`);
  };

  const handleJoinButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    handleJoinRoom();
  };

  return (
    <div 
      className="room-card group" 
      onClick={handleJoinRoom} 
      role="button" 
      tabIndex={0}
      aria-label={`Join room ${room.name}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleJoinRoom()}
    >
      <div className="room-card-inner">
        <div className="room-header">
          <h3 className="room-name">{room.name}</h3>
          <span className={`room-status ${room.status}`}>{room.status}</span>
        </div>
        <div className="room-info">
          <div className="room-detail">
            <span className="label">Players:</span>
            <span className="value">{room.players.length}/{room.maxPlayers}</span>
          </div>
          <div className="room-detail">
            <span className="label">Map:</span>
            <span className="value">{room.map}</span>
          </div>
          <div className="room-detail">
            <span className="label">Mode:</span>
            <span className="value">{room.mode}</span>
          </div>
        </div>
        <button className="join-button" onClick={handleJoinButtonClick}>
          <span>JOIN</span>
        </button>
      </div>
    </div>
  );
};
