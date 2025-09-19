import { RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore.ts';
import { BaseTile } from './tiles/BaseTile';
import { NormalTile } from './tiles/NormalTile';
import { ChanceTile } from './tiles/ChanceTile';
import { SpecialTile } from './tiles/SpecialTile';

const getPosition = (index: number): [number, number, number] => {
  const TILE_WIDTH = 3;
  const TILES_PER_SIDE = 8; // Corner to corner
  const HALF_BOARD_WIDTH = TILES_PER_SIDE * TILE_WIDTH / 2; // 12

  const position: [number, number, number] = [0, 0, 0];

  if (index >= 0 && index <= 8) { // Bottom row (moves left)
    position[0] = HALF_BOARD_WIDTH - index * TILE_WIDTH;
    position[2] = -HALF_BOARD_WIDTH;
  } else if (index > 8 && index <= 16) { // Left column (moves up)
    position[0] = -HALF_BOARD_WIDTH;
    position[2] = -HALF_BOARD_WIDTH + (index - 8) * TILE_WIDTH;
  } else if (index > 16 && index <= 24) { // Top row (moves right)
    position[0] = -HALF_BOARD_WIDTH + (index - 16) * TILE_WIDTH;
    position[2] = HALF_BOARD_WIDTH;
  } else if (index > 24 && index <= 31) { // Right column (moves down)
    position[0] = HALF_BOARD_WIDTH;
    position[2] = HALF_BOARD_WIDTH - (index - 24) * TILE_WIDTH;
  }

  return position;
};

const getTextRotationY = (index: number): number => {
  if (index >= 0 && index <= 8) { // Bottom row
    return 0;
  } else if (index > 8 && index <= 16) { // Left column
    return Math.PI / 2;
  } else if (index > 16 && index <= 24) { // Top row
    return Math.PI;
  } else if (index > 24 && index <= 31) { // Right column
    return -Math.PI / 2;
  }
  return 0;
};

export function Board() {
  const board = useGameStore(state => state.board);

  const TILES_PER_SIDE = 9;
  const TILE_WIDTH = 3;
  const TILE_DEPTH = 5;
  const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;

  return (
    <group>
      {board.map((tile, index) => {
        if (!tile) return null; // Handle null tiles in board data
        const position = getPosition(index);
        const textRotationY = getTextRotationY(index);

        return (
          <BaseTile
            key={index}
            tile={tile}
            tileIndex={index}
            position={position}
            textRotationY={textRotationY}
          >
            {(tile.type === 'city' || tile.type === 'company') && <NormalTile tile={tile} tileIndex={index} />}
            {tile.type === 'chance' && <ChanceTile tile={tile} />}
            {tile.type === 'special' && <SpecialTile tile={tile} />}
          </BaseTile>
        );
      })}
      
      {/* Board Background */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[BOARD_SIZE, BOARD_SIZE]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>

      {/* Center Board Area - Lighter green with pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[BOARD_SIZE - TILE_DEPTH * 2, BOARD_SIZE - TILE_DEPTH * 2]} />
        <meshStandardMaterial color="#2c5530" />
      </mesh>

      {/* Board Border Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[(BOARD_SIZE - TILE_DEPTH * 2) / 2 - 0.1, (BOARD_SIZE - TILE_DEPTH * 2) / 2]} />
        <meshStandardMaterial color="#ffd700" />
      </mesh>

      {/* Inner decorative border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[(BOARD_SIZE - TILE_DEPTH * 2) / 2 - 1, (BOARD_SIZE - TILE_DEPTH * 2) / 2 - 0.5]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* Center Logo Area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[4]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>

      {/* Logo border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[3.8, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[BOARD_SIZE, 0.4, BOARD_SIZE]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </RigidBody>
    </group>
  );
}