import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore'; // 스토어 import
import type { GameRoom } from '../store/useLobbyStore';
import './RoomCard.css';

interface RoomCardProps {
  room: GameRoom;
}

export const RoomCard = ({ room }: RoomCardProps) => {
  const navigate = useNavigate();
  const enterRoom = useLobbyStore((state) => state.enterRoom); // 스토어에서 enterRoom 함수 가져오기

  const handleJoinRoom = async () => {
    try {
      await enterRoom(room.id);
      navigate(`/room/${room.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`방 입장에 실패했습니다: ${error.message}`);
      } else {
        alert('알 수 없는 오류로 방 입장에 실패했습니다.');
      }
    }
  };

  const handleJoinButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleJoinRoom();
  };

  return (
    <div 
      className="room-card group" 
      onClick={handleJoinRoom} 
      role="button" 
      tabIndex={0}
      aria-label={`Join room ${room.roomName || room.name || '제목 없음'}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleJoinRoom()}
    >
      <div className="room-card-inner">
        <div className="room-header">
          <h3 className="room-name">{room.roomName || room.name || '제목 없음'}</h3>
          <span className={`room-status ${room.status}`}>{room.status}</span>
        </div>
        <div className="room-info">
          <div className="room-detail">
            <span className="label">Players:</span>
            <span className="value">{room.playerCount}/{room.maxPlayers}</span>
          </div>
          {/* map과 mode를 표시하는 부분을 제거합니다. */}
        </div>
        <button className="join-button" onClick={handleJoinButtonClick}>
          <span>JOIN</span>
        </button>
      </div>
    </div>
  );
};