import React, { useEffect, useRef } from "react";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";

// --- 타입 및 스토어 import ---
import type { Player as PlayerData } from "../types/gameTypes.ts";
import type { TileData } from "../data/boardData.ts";
import { useGameStore } from "../store/useGameStore.ts";
import { useUserStore } from "../../../stores/useUserStore.ts";
import { PixelPlayer } from "./PixelPlayer";

// --- Props 타입 정의 ---
interface PlayerProps {
  player: PlayerData;
}

// ============================================================================
// ✅ HELPER FUNCTIONS (위치 계산 헬퍼 함수) - 이 섹션이 수정되었습니다.
// ============================================================================

/**
 * 누적 합 배열을 계산하는 유틸리티 함수 (가변 타일 크기 계산용)
 */
const prefix = (arr: number[]) =>
  arr.map((_, i) => arr.slice(0, i).reduce((a, b) => a + b, 0));

/**
 * 타일 인덱스와 보드 데이터를 기반으로 플레이어의 3D 위치를 계산합니다. (180도 회전된 로직 적용)
 */
const getTilePosition = (
  index: number,
  board: TileData[],
  playerIndex: number = 0,
  totalPlayers: number = 1
): [number, number, number] => {
  const DEFAULT_W = 4;
  const DEFAULT_D = 4;
  const GAP = 0.1;

  if (!board || board.length === 0) {
    return [0, 0.9, 0];
  }

  const boardLength = board.length;
  const safeIndex = Math.max(0, Math.min(index, boardLength - 1));

  const widths = board.map((t) => (t?.size?.w ?? DEFAULT_W) + GAP);
  const depths = board.map((t) => (t?.size?.d ?? DEFAULT_D) + GAP);

  const B0 = 0,
    B1 = Math.min(8, boardLength - 1);
  const L0 = Math.min(9, boardLength - 1),
    L1 = Math.min(16, boardLength - 1);
  const T0 = Math.min(17, boardLength - 1),
    T1 = Math.min(24, boardLength - 1);
  const R0 = Math.min(25, boardLength - 1),
    R1 = Math.min(31, boardLength - 1);

  const bottomWidth = widths.slice(B0, B1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const leftDepth = depths.slice(L0, L1 + 1).reduce((a, b) => a + b, 0) - GAP;

  const halfX = bottomWidth / 2;
  const halfZ = leftDepth / 2;

  const bottomPS = prefix(widths.slice(B0, B1 + 1));
  const leftPS = prefix(depths.slice(L0, L1 + 1));
  const topPS = prefix(widths.slice(T0, T1 + 1));
  const rightPS = prefix(depths.slice(R0, R1 + 1));

  let x = 0,
    z = 0;

  // Board.tsx와 동일하게 180도 회전된 좌표 계산 로직
  if (safeIndex >= B0 && safeIndex <= B1) {
    // 시작 ~ 감옥 (화면 아래쪽)
    const k = safeIndex - B0;
    const traveled = bottomPS[k] + (widths[safeIndex] - GAP) / 2;
    x = halfX - traveled;
    z = halfZ;
  } else if (safeIndex >= L0 && safeIndex <= L1) {
    // 감옥 ~ 세계여행 (화면 오른쪽)
    const k = safeIndex - L0;
    const traveled = leftPS[k] + (depths[safeIndex] - GAP) / 2;
    x = -halfX;
    z = halfZ - traveled;
  } else if (safeIndex >= T0 && safeIndex <= T1) {
    // 세계여행 ~ 국세청 (화면 위쪽)
    const k = safeIndex - T0;
    const traveled = topPS[k] + (widths[safeIndex] - GAP) / 2;
    x = -halfX + traveled;
    z = -halfZ;
  } else if (safeIndex >= R0 && safeIndex <= R1) {
    // 국세청 ~ 시작 (화면 왼쪽)
    const k = safeIndex - R0;
    const traveled = rightPS[k] + (depths[safeIndex] - GAP) / 2;
    x = halfX;
    z = -halfZ + traveled;
  }

  if (!isFinite(x) || !isFinite(z)) {
    x = 0;
    z = 0;
  }

  const position: [number, number, number] = [x, 0.9, z];

  if (playerIndex > 0 && totalPlayers > 1) {
    const offsetDistance = Math.min(0.3, 0.8 / totalPlayers);
    const angle = (playerIndex * 2 * Math.PI) / Math.max(totalPlayers, 3);
    const offsetX = Math.cos(angle) * offsetDistance;
    const offsetZ = Math.sin(angle) * offsetDistance;
    if (isFinite(offsetX) && isFinite(offsetZ)) {
      position[0] += offsetX;
      position[2] += offsetZ;
    }
  }
  return position;
};

/**
 * 시작 위치부터 끝 위치까지 이동 경로를 계산합니다.
 */
const calculatePath = (
  start: number,
  diceSum: number,
  board: TileData[],
  playerIndex: number,
  totalPlayers: number
): [number, number, number][] => {
  const path: [number, number, number][] = [];
  const boardLength = board.length;
  if (diceSum === 0 || !boardLength || boardLength === 0) {
    const endPosition = getTilePosition(
      start,
      board,
      playerIndex,
      totalPlayers
    );
    return [endPosition];
  }

  const safeStart = Math.max(0, Math.min(start, boardLength - 1));

  for (let i = 1; i <= diceSum; i++) {
    const nextIndex = (safeStart + i) % boardLength;
    path.push(getTilePosition(nextIndex, board, playerIndex, totalPlayers));
  }
  return path;
};

// ============================================================================
// PLAYER COMPONENT (플레이어 컴포넌트) - 이 부분은 수정사항 없음
// ============================================================================
export function Player({ player }: PlayerProps) {
  // --- 스토어에서 상태 및 함수 가져오기 ---
  const {
    gamePhase,
    dice,
    board,
    players,
    currentPlayerId,
    handleTileAction,
    isModalOpen,
  } = useGameStore();
  const { userInfo } = useUserStore();

  // --- 이동 애니메이션을 위한 Ref ---
  const meshRef = useRef<THREE.Mesh>(null!);
  const isAnimatingRef = useRef(false);
  const prevPositionRef = useRef(player.position);

  // --- 플레이어 정보 계산 ---
  const playerIndex = players.findIndex((p) => p.id === player.id);
  const isMyPlayer = userInfo?.userId === player.id;
  const isThisPlayersTurn = currentPlayerId === player.id;

  // --- 이동 애니메이션 스프링 (타일 간 이동시에만 사용) ---
  const [springs, api] = useSpring(() => ({
    position: [0, 0, 0] as [number, number, number],
    config: { duration: 200 },
  }));

  // --- 찬스카드 등으로 인한 즉시 위치 변화 감지 (모든 플레이어) ---
  useEffect(() => {
    if (!board || board.length === 0) return;

    const safeCurrentPosition = Math.max(0, Math.min(player.position, board.length - 1));
    const safePrevPosition = Math.max(0, Math.min(prevPositionRef.current, board.length - 1));

    // 위치가 변경되었고, 현재 MOVING_PLAYER 페이즈가 아닐 때 (찬스카드 등)
    if (safeCurrentPosition !== safePrevPosition && gamePhase !== "MOVING_PLAYER") {
      console.log(`🎲 [POSITION_UPDATE] ${player.name}님 즉시 위치 변경:`, {
        from: safePrevPosition,
        to: safeCurrentPosition,
        gamePhase,
        reason: "찬스카드 등"
      });

      // 즉시 위치 업데이트 (애니메이션 없이)
      const newPosition = getTilePosition(safeCurrentPosition, board, playerIndex, players.length);
      api.set({ position: newPosition });
      prevPositionRef.current = player.position;
    }
  }, [player.position, board, gamePhase, playerIndex, players.length, api, player.name]);

  // --- 이동 애니메이션 이펙트 (MOVING_PLAYER 상태에서만 실행) ---
  useEffect(() => {
    if (isModalOpen || isAnimatingRef.current || !board || board.length === 0) return;
    if (!isThisPlayersTurn || gamePhase !== "MOVING_PLAYER") return;

    const safeCurrentPosition = Math.max(0, Math.min(player.position, board.length - 1));
    const safePrevPosition = Math.max(0, Math.min(prevPositionRef.current, board.length - 1));

    if (safeCurrentPosition === safePrevPosition) return;

    const diceSum = dice[0] + dice[1];
    const path = calculatePath(
      safePrevPosition,
      diceSum,
      board,
      playerIndex,
      players.length
    );

    const validPath = path.filter((pos) => pos.every((coord) => isFinite(coord)));
    if (validPath.length === 0) return;

    // 애니메이션 시작 - 시작 위치 설정
    const startPosition = getTilePosition(safePrevPosition, board, playerIndex, players.length);
    api.set({ position: startPosition });
    isAnimatingRef.current = true;

    api.start({
      to: async (next) => {
        for (const pos of validPath) {
          if (isModalOpen) {
            isAnimatingRef.current = false;
            return;
          }
          await next({ position: pos });
        }
      },
      config: { duration: validPath.length > 1 ? 200 : 400 },
      onRest: () => {
        isAnimatingRef.current = false;
        prevPositionRef.current = safeCurrentPosition;
        if (isMyPlayer && !isModalOpen) {
          handleTileAction();
        }
      },
    });
  }, [player.position, gamePhase, isThisPlayersTurn, isMyPlayer, api, board, dice, playerIndex, players.length, isModalOpen, handleTileAction]);

  // --- 이동 완료 후 위치 업데이트 ---
  useEffect(() => {
    if (!isAnimatingRef.current) {
      prevPositionRef.current = player.position;
    }
  }, [player.position]);

  // --- 렌더링: 이동 애니메이션 중일 때만 렌더링 ---
  if (!player || !isAnimatingRef.current) return null;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <animated.mesh ref={meshRef} position={springs.position as any} castShadow>
      <PixelPlayer character={player.character} />
    </animated.mesh>
  );
}

