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
    console.log('🚪 [ROOM_CARD] Join room attempt:', {
      roomId: room.id,
      roomName: room.name,
      currentCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      status: room.status,
      canJoin: room.playerCount < room.maxPlayers && room.status !== 'playing'
    });

    // 사전 인원 수 체크 - 등호(>=)가 아닌 부등호(<) 사용
    if (room.playerCount >= room.maxPlayers) {
      console.log('❌ [ROOM_CARD] Room is full, blocking entry');
      alert(`방이 가득 찼습니다. (${room.playerCount}/${room.maxPlayers})`);
      return;
    }

    // 게임이 이미 시작된 방인지 체크
    if (room.status === 'playing') {
      console.log('❌ [ROOM_CARD] Game already in progress, blocking entry');
      alert('이미 게임이 진행 중인 방입니다.');
      return;
    }

    try {
      console.log('🚪 [ROOM_CARD] Calling enterRoom...');
      await enterRoom(room.id);
      console.log('✅ [ROOM_CARD] enterRoom success, navigating to room');
      navigate(`/room/${room.id}`);
    } catch (error) {
      console.error('❌ [ROOM_CARD] enterRoom failed:', error);
      if (error instanceof Error) {
        // 더 구체적인 에러 메시지 처리
        if (error.message.includes('가득') || error.message.includes('full') || error.message.includes('인원')) {
          alert(`방이 가득 찼습니다. 다른 방을 이용해 주세요.`);
        } else if (error.message.includes('찾을 수 없') || error.message.includes('not found')) {
          alert('방을 찾을 수 없습니다. 방이 삭제되었을 수 있습니다.');
        } else {
          alert(`방 입장에 실패했습니다: ${error.message}`);
        }
      } else {
        alert('알 수 없는 오류로 방 입장에 실패했습니다.');
      }
    }
  };

  const handleJoinButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleJoinRoom();
  };

  // 방 입장 가능 여부 체크
  const isRoomFull = room.playerCount >= room.maxPlayers;
  const isGameInProgress = room.status === 'playing';
  const canJoinRoom = !isRoomFull && !isGameInProgress;

  return (
    <div
      className={`room-card group ${!canJoinRoom ? 'room-disabled' : ''}`}
      onClick={canJoinRoom ? handleJoinRoom : undefined}
      role="button"
      tabIndex={canJoinRoom ? 0 : -1}
      aria-label={`Join room ${room.roomName || room.name || '제목 없음'}`}
      onKeyDown={(e) => canJoinRoom && (e.key === 'Enter' || e.key === ' ') && handleJoinRoom()}
    >
      <div className="room-card-inner">
        <div className="room-header">
          <h3 className="room-name">{room.roomName || room.name || '제목 없음'}</h3>
          <span className={`room-status ${room.status}`}>{room.status}</span>
        </div>
        <div className="room-info">
          <div className="room-detail">
            <span className="label">Players:</span>
            <span className={`value ${isRoomFull ? 'room-full' : ''}`}>
              {room.playerCount}/{room.maxPlayers}
              {isRoomFull && ' (가득참)'}
            </span>
          </div>
          {/* map과 mode를 표시하는 부분을 제거합니다. */}
        </div>
        <button
          className={`join-button ${!canJoinRoom ? 'disabled' : ''}`}
          onClick={canJoinRoom ? handleJoinButtonClick : undefined}
          disabled={!canJoinRoom}
        >
          <span>
            {isRoomFull ? 'FULL' : isGameInProgress ? 'PLAYING' : 'JOIN'}
          </span>
        </button>
      </div>
    </div>
  );
};