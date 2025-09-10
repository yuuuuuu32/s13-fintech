// PlayerCard.tsx
import './PlayerCard.css';

interface PlayerCardProps {
  player: { id: string; name: string };
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="player-card">
      <span>{player.name}</span>
    </div>
  );
}