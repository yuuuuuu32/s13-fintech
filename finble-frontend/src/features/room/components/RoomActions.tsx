import React from 'react';
import './RoomActions.css'; // RoomActions 전용 CSS를 가져옵니다.

interface RoomActionsProps {
  isHost: boolean;
  playerCount: number;
  onExit: () => void;
  onStartGame: () => void;
}

export default function RoomActions({ isHost, playerCount, onExit, onStartGame }: RoomActionsProps) {
  return (
    <div className="room-actions">
      <button onClick={onExit} className="exit-button">
        로비로 가기
      </button>
      {isHost && (
        <button
          onClick={onStartGame}
          className="start-button"
          disabled={playerCount < 2}
        >
          게임 시작
        </button>
      )}
    </div>
  );
}