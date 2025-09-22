import { Cone, Sphere, Box, Torus } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../types/gameTypes'
import { useGameStore } from '../store/useGameStore'
import { useFrame } from '@react-three/fiber'
import { useUserStore } from '../../../stores/useUserStore'
import type { TileData } from '../data/boardData.ts'

// CSS 변수 값을 가져오는 함수
const getCSSVariable = (variableName: string) => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
};

const getTilePosition = (
  index: number,
  board: TileData[],
  playerIndex?: number,
  totalPlayers?: number
): [number, number, number] => {
  const DEFAULT_W = 4;
  const DEFAULT_D = 4; // 6에서 4로 수정 (Board.tsx와 일치)
  const GAP = 0.1;

  const widths = board.map((t) => (t?.size?.w ?? DEFAULT_W) + GAP);
  const depths = board.map((t) => (t?.size?.d ?? DEFAULT_D) + GAP);

  const B0 = 0, B1 = 8;
  const L0 = 9, L1 = 16;
  const T0 = 17, T1 = 24;
  const R0 = 25, R1 = 31;

  const bottomWidth = widths.slice(B0, B1 + 1).reduce((a, b) => a + b, 0) - GAP;
  const leftDepth = depths.slice(L0, L1 + 1).reduce((a, b) => a + b, 0) - GAP;

  const halfX = bottomWidth / 2;
  const halfZ = leftDepth / 2;

  const prefix = (arr: number[]) => arr.map((_, i) => arr.slice(0, i).reduce((a, b) => a + b, 0));

  const bottomPS = prefix(widths.slice(B0, B1 + 1));
  const leftPS = prefix(depths.slice(L0, L1 + 1));
  const topPS = prefix(widths.slice(T0, T1 + 1));
  const rightPS = prefix(depths.slice(R0, R1 + 1));

  let x = 0, z = 0;
  const safeIndex = (typeof index === 'number' && index >= 0 && index <= 31) ? index : 0;

  if (safeIndex >= B0 && safeIndex <= B1) {
    const k = safeIndex - B0;
    const traveled = bottomPS[k] + (widths[k] - GAP) / 2;
    x = halfX - traveled;
    z = -halfZ;
  } else if (safeIndex >= L0 && safeIndex <= L1) {
    const k = safeIndex - L0;
    const traveled = leftPS[k] + (depths[k + L0] - GAP) / 2;
    x = -halfX;
    z = -halfZ + traveled;
  } else if (safeIndex >= T0 && safeIndex <= T1) {
    const k = safeIndex - T0;
    const traveled = topPS[k] + (widths[k + T0] - GAP) / 2;
    x = -halfX + traveled;
    z = halfZ;
  } else {
    const k = safeIndex - R0;
    const traveled = rightPS[k] + (depths[k + R0] - GAP) / 2;
    x = halfX;
    z = halfZ - traveled;
  }

  const position: [number, number, number] = [x, 0, z];

  if (playerIndex !== undefined && playerIndex >= 0) {
    const offsetDistance = 0.4;
    const safePlayerIndex = Math.max(0, playerIndex);
    const playerCount = Math.max(1, totalPlayers || 4);

    if (safePlayerIndex !== 0) {
      const angle = (safePlayerIndex * 2 * Math.PI) / Math.max(playerCount - 1, 3);
      const offsetX = Math.cos(angle) * offsetDistance;
      const offsetZ = Math.sin(angle) * offsetDistance;
      position[0] += offsetX;
      position[2] += offsetZ;
    }
  }

  // 타일 높이(0.5) + 플레이어 모델 높이의 절반(약 0.4~0.5)
  position[1] = 0.9; // Set Y position to be above the board
  return position;
};

const calculatePath = (
  start: number,
  end: number,
  diceSum: number,
  board: TileData[],
  playerIndex?: number,
  totalPlayers?: number
): [number, number, number][] => {
  const path: [number, number, number][] = [];
  const boardLength = board.length;

  try {
    if (diceSum === 0) {
      return [getTilePosition(end, board, playerIndex, totalPlayers)];
    }

    for (let i = 1; i <= diceSum; i++) {
      const nextIndex = (start + i) % boardLength;
      path.push(getTilePosition(nextIndex, board, playerIndex, totalPlayers));
    }

    if (path.length === 0 && start !== end) {
      path.push(getTilePosition(end, board, playerIndex, totalPlayers));
    }
  } catch (error) {
    path.push(getTilePosition(end, board, playerIndex, totalPlayers));
  }

  return path;
};

interface PlayerProps {
  player: PlayerData
}

