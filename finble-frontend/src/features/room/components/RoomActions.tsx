// RoomActions.tsx
import './RoomActions.css';

interface RoomActionsProps {
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isHost: boolean;
}

export function RoomActions({ onStartGame, onLeaveRoom, isHost }: RoomActionsProps) {
  return (
    <div className="room-actions">
      <button onClick={onLeaveRoom}>로비로 가기</button>
      {isHost && <button onClick={onStartGame}>게임 시작</button>}
    </div>
  );
}