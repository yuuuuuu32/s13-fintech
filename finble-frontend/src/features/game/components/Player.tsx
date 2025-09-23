import React, { useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { Cone, Sphere, Box, Torus } from '@react-three/drei';
import * as THREE from 'three';

// --- 타입 및 스토어 import ---
import type { Player as PlayerData } from '../types/gameTypes.ts';
import type { TileData } from '../data/boardData.ts';
// FIX: Corrected the import path for useGameStore
import { useGameStore } from '../store/useGameStore.ts';
import { useUserStore } from '../../../stores/useUserStore.ts';

// --- Props 타입 정의 ---
interface PlayerProps {
  player: PlayerData;
}

// ============================================================================
// HELPER FUNCTIONS (위치 계산 헬퍼 함수)
// ============================================================================

/**
 * 누적 합 배열을 계산하는 유틸리티 함수 (가변 타일 크기 계산용)
 */
const prefix = (arr: number[]) => arr.map((_, i) => arr.slice(0, i).reduce((a, b) => a + b, 0));

/**
 * 타일 인덱스와 보드 데이터를 기반으로 플레이어의 3D 위치를 계산합니다.
 * @param index 타일 인덱스 (0-31)
 * @param board 전체 보드 데이터 배열
 * @param playerIndex 현재 플레이어의 순서 인덱스 (같은 칸에 여러 명 있을 때 겹치지 않게 함)
 * @param totalPlayers 총 플레이어 수
 * @returns [x, y, z] 좌표 배열
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

  const widths = board.map((t) => (t?.size?.w ?? DEFAULT_W) + GAP);
  const depths = board.map((t) => (t?.size?.d ?? DEFAULT_D) + GAP);

  const B0 = 0, B1 = 8, L0 = 9, L1 = 16, T0 = 17, T1 = 24, R0 = 25, R1 = 31;

  const bottomWidth = widths.slice(B0, B1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const leftDepth = depths.slice(L0, L1 + 1).reduce((a, b) => a + b, 0) - GAP;

  const halfX = bottomWidth / 2;
  const halfZ = leftDepth / 2;

  const bottomPS = prefix(widths.slice(B0, B1 + 1));
  const leftPS = prefix(depths.slice(L0, L1 + 1));
  const topPS = prefix(widths.slice(T0, T1 + 1));
  const rightPS = prefix(depths.slice(R0, R1 + 1));

  let x = 0, z = 0;
  const safeIndex = (typeof index === 'number' && index >= 0 && index <= 31) ? index : 0;

  if (safeIndex >= B0 && safeIndex <= B1) {
    const k = safeIndex - B0;
    x = halfX - (bottomPS[k] + (widths[k] - GAP) / 2);
    z = -halfZ;
  } else if (safeIndex >= L0 && safeIndex <= L1) {
    const k = safeIndex - L0;
    x = -halfX;
    z = -halfZ + (leftPS[k] + (depths[k + L0] - GAP) / 2);
  } else if (safeIndex >= T0 && safeIndex <= T1) {
    const k = safeIndex - T0;
    x = -halfX + (topPS[k] + (widths[k + T0] - GAP) / 2);
    z = halfZ;
  } else {
    const k = safeIndex - R0;
    x = halfX;
    z = halfZ - (rightPS[k] + (depths[k + R0] - GAP) / 2);
  }

  const position: [number, number, number] = [x, 0.9, z]; // 높이는 0.9로 고정

  // 같은 칸에 여러 플레이어가 있을 경우 원형으로 배치
  if (playerIndex > 0) {
    const offsetDistance = 0.4;
    const angle = (playerIndex * 2 * Math.PI) / Math.max(totalPlayers - 1, 3);
    position[0] += Math.cos(angle) * offsetDistance;
    position[2] += Math.sin(angle) * offsetDistance;
  }
  
  return position;
};

/**
 * 시작 위치부터 끝 위치까지 이동 경로를 계산합니다.
 * @returns 경로 상의 모든 타일 위치 좌표 배열
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
  if (diceSum === 0 || !boardLength) {
    const endPosition = getTilePosition(start, board, playerIndex, totalPlayers);
    return [endPosition];
  }

  for (let i = 1; i <= diceSum; i++) {
    const nextIndex = (start + i) % boardLength;
    path.push(getTilePosition(nextIndex, board, playerIndex, totalPlayers));
  }
  return path;
};

// ============================================================================
// PLAYER COMPONENT (플레이어 컴포넌트)
// ============================================================================
export function Player({ player }: PlayerProps) {
  // --- 스토어에서 상태 및 함수 가져오기 ---
  const { gamePhase, dice, board, players, currentPlayerId, handleTileAction } = useGameStore();
  const { userInfo } = useUserStore();

  // --- Ref 참조 ---
  const prevPositionRef = useRef(player.position);
  const meshRef = useRef<THREE.Mesh>(null!);
  const isAnimatingRef = useRef(false);

  // --- 플레이어 정보 계산 ---
  const playerIndex = players.findIndex(p => p.id === player.id);
  const isMyPlayer = userInfo?.userId === player.id;
  const isThisPlayersTurn = currentPlayerId === player.id;

  // --- 애니메이션 설정 ---
  const initialPosition = getTilePosition(player.position, board, playerIndex, players.length);
  const [springs, api] = useSpring(() => ({
    position: initialPosition,
    config: { duration: 200 },
  }));

  // --- 이펙트 훅 ---

  // 플레이어 위치가 상태와 다를 때 즉시 동기화 (순간이동 등)
  useEffect(() => {
    const correctPosition = getTilePosition(player.position, board, playerIndex, players.length);
    api.set({ position: correctPosition });
    prevPositionRef.current = player.position;
  }, [api, player.position, board, playerIndex, players.length]);


  // 게임 상태에 따른 플레이어 이동 애니메이션 처리
  useEffect(() => {
    // 이동할 필요가 없으면 중단
    if (player.position === prevPositionRef.current || !isThisPlayersTurn) return;

    // FIX: gamePhase 이름을 최신 버전으로 통일 ('MOVING_PLAYER', 'TILE_EVENT')
    if (gamePhase === 'MOVING_PLAYER') {
      // 주사위 이동 애니메이션
      const diceSum = dice[0] + dice[1];
      const path = calculatePath(prevPositionRef.current, diceSum, board, playerIndex, players.length);
      
      isAnimatingRef.current = true;
      api.start({
        to: async (next) => {
          for (const pos of path) {
            await next({ position: pos });
          }
        },
        config: { duration: path.length > 1 ? 200 : 400 },
        onRest: () => {
          isAnimatingRef.current = false;
          if (isMyPlayer) {
            handleTileAction();
          }
        },
      });
    } else if (gamePhase === 'TILE_EVENT') {
      // 찬스카드/특수타일 이동 애니메이션 (부드럽게)
      const targetPosition = getTilePosition(player.position, board, playerIndex, players.length);
      isAnimatingRef.current = true;
      api.start({
        to: { position: targetPosition },
        config: { duration: 800 },
        onRest: () => { isAnimatingRef.current = false; }
      });
    }

    // 애니메이션 후 이전 위치 업데이트
    prevPositionRef.current = player.position;

  }, [player.position, gamePhase, isThisPlayersTurn, isMyPlayer, handleTileAction, api, board, dice, playerIndex, players.length]);
  
  // 렌더링 프레임마다 위치 보정 (애니메이션과 상태 불일치 방지)
  useFrame(() => {
    if (meshRef.current && !isAnimatingRef.current) {
        const expectedPosition = getTilePosition(player.position, board, playerIndex, players.length);
        const actualPosition = meshRef.current.position;

        if (actualPosition.distanceTo(new THREE.Vector3(...expectedPosition)) > 0.1) {
            api.set({ position: expectedPosition });
        }
    }
  });


  // --- 렌더링 ---
  if (!player) return null;

  const characterColors = {
    'cone': '#4A90E2',
    'sphere': '#E74C3C',
    'box': '#F39C12',
    'torus': '#9B59B6'
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <animated.mesh ref={meshRef} position={springs.position as any} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color={characterColors.cone} /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color={characterColors.sphere} /></Sphere>}
      {player.character === 'box' && <Box args={[0.8, 0.8, 0.8]}><meshStandardMaterial color={characterColors.box} /></Box>}
      {player.character === 'torus' && <Torus args={[0.5, 0.2, 8, 16]}><meshStandardMaterial color={characterColors.torus} /></Torus>}
    </animated.mesh>
  );
}

