import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import './CreateRoomModal.css';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();
  const addRoom = useLobbyStore((state) => state.addRoom);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('Please enter a room name.');
      return;
    }
    // Using default values for maxPlayers (4) and gameMode ('Battle Royale')
    const newRoomId = addRoom(roomName.trim(), 4, 'Battle Royale');
    onClose();
    navigate(`/room/${newRoomId}`);
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
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="create-button">
              CREATE ROOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};