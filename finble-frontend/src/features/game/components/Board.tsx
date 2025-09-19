// src/features/game/components/Board.tsx

import { RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore.ts';
import { BaseTile } from './tiles/BaseTile';
import { NormalTile } from './tiles/NormalTile';
import { ChanceTile } from './tiles/ChanceTile';
import { SpecialTile } from './tiles/SpecialTile';
import { Grid } from '@react-three/drei';
import '../styles/board-theme.css';

// ===== 기존 상수 (다른 파일과의 호환을 위해 유지) =====
const TILES_PER_SIDE = 9;      // ✅ 기존 유지
const TILE_WIDTH = 4;          // ✅ 기본 폭(가변 배치의 기본값으로도 사용)
const TILE_DEPTH = 6;          // ✅ 기본 깊이
const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;

// ===== 옵션: 장식물 토글 =====
const SHOW_DECOR = false;

// ===== 텍스트 회전은 기존 방식 그대로 =====
const getTextRotationY = (index: number): number => {
  if (index >= 0 && index <= 8) return 0;
  if (index > 8 && index <= 16) return Math.PI / 2;
  if (index > 16 && index <= 24) return Math.PI;
  if (index > 24 && index <= 31) return -Math.PI / 2;
  return 0;
};

export function Board() {
  const board = useGameStore((state) => state.board);

  // ===== ✅ [변경 1] 타일별 실제 폭/깊이 추출 (데이터 없으면 기본값) =====
  const DEFAULT_W = TILE_WIDTH; // 4
  const DEFAULT_D = TILE_DEPTH; // 6
  const widths = board.map((t) => t?.size?.w ?? t?.width ?? DEFAULT_W);  // ✅
  const depths = board.map((t) => t?.size?.d ?? t?.depth ?? DEFAULT_D);  // ✅

  // ===== ✅ [변경 2] 각 변의 인덱스 범위 정의 (코너 포함 구간) =====
  // bottom: 0..8  / left: 9..16 / top: 17..24 / right: 25..31
  const B0 = 0,  B1 = 8;
  const L0 = 9,  L1 = 16;
  const T0 = 17, T1 = 24;
  const R0 = 25, R1 = 31;

  // ===== ✅ [변경 3] 반쪽 길이(halfX/halfZ)를 "코너½ + 중간 + 코너½"로 정확히 계산 =====
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const bottomMiddle = Array.from({ length: B1 - B0 - 1 }, (_, i) => widths[B0 + 1 + i]); // 1..7
  const leftMid      = Array.from({ length: L1 - L0 },     (_, i) => depths[L0 + i]);      // 9..16
  const topMiddle    = Array.from({ length: T1 - T0 - 1 }, (_, i) => widths[T0 + 1 + i]);  // 18..23
  const rightMid     = Array.from({ length: R1 - R0 + 1 }, (_, i) => depths[R0 + i]);      // 25..31

  const halfX = (widths[B0] / 2) + sum(bottomMiddle) + (widths[B1] / 2);  // ✅ 가로 반경
  const halfZ = (depths[B1] / 2) + sum(leftMid)     + (depths[L1] / 2);  // ✅ 세로 반경

  // ===== ✅ [변경 4] prefix sum 유틸 & 변별 prefix 준비 =====
  const prefix = (arr: number[]) => {
    const out: number[] = [];
    let acc = 0;
    for (let i = 0; i < arr.length; i++) { out.push(acc); acc += arr[i]; }
    return out;
  };

  // 변별 길이 배열 (해당 변 방향으로 누적할 길이)
  const bottomLens = Array.from({ length: B1 - B0 + 1 }, (_, i) => widths[B0 + i]); // 0..8
  const leftLens   = Array.from({ length: L1 - L0 + 1 }, (_, i) => depths[L0 + i]); // 9..16
  const topLens    = Array.from({ length: T1 - T0 + 1 }, (_, i) => widths[T0 + i]); // 17..24
  const rightLens  = Array.from({ length: R1 - R0 + 1 }, (_, i) => depths[R0 + i]); // 25..31

  const bottomPS = prefix(bottomLens); // ✅ 자기 앞의 합
  const leftPS   = prefix(leftLens);   // ✅
  const topPS    = prefix(topLens);    // ✅
  const rightPS  = prefix(rightLens);  // ✅

  // ===== ✅ [변경 5] 가변 폭을 반영한 중심 좌표 계산 =====
  const getPositionDynamic = (i: number): [number, number, number] => {
    // bottom: x는 +halfX → (왼쪽) —로 진행, z = -halfZ
    if (i >= B0 && i <= B1) {
      const k = i - B0;
      const traveled = (bottomLens[0] / 2) + bottomPS[k] + (bottomLens[k] / 2); // 코너½ + 앞누적 + 자기½
      return [halfX - traveled, 0, -halfZ];
    }
    // left: x = -halfX, z는 -halfZ → (위) +로 진행
    if (i >= L0 && i <= L1) {
      const k = i - L0;
      const traveled = (depths[B1] / 2) + leftPS[k] + (leftLens[k] / 2); // 8번 코너½ 시작
      return [-halfX, 0, -halfZ + traveled];
    }
    // top: x는 -halfX → (오른쪽) +, z = +halfZ
    if (i >= T0 && i <= T1) {
      const k = i - T0;
      const traveled = (widths[L1] / 2) + topPS[k] + (topLens[k] / 2); // 16번 코너½ 시작
      return [-halfX + traveled, 0, halfZ];
    }
    // right: x = +halfX, z는 +halfZ → (아래) -로 진행
    const k = i - R0;
    const traveled = (depths[T1] / 2) + rightPS[k] + (rightLens[k] / 2); // 24번 코너½ 시작
    return [halfX, 0, halfZ - traveled];
  };

  // ===== 색상들 (기존 유지) =====
  const boardCenterColor = '#141a33';
  const logoRingColor = '#2dd4bf';
  const innerNeonColor = '#d24bff';
  const outerNeonColor = '#47d8ff';

  return (
    <group>
      {/* --- 타일들 --- */}
      {board.map((tile, index) => {
        if (!tile) return null;

        // ✅ [변경 6] 가변 좌표 + 타일별 width/depth 적용
        const position = getPositionDynamic(index);          // ✅
        const textRotationY = getTextRotationY(index);       // (기존 회전 로직 유지)
        const w = widths[index];                             // ✅
        const d = depths[index];                             // ✅

        return (
          <BaseTile
            key={index}
            tile={tile}
            tileIndex={index}
            position={position}
            textRotationY={textRotationY}
            width={w}                 // ✅ 코너는 6, 일반은 4
            depth={d}                 // ✅ 현재 전부 6 (필요하면 데이터로 개별화)
          >
            {(tile.type === 'city' || tile.type === 'company') && (
              <NormalTile tile={tile} tileIndex={index} />
            )}
            {/* ✅ 내부 보조 메쉬들도 사이즈를 넘겨주면 코너에서 어색하지 않음 */}
            {tile.type === 'chance'  && <ChanceTile  tile={tile} width={w} depth={d} />}
            {tile.type === 'special' && <SpecialTile tile={tile} width={w} depth={d} />}
          </BaseTile>
        );
      })}

      {/* 중앙 플레이트 (기존 유지) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[BOARD_SIZE - TILE_DEPTH * 2, BOARD_SIZE - TILE_DEPTH * 2]} />
        <meshStandardMaterial color={boardCenterColor} roughness={0.58} metalness={0.12} />
      </mesh>

      {/* 로고 링 (기존 유지) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.8, 5, 64]} />
        <meshStandardMaterial color={logoRingColor} emissive={logoRingColor} emissiveIntensity={0.4} />
      </mesh>

      {/* 네온 그리드 (기존 유지) */}
      <Grid
        position={[0, 0.05, 0]}
        args={[18, 18]}
        cellSize={1.0}
        cellThickness={0.5}
        cellColor={outerNeonColor}
        sectionSize={3.0}
        sectionThickness={1.0}
        sectionColor={innerNeonColor}
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* 물리 바닥 (기존 유지) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.2, 0]} visible={false}>
          <boxGeometry args={[BOARD_SIZE, 0.4, BOARD_SIZE]} />
        </mesh>
      </RigidBody>

      {/* 3D 바닥판 (기존 유지) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* 주변 건물 (옵션) */}
      {SHOW_DECOR && (
        <group>
          <mesh position={[-28, 4, -20]} castShadow>
            <boxGeometry args={[8, 8, 8]} />
            <meshStandardMaterial color="#050a14" />
          </mesh>
          <mesh position={[26, 6, 5]} castShadow>
            <boxGeometry args={[6, 12, 6]} />
            <meshStandardMaterial color="#050a14" />
          </mesh>
          <mesh position={[-20, 5, 28]} castShadow>
            <boxGeometry args={[10, 10, 10]} />
            <meshStandardMaterial color="#050a14" />
          </mesh>
          <mesh position={[15, 3, -28]} castShadow>
            <boxGeometry args={[12, 6, 8]} />
            <meshStandardMaterial color="#050a14" />
          </mesh>
        </group>
      )}
    </group>
  );
}
