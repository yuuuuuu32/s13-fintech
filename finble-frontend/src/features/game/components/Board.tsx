import { RigidBody } from '@react-three/rapier'
import { boardData } from '../data/boardData.ts'
import { Tile } from './Tile.tsx'

// 타일 및 플레이어 위치를 계산하는 함수
const getPosition = (index: number): [number, number, number] => {
  const TILES_PER_LINE = 8
  const TILE_WIDTH = 3
  const TILE_DEPTH = 4.5
  const BOARD_SIDE_LENGTH = TILES_PER_LINE * TILE_WIDTH
  const HALF_BOARD_SIDE = BOARD_SIDE_LENGTH / 2

  const position: [number, number, number] = [0, 0, 0]
  const side = Math.floor(index / (TILES_PER_LINE - 1))
  const indexOnSide = index % (TILES_PER_LINE - 1)

  switch (side) {
    case 0: // 아래쪽 (우측 상단 코너부터 시작)
      position[0] = HALF_BOARD_SIDE - TILE_DEPTH / 2 - indexOnSide * TILE_WIDTH
      position[2] = HALF_BOARD_SIDE - TILE_DEPTH / 2
      break
    case 1: // 왼쪽 (아래쪽으로 이동)
      position[0] = -HALF_BOARD_SIDE + TILE_DEPTH / 2
      position[2] = HALF_BOARD_SIDE - TILE_DEPTH / 2 - indexOnSide * TILE_WIDTH
      break
    case 2: // 위쪽 (좌측 하단 코너부터 시작)
      position[0] = -HALF_BOARD_SIDE + TILE_DEPTH / 2 + indexOnSide * TILE_WIDTH
      position[2] = -HALF_BOARD_SIDE + TILE_DEPTH / 2
      break
    case 3: // 오른쪽 (위쪽으로 이동)
      position[0] = HALF_BOARD_SIDE - TILE_DEPTH / 2
      position[2] = -HALF_BOARD_SIDE + TILE_DEPTH / 2 + indexOnSide * TILE_WIDTH
      break
  }
  return position
}

const getRotationY = (index: number): number => {
    const TILES_PER_LINE = 8
    const side = Math.floor(index / (TILES_PER_LINE - 1))

    switch (side) {
        case 0: return -Math.PI / 2
        case 1: return Math.PI
        case 2: return Math.PI / 2
        case 3: return 0
        default: return 0
    }
}

export function Board() {
  const TILES_PER_LINE = 8
  const TILE_WIDTH = 3
  const TILE_DEPTH = 4.5
  const BOARD_SIDE_LENGTH = TILES_PER_LINE * TILE_WIDTH
  const HALF_BOARD_SIDE = BOARD_SIDE_LENGTH / 2

  return (
    <group>
      {boardData.map((tile, index) => {
        const position = getPosition(index)
        const textRotationY = getRotationY(index)
        return <Tile key={index} tile={tile} tileIndex={index} position={position} textRotationY={textRotationY} />
      })}
      
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <planeGeometry args={[BOARD_SIDE_LENGTH, BOARD_SIDE_LENGTH]} />
          <meshStandardMaterial color="#2d3748" visible={false} />
        </mesh>
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[BOARD_SIDE_LENGTH, BOARD_SIDE_LENGTH]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {[
        [0, (BOARD_SIDE_LENGTH + TILE_DEPTH) / 2], [0, -(BOARD_SIDE_LENGTH + TILE_DEPTH) / 2],
        [(BOARD_SIDE_LENGTH + TILE_WIDTH) / 2, 0, true], [-(BOARD_SIDE_LENGTH + TILE_WIDTH) / 2, 0, true],
      ].map(([x, z, isVertical], i) => (
        <mesh key={i} position={[x, 0.15, z]}>
          <boxGeometry args={isVertical ? [TILE_DEPTH, 0.3, BOARD_SIDE_LENGTH + TILE_WIDTH] : [BOARD_SIDE_LENGTH + TILE_WIDTH, 0.3, TILE_DEPTH]} />
          <meshStandardMaterial color="#855a3c" />
        </mesh>
      ))}
    </group>
  )
}