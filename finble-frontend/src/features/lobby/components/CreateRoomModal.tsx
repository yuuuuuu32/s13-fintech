import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore'; // Re-add store import
import './CreateRoomModal.css';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const navigate = useNavigate();
  const addRoom = useLobbyStore((state) => state.addRoom); // Get addRoom from store

  if (!isOpen) return null;

  // Revert handleSubmit to use the mock store function
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('Please enter a room name.');
      return;
    }
    // Use the mock addRoom function instead of the API call
    const newRoomId = addRoom(roomName.trim(), maxPlayers, 'Battle Royale');
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
          <div className="form-group">
            <label>Max Players</label>
            <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
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