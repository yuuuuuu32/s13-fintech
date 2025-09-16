import React from 'react';
import './PlayerCard.css'; // PlayerCard 전용 CSS를 가져옵니다.

interface Player {
  id: string;
  name: string;
  isOwner: boolean;
}

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
}

export default function PlayerCard({ player, isMe }: PlayerCardProps) {
  const cardClassName = `player-card ${isMe ? 'is-me' : ''}`;

  return (
    <div className={cardClassName}>
      {player.name}
      {isMe && ' (나)'}
      {player.isOwner && ' (방장)'}
    </div>
  );
}