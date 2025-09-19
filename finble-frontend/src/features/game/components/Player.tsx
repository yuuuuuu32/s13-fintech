import { Cone, Sphere, Box, Torus } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../types/gameTypes.ts'
import { useGameStore } from '../store/useGameStore.ts'
import { useFrame } from '@react-three/fiber'
import { useUserStore } from '../../../stores/useUserStore.ts'
import type { TileData } from '../data/boardData.ts'

const getTilePosition = (
  index: number,
  board: TileData[],
  playerIndex?: number,
  totalPlayers?: number
): [number, number, number] => {
  const DEFAULT_W = 4;
  const DEFAULT_D = 6;
  const TILES_PER_SIDE = 9;

  const widths = board.map((t) => t?.size?.w ?? DEFAULT_W);
  const depths = board.map((t) => t?.size?.d ?? DEFAULT_D);

  const corners = [0, 8, 16, 24, 32];

  const sideIndices = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const sides = [
    sideIndices(corners[0], corners[1]),
    sideIndices(corners[1], corners[2]),
    sideIndices(corners[2], corners[3]),
    sideIndices(corners[3], corners[4] - 1),
  ];

  const prefix = (arr: number[]) =>
    arr.map((_, i) => arr.slice(0, i).reduce((a, b) => a + b, 0));

  const HALF = (TILES_PER_SIDE * DEFAULT_W) / 2;

  const makeSideCenters = (idxs: number[], along: 'x' | 'z') => {
    const lens = idxs.map((i) => (along === 'x' ? widths[i] : depths[i]));
    const ps = prefix(lens);
    const centerAt = (k: number) => ps[k] + lens[k] / 2;
    return { centerAt };
  };

  const bottom = makeSideCenters(sides[0], 'x');
  const left = makeSideCenters(sides[1], 'z');
  const top = makeSideCenters(sides[2], 'x');
  const right = makeSideCenters(sides[3], 'z');

  let x = 0, z = 0;
  const safeIndex = (typeof index === 'number' && index >= 0 && index <= 31) ? index : 0;

  if (safeIndex >= sides[0][0] && safeIndex <= sides[0][sides[0].length - 1]) {
    const k = safeIndex - sides[0][0];
    x = HALF - bottom.centerAt(k);
    z = -HALF;
  } else if (safeIndex >= sides[1][0] && safeIndex <= sides[1][sides[1].length - 1]) {
    const k = safeIndex - sides[1][0];
    x = -HALF;
    z = -HALF + left.centerAt(k);
  } else if (safeIndex >= sides[2][0] && safeIndex <= sides[2][sides[2].length - 1]) {
    const k = safeIndex - sides[2][0];
    x = -HALF + top.centerAt(k);
    z = HALF;
  } else {
    const k = safeIndex - sides[3][0];
    x = HALF;
    z = HALF - right.centerAt(k);
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

  position[1] = 0.5; // Set Y position to be above the board
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

  if (!player || !players || players.length === 0) {
    return null;
  }

  const prevPositionRef = useRef(player.position);
  const meshRef = useRef<THREE.Mesh>(null!);
  const isAnimatingRef = useRef(false);

  const playerIndex = players.findIndex(p => p.id === player.id);
  const safePlayerIndex = playerIndex >= 0 ? playerIndex : 0;

  const initialVisualPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);

  const [springs, api] = useSpring(() => ({
    position: initialVisualPosition,
    config: { duration: 200 },
  }));

  useEffect(() => {
    const correctPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);
    api.set({ position: correctPosition });
    prevPositionRef.current = player.position;
  }, []);

  useEffect(() => {
    const targetPosition = getTilePosition(player.position, board, safePlayerIndex, players.length);
    const currentUser = useUserStore.getState().userInfo;
    const currentPlayer = useGameStore.getState().players[useGameStore.getState().currentPlayerIndex];
    const isThisPlayersTurn = currentPlayer?.id === player.id;
    const isMyPlayer = currentUser?.userId === player.id;

    if (player.position !== prevPositionRef.current) {
      if (isThisPlayersTurn && gamePhase === 'PLAYER_MOVING') {
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
            if (isMyPlayer && isThisPlayersTurn && useGameStore.getState().gamePhase === 'PLAYER_MOVING') {
              handleTileAction();
            }
          }
        });
      } else if (gamePhase === 'TILE_ACTION' && isThisPlayersTurn) {
        isAnimatingRef.current = true;

        api.start({
          position: targetPosition,
          config: { duration: 800 },
          onRest: () => {
            isAnimatingRef.current = false;
            prevPositionRef.current = player.position;
          }
        });
      } else if (isThisPlayersTurn) {
        api.set({ position: targetPosition });
        prevPositionRef.current = player.position;
      } else {
        // Not this player's turn - keep the piece in its current position
      }
    }
  }, [player.position, api, board, dice, gamePhase, handleTileAction, player.id, safePlayerIndex, players.length]);

  useFrame(() => {
    if (meshRef.current && !isAnimatingRef.current) {
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

  return (
    <animated.mesh ref={meshRef} position={springs.position as unknown as [number, number, number]} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="#4A90E2" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="#E74C3C" /></Sphere>}
      {player.character === 'box' && <Box args={[0.8, 0.8, 0.8]}><meshStandardMaterial color="#F39C12" /></Box>}
      {player.character === 'torus' && <Torus args={[0.5, 0.2, 8, 16]}><meshStandardMaterial color="#9B59B6" /></Torus>}
    </animated.mesh>
  )
}
