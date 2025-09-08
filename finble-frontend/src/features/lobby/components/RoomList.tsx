import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/useLobbyStore';
import './RoomList.css';

export function RoomList() {
  const rooms = useLobbyStore((state) => state.rooms);
  const navigate = useNavigate();

  const waitingRooms = rooms.filter((room) => room.status === 'waiting');

  return (
    <div className="room-list-container">
      {waitingRooms.map((room) => (
        <div key={room.id} className="room-item">
          <span className="room-name">{room.name}</span>
          <div className="room-details">
            <span className="room-players">
              {room.players.length}/{room.maxPlayers}
            </span>
            <button
              onClick={() => navigate(`/room/${room.id}`)}
              className="join-button"
            >
              참여
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
