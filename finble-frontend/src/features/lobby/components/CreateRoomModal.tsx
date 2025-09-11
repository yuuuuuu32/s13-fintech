import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import './CreateRoomModal.css';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const [error, setError] = useState<string | null>(null); // 에러 상태 추가
  const navigate = useNavigate(); // navigate는 사용하지 않지만, 기존 코드에 있어 유지
  const createRoom = useLobbyStore((state) => state.createRoom); // createRoom 액션 가져오기

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // 에러 초기화

    if (!roomName.trim()) {
      setError('방 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true); // 로딩 시작

    try {
      await createRoom(roomName.trim(), maxPlayers);
      onClose(); // 성공 시 모달 닫기
      // 방 생성 후 즉시 이동하는 로직은 백엔드에서 roomId를 직접 반환하지 않으므로 제거합니다.
      // 사용자는 방 목록이 업데이트되면 새로 생성된 방을 클릭하여 입장해야 합니다.
    } catch (err) {
      console.error('방 생성 실패:', err);
      setError('방 생성에 실패했습니다. 다시 시도해주세요.'); // 에러 메시지 설정
    } finally {
      setIsLoading(false); // 로딩 종료
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
              disabled={isLoading} // 로딩 중 비활성화
            />
          </div>
          <div className="form-group">
            <label>Max Players</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={isLoading} // 로딩 중 비활성화
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          {error && <p className="error-message">{error}</p>} {/* 에러 메시지 표시 */}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
              CANCEL
            </button>
            <button type="submit" className="create-button" disabled={isLoading}>
              {isLoading ? '생성 중...' : 'CREATE ROOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};