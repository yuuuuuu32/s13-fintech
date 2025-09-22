import type { TileData } from '../../data/boardData.ts';
import { Text } from '@react-three/drei';
import styles from './ChanceTile.module.css'; // CSS 모듈 import

// CSS 변수 값을 읽어오는 헬퍼 함수
const getCSSVariable = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

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
        <meshStandardMaterial color={getCSSVariable('--chance-tile-cylinder-color', '#fbbf24')} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* 물음표 텍스트 */}
      <Text
        position={[0, 0.11, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color={getCSSVariable('--chance-tile-text-color', 'white')}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Galmuri14.ttf"
        outlineWidth={0.05}
        outlineColor={getCSSVariable('--chance-tile-outline-color', 'black')}
      >
        ?
      </Text>
    </group>
  );
}