export function Player({ player }: PlayerProps) {
  const handleTileAction = useGameStore(state => state.handleTileAction);
  const gamePhase = useGameStore(state => state.gamePhase);
  const dice = useGameStore(state => state.dice);
  const board = useGameStore(state => state.board);
  const players = useGameStore(state => state.players);

  const prevPositionRef = useRef(player?.position || 0);
  const meshRef = useRef<THREE.Mesh>(null!);
  const isAnimatingRef = useRef(false);

  const playerIndex = players ? players.findIndex(p => p.id === player.id) : -1;
  const safePlayerIndex = playerIndex >= 0 ? playerIndex : 0;

  const initialVisualPosition = player && players ? getTilePosition(player.position, board, safePlayerIndex, players.length) : [0, 0.5, 0] as [number, number, number];

  const [springs, api] = useSpring(() => ({
    position: initialVisualPosition,
    config: { duration: 200 },
  }));

  useEffect(() => {
    if (!player || !players) return;
    const correctPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);
    api.set({ position: correctPosition });
    prevPositionRef.current = player.position;
  }, [api, player, players, safePlayerIndex, board]);

  useEffect(() => {
    if (!player || !players) return;
    const targetPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);
    const currentUser = useUserStore.getState().userInfo;
    const currentPlayer = useGameStore.getState().players.find(p => p.id === useGameStore.getState().currentPlayerId);
    const isThisPlayersTurn = currentPlayer?.id === player.id;
    const isMyPlayer = currentUser?.userId === player.id;

    if (player.position !== prevPositionRef.current) {
      if (isThisPlayersTurn && gamePhase === 'MOVING_PLAYER') {
        const diceSum = dice[0] + dice[1];
        const path = calculatePath(prevPositionRef.current, player.position, diceSum, board, safePlayerIndex, players.length);

        isAnimatingRef.current = true;

        api.start({
          from: getTilePosition(prevPositionRef.current, board, safePlayerIndex, players.length),
          to: async (next) => {
            for (const pos of path) {
              await next({ position: pos });
            }
          },
          config: { duration: path.length > 1 ? 200 : 400 },
          onRest: () => {
            isAnimatingRef.current = false;
            prevPositionRef.current = player.position;
            if (isMyPlayer && isThisPlayersTurn && useGameStore.getState().gamePhase === 'MOVING_PLAYER') {
              handleTileAction();
            }
          }
        });
      } else if (gamePhase === 'TILE_EVENT' && isThisPlayersTurn) {
        isAnimatingRef.current = true;

        api.start({
          position: targetPosition,
          config: { duration: 800 },
          onRest: () => {
            isAnimatingRef.current = false;
            prevPositionRef.current = player.position;
          }
        });
      } else {
        api.set({ position: targetPosition });
        prevPositionRef.current = player.position;
      }
    }
  }, [player.position, api, board, dice, gamePhase, handleTileAction, player.id, safePlayerIndex, players, players.length]);

  useFrame(() => {
    if (meshRef.current && !isAnimatingRef.current && player && players) {
      const actualPosition = meshRef.current.position;
      const expectedPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);
      const springValue = springs.position.get();

      const positionMismatch =
        Math.abs(actualPosition.x - expectedPosition[0]) > 0.1 ||
        Math.abs(actualPosition.y - expectedPosition[1]) > 0.1 ||
        Math.abs(actualPosition.z - expectedPosition[2]) > 0.1;

      const springMismatch =
        Math.abs(springValue[0] - expectedPosition[0]) > 0.1 ||
        Math.abs(springValue[1] - expectedPosition[1]) > 0.1 ||
        Math.abs(springValue[2] - expectedPosition[2]) > 0.1;

      if (positionMismatch || springMismatch) {
        api.set({ position: expectedPosition });
        prevPositionRef.current = player.position;
        meshRef.current.position.set(expectedPosition[0], expectedPosition[1], expectedPosition[2]);
      }
    }
  });

  // Input validation - return null after all hooks have been called
  if (!player || !players || players.length === 0) {
    return null;
  }

  return (
    <animated.mesh ref={meshRef} position={springs.position as unknown as [number, number, number]} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="#4A90E2" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="#E74C3C" /></Sphere>}
      {player.character === 'box' && <Box args={[0.8, 0.8, 0.8]}><meshStandardMaterial color="#F39C12" /></Box>}
      {player.character === 'torus' && <Torus args={[0.5, 0.2, 8, 16]}><meshStandardMaterial color="#9B59B6" /></Torus>}
    </animated.mesh>
  )
}