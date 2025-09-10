// RoomHeader.tsx
import './RoomHeader.css';

interface RoomHeaderProps {
  room: {
    name: string;
    maxPlayers: number;
    players: { id: string; name: string }[];
  };
}

export function RoomHeader({ room }: RoomHeaderProps) {
  return (
    <div className="room-header">
      <h1>{room.name}</h1>
      <p>{room.players.length}/{room.maxPlayers} 명</p>
    </div>
  );
}