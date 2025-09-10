// PlayerGrid.tsx
import { PlayerCard } from './PlayerCard';
import './PlayerGrid.css';

interface PlayerGridProps {
  players: { id: string; name: string }[];
}

export function PlayerGrid({ players }: PlayerGridProps) {
  return (
    <div className="player-grid">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}