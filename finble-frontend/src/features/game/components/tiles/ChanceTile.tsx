import type { TileData } from '../../data/boardData.ts';

interface ChanceTileProps {
  tile: TileData;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChanceTile({ tile }: ChanceTileProps) {
  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const TILE_HEIGHT = 0.2;

  return (
    <mesh position={[0, TILE_HEIGHT / 2 + 0.01, -(TILE_DEPTH / 2 - 0.25)]}>
      <boxGeometry args={[TILE_WIDTH - 0.2, 0.05, 0.5]} />
      <meshStandardMaterial color="#fde047" />
    </mesh>
  );
}
