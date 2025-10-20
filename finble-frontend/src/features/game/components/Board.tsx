import { RigidBody } from "@react-three/rapier";
import { useGameStore } from "../store/useGameStore.ts";
import { BaseTile } from "./tiles/BaseTile";
import { NormalTile } from "./tiles/NormalTile";
import { ChanceTile } from "./tiles/ChanceTile";
import { SpecialTile } from "./tiles/SpecialTile";
import { useTexture } from "@react-three/drei";
import floorTextureUrl from "../../../assets/game-floor.png";

// ===== 기존 상수 (호환성 유지) =====
const TILES_PER_SIDE = 9;
const TILE_WIDTH = 4; // 기본 타일 너비
const TILE_DEPTH = 4; // 기본 타일 깊이
const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;

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

// ===== 타일 위치 계산 (180도 회전된 보드 기준) =====
const getPosition = (index: number): [number, number, number] => {
  const TILE_WIDTH = 4;
  const TILES_PER_SIDE = 9;
  const HALF_BOARD_WIDTH = ((TILES_PER_SIDE - 1) * TILE_WIDTH) / 2;

  const position: [number, number, number] = [0, 0, 0];

  if (index >= 0 && index <= 8) {
    // 시작 ~ 감옥
    position[0] = HALF_BOARD_WIDTH - index * TILE_WIDTH;
    position[2] = HALF_BOARD_WIDTH;
  } else if (index > 8 && index <= 16) {
    // 감옥 ~ 세계여행
    position[0] = -HALF_BOARD_WIDTH;
    position[2] = HALF_BOARD_WIDTH - (index - 8) * TILE_WIDTH;
  } else if (index > 16 && index <= 24) {
    // 세계여행 ~ 국세청
    position[0] = -HALF_BOARD_WIDTH + (index - 16) * TILE_WIDTH;
    position[2] = -HALF_BOARD_WIDTH;
  } else if (index > 24 && index <= 31) {
    // 국세청 ~ 시작
    position[0] = HALF_BOARD_WIDTH;
    position[2] = -HALF_BOARD_WIDTH + (index - 24) * TILE_WIDTH;
  }
  
  return position;
};

// ===== 가변 크기 타일 위치 계산 (180도 회전된 보드 기준) =====
const getPositionDynamic = (
  index: number,
  board: { size?: { w?: number; d?: number }; width?: number; depth?: number }[]
): [number, number, number] => {
  const DEFAULT_W = TILE_WIDTH;
  const DEFAULT_D = TILE_WIDTH;
  const GAP = 0.1;

  const widths = board.map((t) => (t?.size?.w ?? t?.width ?? DEFAULT_W) + GAP);
  const depths = board.map((t) => (t?.size?.d ?? t?.depth ?? DEFAULT_D) + GAP);

  const B0 = 0,
    B1 = 8,
    L0 = 9,
    L1 = 16,
    T0 = 17,
    T1 = 24,
    R0 = 25,
    R1 = 31;
  const bottomWidth = widths.slice(B0, B1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const leftDepth = depths.slice(L0, L1 + 1).reduce((a, b) => a + b, 0) - GAP;

  const halfX = bottomWidth / 2;
  const halfZ = leftDepth / 2;

  const bottomPS = prefix(widths.slice(B0, B1 + 1));
  const leftPS = prefix(depths.slice(L0, L1 + 1));
  const topPS = prefix(widths.slice(T0, T1 + 1));
  const rightPS = prefix(depths.slice(R0, R1 + 1));

  if (index >= B0 && index <= B1) {
    const k = index - B0;
    const traveled = bottomPS[k] + (widths[k] - GAP) / 2;
    return [halfX - traveled, 0, halfZ];
  }
  if (index >= L0 && index <= L1) {
    const k = index - L0;
    const traveled = leftPS[k] + (depths[k + L0] - GAP) / 2;
    return [-halfX, 0, halfZ - traveled];
  }
  if (index >= T0 && index <= T1) {
    const k = index - T0;
    const traveled = topPS[k] + (widths[k + T0] - GAP) / 2;
    return [-halfX + traveled, 0, -halfZ];
  }
  const k = index - R0;
  const traveled = rightPS[k] + (depths[k + R0] - GAP) / 2;
  return [halfX, 0, -halfZ + traveled];
};

// ===== ✅ 수정된 텍스트 회전 계산 (왼쪽 타일만 180도 추가 회전) =====
const getTextRotationY = (index: number): number => {
  let rotation = 0;
  // 각 변의 기본 텍스트 방향 설정
  if (index >= 0 && index <= 8) rotation = 0;
  else if (index > 8 && index <= 16) rotation = Math.PI / 2;
  else if (index > 16 && index <= 24) rotation = Math.PI;
  else if (index > 24 && index <= 31) rotation = -Math.PI / 2;

  // 보드 전체를 180도 회전시킨 것에 맞춰 텍스트 방향 보정
  rotation += Math.PI;

  // ✅ 화면상 왼쪽 변(인덱스 25~31)에 해당하는 타일만 180도(PI) 추가로 뒤집습니다.
  if (index >= 0 && index <= 16) {
    rotation += Math.PI;
  }

  return rotation;
};

export function Board() {
  const board = useGameStore((state) => state.board);
  const floorTexture = useTexture(floorTextureUrl);
  const hasVariableSizes = board.some(
    (tile) => tile?.size || tile?.width || tile?.depth
  );

  return (
    <group>
      {board.map((tile, index) => {
        if (!tile) return null;

        const displayTile =
          index === 0
            ? { ...tile, name: "시작", type: "START" as const }
            : tile;

        const position = hasVariableSizes
          ? getPositionDynamic(index, board)
          : getPosition(index);

        const textRotationY = getTextRotationY(index);

        const w = tile?.size?.w ?? tile?.width ?? TILE_WIDTH;
        const d = tile?.size?.d ?? tile?.depth ?? TILE_DEPTH;

        // BaseTile props 안전하게 전달
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseTileProps: any = {
          tile: displayTile,
          tileIndex: index,
          position,
          textRotationY,
          width: w,
          depth: d,
          rotation: [0, textRotationY, 0],
        };

        return (
          <BaseTile key={index} {...baseTileProps}>
            {(displayTile.type === "city" ||
              displayTile.type === "company" ||
              displayTile.type === "NORMAL") && (
              <NormalTile tileIndex={index} />
            )}
            {displayTile.type === "chance" && (
              <ChanceTile
                tile={displayTile}
                {...(hasVariableSizes ? { width: w, depth: d } : {})}
              />
            )}
            {displayTile.type === "special" && (
              <SpecialTile
                tile={displayTile}
                {...(hasVariableSizes ? { width: w, depth: d } : {})}
              />
            )}
          </BaseTile>
        );
      })}

      {/* 중앙부 바닥 및 물리 바닥 (수정 없음) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial
          map={floorTexture}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[BOARD_SIZE, 0.4, BOARD_SIZE]} />
          <meshStandardMaterial color={"#1a1a35"} visible={false} />
        </mesh>
      </RigidBody>
    </group>
  );
}
