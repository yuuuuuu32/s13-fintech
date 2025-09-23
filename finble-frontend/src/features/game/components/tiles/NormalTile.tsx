import { Text } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import Building from '../Building';
import styles from './NormalTile.module.css'; // CSS 모듈 import

// CSS 변수 값을 읽어오는 헬퍼 함수
const getCSSVariable = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

interface NormalTileProps {
  tile: TileData;
  tileIndex: number;
}

export function NormalTile({ tile, tileIndex }: NormalTileProps) {
  const players = useGameStore(state => state.players);
  const expoLocation = useGameStore(state => state.expoLocation);

  // 플레이어 배열 안전하게 변환
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});
  const owner = playersArray.find(p => p.properties?.includes(tileIndex));

  const TILE_WIDTH = 5; // 기본 너비 5로 변경
  const TILE_DEPTH = 7; // 기본 깊이 7로 변경
  const TILE_HEIGHT = 0.2;

  let toll = tile.toll || 0;
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
      {/* 기존 막대 장식 제거 */}

      {infoText && (
        <Text
          position={[0, TILE_HEIGHT / 2 + 0.02, 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color={getCSSVariable('--normal-tile-text-color', '#000000')}
          anchorX="center"
          anchorY="middle"
          maxWidth={TILE_WIDTH - 1.5}
          textAlign="center"
          font="/fonts/Galmuri14.ttf"
          outlineWidth={0.015}
          outlineColor={getCSSVariable('--normal-tile-outline-color', '#ffffff')}
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