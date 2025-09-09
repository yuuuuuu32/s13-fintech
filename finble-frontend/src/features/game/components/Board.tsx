import { RigidBody } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore.ts'
import { Tile } from './Tile.tsx'

// 32칸 기준, 각 타일의 3D 위치를 계산하는 함수
const getPosition = (index: number): [number, number, number] => {
  const TILES_PER_SIDE = 8; 
  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const HALF_BOARD_WIDTH = (TILES_PER_SIDE * TILE_WIDTH) / 2 - TILE_WIDTH / 2;
  const HALF_BOARD_DEPTH = (TILES_PER_SIDE * TILE_WIDTH) / 2 - TILE_WIDTH / 2;

  const position: [number, number, number] = [0, 0, 0]
  const side = Math.floor(index / TILES_PER_SIDE);
  const indexOnSide = index % TILES_PER_SIDE;

  switch (side) {
    case 0:
      position[0] = HALF_BOARD_WIDTH - indexOnSide * TILE_WIDTH;
      position[2] = HALF_BOARD_DEPTH;
      break
    case 1:
      position[0] = -HALF_BOARD_WIDTH;
      position[2] = HALF_BOARD_DEPTH - indexOnSide * TILE_WIDTH;
      break
    case 2:
      position[0] = -HALF_BOARD_WIDTH + indexOnSide * TILE_WIDTH;
      position[2] = -HALF_BOARD_DEPTH;
      break
    case 3:
      position[0] = HALF_BOARD_WIDTH;
      position[2] = -HALF_BOARD_DEPTH + indexOnSide * TILE_WIDTH;
      break
  }
  return position
}

const getTextRotationY = (index: number): number => {
    const TILES_PER_SIDE = 8
    const side = Math.floor(index / TILES_PER_SIDE)

    switch (side) {
        case 0: return 0;
        case 1: return Math.PI / 2;
        case 2: return Math.PI;
        case 3: return -Math.PI / 2;
        default: return 0;
    }
}

export function Board() {
  const board = useGameStore(state => state.board);
  const TILES_PER_SIDE = 8
  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH

  return (
    <group>
      {board.map((tile, index) => {
        const position = getPosition(index);
        const textRotationY = getTextRotationY(index);
        return <Tile key={index} tile={tile} tileIndex={index} position={position} textRotationY={textRotationY} />
      })}
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[BOARD_SIZE, BOARD_SIZE]} />
          <meshStandardMaterial color="#2d3748" visible={false} />
        </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[BOARD_SIZE - TILE_DEPTH * 2, BOARD_SIZE - TILE_DEPTH * 2]} />
        <meshStandardMaterial color="#38a169" />
      </mesh>
      
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[BOARD_SIZE, 0.4, BOARD_SIZE]} />
          <meshStandardMaterial color="#855a3c" />
        </mesh>
      </RigidBody>
    </group>
  )
}