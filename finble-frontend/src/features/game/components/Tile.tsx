import { Text } from '@react-three/drei'
import type { TileData } from '../data/boardData.ts'
import { useGameStore } from '../store/useGameStore.ts'

interface TileProps {
  tile: TileData
  tileIndex: number // 자신의 인덱스를 받음
  position: [number, number, number]
  textRotationY: number
}

// 플레이어 ID에 따라 고유한 색상을 반환
const getPlayerColor = (playerId: string) => {
  if (playerId === 'player-1') return 'royalblue'
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
  const color = getTileColor(tile.type)
  const players = useGameStore((state) => state.players)
  
  // 이 땅의 소유주를 찾습니다.
  const owner = players.find(p => p.properties.includes(tileIndex))

  const TILE_WIDTH = 3
  const TILE_DEPTH = 4.5
  const TILE_HEIGHT = 0.2

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, TILE_HEIGHT / 2 + 0.01, -(TILE_DEPTH / 2 - 0.25)]}>
        <boxGeometry args={[TILE_WIDTH - 0.2, 0.05, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, TILE_HEIGHT / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, textRotationY]}
        fontSize={0.4}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.4}
        textAlign="center"
      >
        {tile.name}
      </Text>

      {/* 소유주가 있으면 마커 표시 */}
      {owner && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.01, TILE_DEPTH / 2 - 0.5]}>
          <boxGeometry args={[TILE_WIDTH - 0.2, 0.1, 0.5]} />
          <meshStandardMaterial color={getPlayerColor(owner.id)} />
        </mesh>
      )}
    </group>
  )
}