import './RoomCard.css';

export const RoomCard = ({ room, index, onJoin }) => (
  <div className="room-card group hover:scale-105 transition-all duration-300">
    <div className="room-card-inner">
      <div className="room-header">
        <h3 className="room-name">{room.name}</h3>
        <span className={`room-status ${room.status}`}>{room.status}</span>
      </div>
      <div className="room-info">
        <div className="room-detail">
          <span className="label">Players:</span>
          <span className="value">{room.players}/{room.maxPlayers}</span>
        </div>
        <div className="room-detail">
          <span className="label">Map:</span>
          <span className="value">{room.map}</span>
        </div>
        <div className="room-detail">
          <span className="label">Mode:</span>
          <span className="value">{room.mode}</span>
        </div>
      </div>
      <button 
        className="join-button"
        onClick={() => onJoin && onJoin(room)}
      >
        <span>JOIN</span>
        <div className="button-glow"></div>
      </button>
    </div>
  </div>
);