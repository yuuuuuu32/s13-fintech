import './CreateRoomModal.css';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // 방 생성 로직 (API 호출 등)
    onClose(); // 생성 후 모달 닫기 (실제론 생성 성공 후 닫아야 함)
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
            <input type="text" placeholder="Enter room name..." required />
          </div>
          <div className="form-group">
            <label>Max Players</label>
            <select required>
              <option value="">Select...</option>
              <option>2</option>
              <option>4</option>
              <option>8</option>
              <option>16</option>
            </select>
          </div>
          <div className="form-group">
            <label>Game Mode</label>
            <select required>
              <option value="">Select...</option>
              <option>Battle Royale</option>
              <option>Team Deathmatch</option>
              <option>Capture the Flag</option>
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