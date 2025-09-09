import { Text } from '@react-three/drei'
import type { TileData } from '../data/boardData.ts'
import { useGameStore } from '../store/useGameStore.ts'
import Building from './Building.tsx' 

interface TileProps {
  tile: TileData
  tileIndex: number
  position: [number, number, number]
  textRotationY: number
}

const getPlayerColor = (playerId: string) => {
  if (playerId === 'player-1' || playerId === 'user-me') return 'royalblue'
  if (playerId === 'player-2') return 'hotpink'
  return 'white'
}

const getTileColor = (type: TileData['type']) => {
  switch (type) {
    case 'city': return '#86efac';
    case 'company': return '#67e8f9';
    case 'chance': return '#fde047';
    case 'special': return '#d8b4fe';
    default: return '#e5e5e5';
  }
}

export function Tile({ tile, tileIndex, position, textRotationY }: TileProps) {
  const players = useGameStore(state => state.players);
  const gamePhase = useGameStore(state => state.gamePhase);
  const selectTravelDestination = useGameStore(state => state.selectTravelDestination);
  const expoLocation = useGameStore(state => state.expoLocation);
  
  const owner = players.find(p => p.properties.includes(tileIndex))

  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const TILE_HEIGHT = 0.2

  const handleTileClick = () => {
    if (gamePhase === 'WORLD_TRAVEL_MOVE') {
      selectTravelDestination(tileIndex);
    }
  };

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
    <group position={position} rotation={[0, textRotationY, 0]} onClick={handleTileClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, TILE_HEIGHT / 2 + 0.01, -(TILE_DEPTH / 2 - 0.25)]}>
        <boxGeometry args={[TILE_WIDTH - 0.2, 0.05, 0.5]} />
        <meshStandardMaterial color={getTileColor(tile.type)} />
      </mesh>
      <Text
        position={[0, TILE_HEIGHT / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.6}
        textAlign="center"
        lineHeight={1.2}
      >
        {tile.name}
      </Text>

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

      {owner && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.01, TILE_DEPTH / 2 - 0.5]}>
          <boxGeometry args={[TILE_WIDTH - 0.2, 0.1, 0.5]} />
          <meshStandardMaterial color={getPlayerColor(owner.id)} />
        </mesh>
      )}
      
      {tile.type === 'city' && tile.buildings && tile.buildings.level > 0 && (
          <Building level={tile.buildings.level as 1 | 2 | 3} />
      )}
    </group>
  )
}