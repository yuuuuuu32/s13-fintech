import type { TileData } from '../../data/boardData.ts';
import { Text } from '@react-three/drei';

interface ChanceTileProps {
  tile: TileData;
  width?: number;
  depth?: number;
}

export function ChanceTile({ tile, width, depth }: ChanceTileProps) {
  const TILE_WIDTH = width ?? 4;
  const TILE_DEPTH = depth ?? 6;

  return (
    <group>
      {/* 원형 발판 모양의 장식 */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* 물음표 텍스트 */}
      <Text
        position={[0, 0.11, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Galmuri14.ttf"
        outlineWidth={0.05}
        outlineColor="black"
      >
        ?
      </Text>
    </group>
  );
}
