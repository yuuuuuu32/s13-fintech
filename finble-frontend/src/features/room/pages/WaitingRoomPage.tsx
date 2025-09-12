import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { LobbyHeader } from '../../lobby/components/LobbyHeader';
import { sendMessage } from '../../../utils/websocket'; // Import sendMessage
import './WaitingRoomPage.css';

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
      sendMessage('/app/game/start', { type: "START_GAME", payload: { roomId: parseInt(roomId, 10) } });
    }
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
    <div className="waiting-room-wrapper">
      <LobbyHeader />
      <main className="app-container">
        <div className="waiting-room-content">
          <div className="room-header">
            <h1>{room.name}</h1>
            <p>({room.players.length}/{room.maxPlayers})</p>
          </div>
          <div className="player-grid">
            {room.players.map((player) => (
              <div key={player.id} className="player-card">
                {player.name}
                {player.id === userInfo?.userId && ' (나)'}
                {player.isOwner && ' (방장)'}
              </div>
            ))}
          </div>
          <div className="room-actions">
            <button onClick={handleExit} className="exit-button">
              로비로 가기
            </button>
            {isHost && (
              <button onClick={handleStartGame} className="start-button">
                게임 시작
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}