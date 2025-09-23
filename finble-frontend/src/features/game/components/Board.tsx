import { RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore.ts';
import { BaseTile } from './tiles/BaseTile';
import { NormalTile } from './tiles/NormalTile';
import { ChanceTile } from './tiles/ChanceTile';
import { SpecialTile } from './tiles/SpecialTile';
import { Grid, useTexture } from '@react-three/drei';
import styles from './Board.module.css';

// ===== 기존 상수 (호환성 유지) =====
const TILES_PER_SIDE = 9;
const TILE_WIDTH = 4; // 기본 타일 너비
const TILE_DEPTH = 4; // 기본 타일 깊이 (✅ STEP 2: TILE_WIDTH와 동일하게 수정)
const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;

// ===== 옵션: 장식물 토글 =====
const SHOW_DECOR = false; // 건물 장식 비활성화

// ===== 가변 폭/깊이 계산을 위한 유틸리티 =====
const prefix = (arr: number[]) => {
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < arr.length; i++) { 
    out.push(acc); 
    acc += arr[i]; 
  }
  return out;
};

// ===== 기존 타일 위치 계산 (3x3 기준) =====
const getPosition = (index: number): [number, number, number] => {
  // ✅ STEP 1: 기준값 일치
  const TILE_WIDTH = 4;
  const TILES_PER_SIDE = 9;
  const HALF_BOARD_WIDTH = (TILES_PER_SIDE - 1) * TILE_WIDTH / 2; // 모서리 기준 계산

  const position: [number, number, number] = [0, 0, 0];

  if (index >= 0 && index <= 8) {
    position[0] = HALF_BOARD_WIDTH - index * TILE_WIDTH;
    position[2] = -HALF_BOARD_WIDTH;
  } else if (index > 8 && index <= 16) {
    position[0] = -HALF_BOARD_WIDTH;
    position[2] = -HALF_BOARD_WIDTH + (index - 8) * TILE_WIDTH;
  } else if (index > 16 && index <= 24) {
    position[0] = -HALF_BOARD_WIDTH + (index - 16) * TILE_WIDTH;
    position[2] = HALF_BOARD_WIDTH;
  } else if (index > 24 && index <= 31) {
    position[0] = HALF_BOARD_WIDTH;
    position[2] = HALF_BOARD_WIDTH - (index - 24) * TILE_WIDTH;
  }

  return position;
};

// ===== 가변 크기 타일 위치 계산 =====
const getPositionDynamic = (index: number, board: any[]): [number, number, number] => {
  const DEFAULT_W = TILE_WIDTH;
  const DEFAULT_D = TILE_WIDTH; // ✅ 보너스: depth도 width와 같게 수정
  const GAP = 0.1; // 타일 사이 간격

  const widths = board.map((t) => (t?.size?.w ?? t?.width ?? DEFAULT_W) + GAP);
  const depths = board.map((t) => (t?.size?.d ?? t?.depth ?? DEFAULT_D) + GAP);

  // 변별 인덱스 범위
  const B0 = 0, B1 = 8;
  const L0 = 9, L1 = 16;
  const T0 = 17, T1 = 24;
  const R0 = 25, R1 = 31;

  // 각 변의 총 길이 계산
  const bottomWidth = widths.slice(B0, B1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const leftDepth = depths.slice(L0, L1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const topWidth = widths.slice(T0, T1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const rightDepth = depths.slice(R0, R1 + 1).reduce((a, b) => a + b, 0) - GAP;

  const halfX = bottomWidth / 2;
  const halfZ = leftDepth / 2;

  // 누적 합 계산
  const bottomPS = prefix(widths.slice(B0, B1 + 1));
  const leftPS = prefix(depths.slice(L0, L1 + 1));
  const topPS = prefix(widths.slice(T0, T1 + 1));
  const rightPS = prefix(depths.slice(R0, R1 + 1));

  // 위치 계산
  if (index >= B0 && index <= B1) {
    const k = index - B0;
    const traveled = bottomPS[k] + (widths[k] - GAP) / 2;
    return [halfX - traveled, 0, -halfZ];
  }
  if (index >= L0 && index <= L1) {
    const k = index - L0;
    const traveled = leftPS[k] + (depths[k + L0] - GAP) / 2;
    return [-halfX, 0, -halfZ + traveled];
  }
  if (index >= T0 && index <= T1) {
    const k = index - T0;
    const traveled = topPS[k] + (widths[k + T0] - GAP) / 2;
    return [-halfX + traveled, 0, halfZ];
  }
  const k = index - R0;
  const traveled = rightPS[k] + (depths[k + R0] - GAP) / 2;
  return [halfX, 0, halfZ - traveled];
};

const getTextRotationY = (index: number): number => {
  if (index >= 0 && index <= 8) return 0;
  if (index > 8 && index <= 16) return Math.PI / 2;
  if (index > 16 && index <= 24) return Math.PI;
  if (index > 24 && index <= 31) return -Math.PI / 2;
  return 0;
};

export function Board() {
  const board = useGameStore(state => state.board);
  const floorTexture = useTexture('/src/assets/game-floor.png');

  // 가변 크기 지원 여부 확인 (타일에 size 정보가 있는지)
  const hasVariableSizes = board.some(tile => tile?.size || tile?.width || tile?.depth);

  return (
    <group>
      {board.map((tile, index) => {
        if (!tile) return null;
        
        // 가변 크기가 있으면 새로운 계산, 없으면 기존 방식
        const position = hasVariableSizes ? 
          getPositionDynamic(index, board) : 
          getPosition(index);
        
        const textRotationY = getTextRotationY(index);
        
        // 타일별 크기 (안전한 처리)
        const w = tile?.size?.w ?? tile?.width ?? TILE_WIDTH;
        const d = tile?.size?.d ?? tile?.depth ?? TILE_DEPTH;

        // BaseTile props 안전하게 전달
        const baseTileProps: any = {
          tile,
          tileIndex: index,
          position,
          textRotationY,
          width: w,
          depth: d,
          rotation: [0, textRotationY, 0] // ✅ STEP 3: 회전 prop 전달 (BaseTile에서 처리)
        };

        // width/depth는 BaseTile이 지원하는 경우에만 전달
        if (hasVariableSizes) {
          // 이 블록은 이제 비어있어도 됩니다. 또는 다른 가변 크기 관련 로직을 추가할 수 있습니다.
        }

        return (
          <BaseTile key={index} {...baseTileProps}>
            {(tile.type === 'city' || tile.type === 'company') && 
              <NormalTile tile={tile} tileIndex={index} />}
            {tile.type === 'chance' && 
              <ChanceTile tile={tile} {...(hasVariableSizes ? { width: w, depth: d } : {})} />}
            {tile.type === 'special' && 
              <SpecialTile tile={tile} {...(hasVariableSizes ? { width: w, depth: d } : {})} />}
          </BaseTile>
        );
      })}
      
      {/* 중앙부 바닥 (주사위 아래) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial 
          map={floorTexture}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* 물리 바닥 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[BOARD_SIZE, 0.4, BOARD_SIZE]} />
          <meshStandardMaterial color={'#1a1a35'} visible={false} />
        </mesh>
      </RigidBody>
    </group>
  );
}