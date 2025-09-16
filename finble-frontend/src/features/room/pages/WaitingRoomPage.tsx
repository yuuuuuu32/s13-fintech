// src/pages/room/WaitingRoomPage.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { LobbyHeader } from '../../lobby/components/LobbyHeader';
import { sendMessage } from '../../../utils/websocket';
import PlayerGrid from '../components/PlayerGrid';
import RoomActions from '../components/RoomActions';
import './WaitingRoomPage.css';

import bgImage from '../../../assets/waitingroom-background.png';


export default function WaitingRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const exitRoom = useLobbyStore((state) => state.exitRoom);
  const { userInfo } = useUserStore();
  const { room, enterRoomAndSubscribe, cleanup } = useRoomStore();

  
  useEffect(() => {
    if (roomId) {
      enterRoomAndSubscribe(roomId).catch(error => {
        console.error("Failed to enter room", error);
        navigate('/lobby');
      });
    }
    
    return () => {
      cleanup();
    };
    // 👇 2. 의존성 배열을 수정하여 무한 루프 및 타임아웃 오류를 해결합니다.
  }, [roomId, navigate]);

  useEffect(() => {
    if (room?.status === 'playing' && roomId) {
      navigate(`/game/${roomId}`);
    }
  }, [room?.status, navigate, roomId]);

  const me = room?.players.find(p => p.id === userInfo?.userId);
  const isHost = me?.isOwner ?? false;

  const handleExit = () => {
    if (roomId) {
      exitRoom(roomId);
    }
    navigate('/lobby');
  };

  const handleStartGame = () => {
    if (roomId) {
      sendMessage('/app/game/start', { type: "START_GAME", payload: {} });
    }
  };
  
  // 3. 배경 관련 모든 스타일을 인라인 스타일 객체로 통합합니다.
  const pageStyle: React.CSSProperties = {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  };
  
  if (!room) {
    return (
      <div className="waiting-room-loading">
        <h2>방 정보를 불러오는 중...</h2>
        <button onClick={() => navigate('/lobby')}>로비로 돌아가기</button>
      </div>
    );
  }
  
  return (
    <div className="waiting-room-wrapper" style={pageStyle}>
      <div className="page-header">
        <LobbyHeader />
      </div>

      <main className="app-container">
        <div className="waiting-room-content">
          <div className="room-header">
            <h1>{room.name}</h1>
            <p>({room.players.length}/{room.maxPlayers})</p>
          </div>
          
          <PlayerGrid 
            players={room.players} 
            currentUserId={userInfo?.userId}
          />
          <RoomActions 
            isHost={isHost}
            onExit={handleExit}
            onStartGame={handleStartGame}
          />
        </div>
      </main>
    </div>
  );
}