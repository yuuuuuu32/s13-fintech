import type { TileData } from '../../data/boardData.ts';

// CSS 변수 값을 읽어오는 헬퍼 함수
const getCSSVariable = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

interface SpecialTileProps {
  tile: TileData;
  width?: number;
  depth?: number;
}

export function SpecialTile({ width, depth }: SpecialTileProps) {
  const TILE_WIDTH = width ?? 4;
  const TILE_DEPTH = depth ?? 6;

  return (
    <group>
      {/* 중앙 단상 모양 장식 */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH * 0.6, 0.1, TILE_DEPTH * 0.4]} />
        <meshStandardMaterial color={getCSSVariable('--special-tile-base-color', '#a855f7')} metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH * 0.55, 0.05, TILE_DEPTH * 0.35]} />
        <meshStandardMaterial color={getCSSVariable('--special-tile-top-color', '#c084fc')} metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}