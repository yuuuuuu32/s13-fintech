import React from 'react';
import './RoomActions.css'; // RoomActions 전용 CSS를 가져옵니다.

interface RoomActionsProps {
  isHost: boolean;
  onExit: () => void;
  onStartGame: () => void;
}

export default function RoomActions({ isHost, onExit, onStartGame }: RoomActionsProps) {
  return (
    <div className="room-actions">
      <button onClick={onExit} className="exit-button">
        로비로 가기
      </button>
      {isHost && (
        <button onClick={onStartGame} className="start-button">
          게임 시작
        </button>
      )}
    </div>
  );
}