import { Text } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import Building from '../Building';

interface NormalTileProps {
  tile: TileData;
  tileIndex: number;
}

const getTileColor = (type: TileData['type']) => {
  switch (type) {
    case 'city': return '#86efac';
    case 'company': return '#67e8f9';
    default: return '#e5e5e5';
  }
}

export function NormalTile({ tile, tileIndex }: NormalTileProps) {
  const players = useGameStore(state => state.players);
  const expoLocation = useGameStore(state => state.expoLocation);

  const owner = players.find(p => p.properties.includes(tileIndex));

  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const TILE_HEIGHT = 0.2;

  let toll = tile.tolls?.[tile.buildings?.level || 0] || 0;
  if (expoLocation === tileIndex) {
      toll *= 2;
  }

  const infoText = owner
    ? `통행료: ${toll.toLocaleString()}`
    : tile.price
    ? `가격: ${tile.price.toLocaleString()}`
    : '';

  return (
    <>
      <mesh position={[0, TILE_HEIGHT / 2 + 0.01, -(TILE_DEPTH / 2 - 0.25)]}>
        <boxGeometry args={[TILE_WIDTH - 0.2, 0.05, 0.5]} />
        <meshStandardMaterial color={getTileColor(tile.type)} />
      </mesh>

      {infoText && (
        <Text
          position={[0, TILE_HEIGHT / 2 + 0.02, 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.3}
          color="#333"
          anchorX="center"
          anchorY="middle"
          maxWidth={TILE_WIDTH - 0.8}
          textAlign="center"
        >
          {infoText}
        </Text>
      )}

      {tile.type === 'city' && tile.buildings && tile.buildings.level > 0 && (
          <Building level={tile.buildings.level as 1 | 2 | 3} />
      )}
    </>
  );
}
