import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../lobby/store/useLobbyStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useRoomStore } from '../store/useRoomStore';

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
    
    // Cleanup on component unmount
    return () => {
      cleanup();
    };
  }, [roomId, enterRoomAndSubscribe, cleanup, navigate]);

  // Find current user and check if they are the host
  const me = room?.players.find(p => p.id === userInfo?.userId);
  const isHost = me?.isOwner ?? false;

  const handleExit = () => {
    if (roomId) {
      exitRoom(roomId);
    }
    navigate('/lobby');
  };

  if (!room) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '4rem' }}>
        <h2>방 정보를 불러오는 중...</h2>
        <button onClick={() => navigate('/lobby')}>로비로 돌아가기</button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2rem',
        color: 'white',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>{room.name}</h1>
        <p style={{ fontSize: '1.2rem', color: '#ccc', margin: 0 }}>
          ({room.players.length}/{room.maxPlayers})
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          margin: '2rem 0',
        }}
      >
        {room.players.map((player) => (
          <div
            key={player.id}
            style={{
              padding: '1.5rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '1.2rem',
            }}
          >
            {player.name}
            {player.id === userInfo?.userId && ' (나)'}
            {player.isOwner && ' (방장)'}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '2rem' }}>
        <button
          onClick={handleExit}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            backgroundColor: '#555',
          }}
        >
          로비로 가기
        </button>
        {isHost && (
          <button
            onClick={() => navigate('/game')}
            style={{ padding: '1rem 2rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            게임 시작
          </button>
        )}
      </div>
    </div>
  );
}
