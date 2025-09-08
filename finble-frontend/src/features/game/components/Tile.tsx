import { Text } from '@react-three/drei'
import type { TileData } from '../data/boardData.ts'
import { useGameStore } from '../store/useGameStore.ts'

interface TileProps {
  tile: TileData
  tileIndex: number
  position: [number, number, number]
  textRotationY: number
}

// 플레이어 ID에 따라 고유한 색상을 반환
const getPlayerColor = (playerId: string) => {
  if (playerId === 'player-1') return 'royalblue'
  if (playerId === 'player-2') return 'hotpink'
  return 'white'
}

// 타일 종류에 따른 색상 반환
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
  
  const owner = players.find(p => p.properties.includes(tileIndex))

  const TILE_WIDTH = 3
  const TILE_DEPTH = 4.5
  const TILE_HEIGHT = 0.2

  return (
    <group position={position} rotation={[0, textRotationY, 0]}>
      {/* 타일 본체 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* 타일 색상띠 */}
      <mesh position={[0, TILE_HEIGHT / 2 + 0.01, -(TILE_DEPTH / 2 - 0.25)]}>
        <boxGeometry args={[TILE_WIDTH - 0.2, 0.05, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 타일 이름 텍스트 */}
      <Text
        position={[0, TILE_HEIGHT / 2 + 0.02, 0.75]} // Z축으로 좀 더 이동시켜 글자가 중앙에 오도록 함
        rotation={[-Math.PI / 2, 0, 0]} // 텍스트를 바닥에 눕힘
        fontSize={0.35} // 폰트 크기를 살짝 줄임
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.6} // 최대 너비를 약간 줄여 양옆 간격을 확보
        textAlign="center"
        lineHeight={1.2}
      >
        {tile.name}
      </Text>

      {/* 소유주 마커 */}
      {owner && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.01, TILE_DEPTH / 2 - 0.5]}>
          <boxGeometry args={[TILE_WIDTH - 0.2, 0.1, 0.5]} />
          <meshStandardMaterial color={getPlayerColor(owner.id)} />
        </mesh>
      )}
    </group>
  )
}