import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import './CreateRoomModal.css';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const addRoom = useLobbyStore((state) => state.addRoom);
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (roomName.trim().length < 2 || roomName.trim().length > 20) {
      setError('방 제목은 2자 이상 20자 이하로 입력해주세요.');
      return;
    }
    const newRoomId = addRoom(roomName.trim());
    navigate(`/room/${newRoomId}`);
  };

  const handleClose = () => {
    setRoomName('');
    setError('');
    onClose();
  };


  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">CREATE NEW ROOM</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="modal-input"
            placeholder="Enter a room name"
            autoFocus
          />
          {error && <p className="error-message">{error}</p>}
          <div className="modal-buttons">
            <button
              type="button"
              className="modal-button cancel"
              onClick={handleClose}
            >
              CANCEL
            </button>
            <button type="submit" className="modal-button confirm">
              CREATE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}