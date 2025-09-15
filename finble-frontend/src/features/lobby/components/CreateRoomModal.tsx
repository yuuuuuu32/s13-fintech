import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import { useWebSocketStore } from '../../../stores/useWebSocketStore';
import './CreateRoomModal.css';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createRoom = useLobbyStore((state) => state.createRoom);
  const isConnected = useWebSocketStore((state) => state.isConnected);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roomName.trim()) {
      setError('방 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const roomId = await createRoom(roomName.trim(), maxPlayers);
      onClose();
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error('방 생성 실패:', err);
      setError('방 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>CREATE NEW ROOM</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Room Name</label>
            <input
              type="text"
              placeholder="Enter room name..."
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Max Players</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
              CANCEL
            </button>
            <button type="submit" className="create-button" disabled={isLoading || !isConnected}>
              {isLoading ? '생성 중...' : (isConnected ? 'CREATE ROOM' : '연결 중...')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};