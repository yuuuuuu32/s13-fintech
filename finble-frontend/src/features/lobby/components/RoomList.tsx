import { RoomCard } from './RoomCard';
import './RoomList.css';

export const RoomList = ({ rooms, onJoin }) => {
  return (
    <div className="room-grid-container glass-panel">
      <div className="room-grid-header">
        <h3>ACTIVE ROOMS</h3>
        <div className="scan-line"></div>
      </div>
      <div className="room-grid">
        {rooms.map((room, index) => (
          <RoomCard 
            key={index} 
            room={room} 
            index={index} 
            onJoin={onJoin}  // 👈 여기서 전달
          />
        ))}
      </div>
    </div>
  );
};