// src/pages/room/WaitingRoomPage.tsx

import React, { useEffect, useRef } from 'react';
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
  const hasEnteredRoom = useRef(false);

  const exitRoom = useLobbyStore((state) => state.exitRoom);
  const { userInfo } = useUserStore();
  const { room, enterRoomAndSubscribe, cleanup } = useRoomStore();


  useEffect(() => {
    if (roomId && !hasEnteredRoom.current) {
      hasEnteredRoom.current = true;
      console.log('🚪 [WAITING_ROOM] Attempting to enter room:', roomId);

      enterRoomAndSubscribe(roomId).catch(error => {
        console.error('❌ [WAITING_ROOM] Failed to enter room:', error);
        hasEnteredRoom.current = false;

        // 에러 타입에 따른 처리
        if (error.message?.includes('가득')) {
          alert('방이 가득 찼습니다. 다른 방을 이용해 주세요.');
        } else if (error.message?.includes('찾을 수 없')) {
          alert('방을 찾을 수 없습니다. 방이 삭제되었을 수 있습니다.');
        } else if (error.message?.includes('진행')) {
          alert('이미 게임이 진행 중인 방입니다.');
        } else if (error.message?.includes('시간')) {
          alert('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
        } else {
          alert(`방 입장에 실패했습니다: ${error.message}`);
        }

        navigate('/lobby');
      });
    }

    return () => {
      cleanup();
    };
  }, [roomId]);

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
            playerCount={room.players.length}
            onExit={handleExit}
            onStartGame={handleStartGame}
          />
        </div>
      </main>
    </div>
  );
}