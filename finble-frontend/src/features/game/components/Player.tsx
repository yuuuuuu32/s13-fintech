import { Cone, Sphere, Box, Torus } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../types/gameTypes'
import { useGameStore } from '../store/useGameStore'
import { useFrame } from '@react-three/fiber'
import { useUserStore } from '../../../stores/useUserStore'


const getTilePosition = (index: number, playerIndex?: number, totalPlayers?: number): [number, number, number] => {
  const TILE_WIDTH = 3;
  const TILES_PER_SIDE = 8; // Corner to corner
  const HALF_BOARD_WIDTH = TILES_PER_SIDE * TILE_WIDTH / 2; // 12

  const position: [number, number, number] = [0, 0, 0];

  // 안전한 인덱스 처리
  const safeIndex = (typeof index === 'number' && index >= 0 && index <= 31) ? index : 0;

  try {
    if (safeIndex >= 0 && safeIndex <= 8) { // Bottom row (moves left)
      position[0] = HALF_BOARD_WIDTH - safeIndex * TILE_WIDTH;
      position[2] = -HALF_BOARD_WIDTH;
    } else if (safeIndex > 8 && safeIndex <= 16) { // Left column (moves up)
      position[0] = -HALF_BOARD_WIDTH;
      position[2] = -HALF_BOARD_WIDTH + (safeIndex - 8) * TILE_WIDTH;
    } else if (safeIndex > 16 && safeIndex <= 24) { // Top row (moves right)
      position[0] = -HALF_BOARD_WIDTH + (safeIndex - 16) * TILE_WIDTH;
      position[2] = HALF_BOARD_WIDTH;
    } else if (safeIndex > 24 && safeIndex <= 31) { // Right column (moves down)
      position[0] = HALF_BOARD_WIDTH;
      position[2] = HALF_BOARD_WIDTH - (safeIndex - 24) * TILE_WIDTH;
    }

    // 플레이어별 동적 오프셋 적용 (무제한 플레이어 지원)
    if (playerIndex !== undefined && playerIndex >= 0) {
      const offsetDistance = 0.4;
      const safePlayerIndex = Math.max(0, playerIndex); // 음수 방지
      const playerCount = Math.max(1, totalPlayers || 4); // 기본값 4명

      if (safePlayerIndex === 0) {
        // 첫 번째 플레이어는 중앙
        // 오프셋 없음
      } else {
        // 나머지 플레이어들은 원형으로 배치
        const angle = (safePlayerIndex * 2 * Math.PI) / Math.max(playerCount - 1, 3);
        const offsetX = Math.cos(angle) * offsetDistance;
        const offsetZ = Math.sin(angle) * offsetDistance;

        position[0] += offsetX;
        position[2] += offsetZ;
      }

    }
  } catch (error) {
    // 안전한 기본 위치 반환
    position[0] = 0;
    position[2] = 0;
  }

  position[1] = 0.5; // Set Y position to be above the board
  return position;
};

const calculatePath = (start: number, end: number, diceSum: number, boardLength: number, playerIndex?: number, totalPlayers?: number): [number, number, number][] => {
  const path: [number, number, number][] = [];

  try {
    if (diceSum === 0) {
        return [getTilePosition(end, playerIndex, totalPlayers)];
    }

    for (let i = 1; i <= diceSum; i++) {
      const nextIndex = (start + i) % boardLength;
      path.push(getTilePosition(nextIndex, playerIndex, totalPlayers));
    }

    if (path.length === 0 && start !== end) {
        path.push(getTilePosition(end, playerIndex, totalPlayers));
    }
  } catch (error) {
    // 안전한 기본 경로 반환
    path.push(getTilePosition(end, playerIndex, totalPlayers));
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
  const boardLength = useGameStore(state => state.board.length);
  const players = useGameStore(state => state.players);

  // Input validation
  if (!player || !players || players.length === 0) {
    return null;
  }

  // Use stable visual position tracking that survives component remounts
  const prevPositionRef = useRef(player.position);
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for the animated mesh
  const isAnimatingRef = useRef(false); // Track if animation is in progress

  // Get player index for position offset (safe handling for -1)
  const playerIndex = players.findIndex(p => p.id === player.id);
  const safePlayerIndex = playerIndex >= 0 ? playerIndex : 0;

  // Calculate the initial position BEFORE useSpring to ensure consistency
  const initialVisualPosition = getTilePosition(player.position, safePlayerIndex, players.length);

  // Initialize useSpring with the player's current position
  const [springs, api] = useSpring(() => ({
    position: initialVisualPosition, // Use pre-calculated position
    config: { duration: 200 },
  }));


  // Force correct position on component mount to prevent visual reset
  useEffect(() => {
    const correctPosition = getTilePosition(player.position, safePlayerIndex, players.length);
    api.set({ position: correctPosition });
    prevPositionRef.current = player.position;
  }, []);

  // This useEffect will handle all position updates
  useEffect(() => {
    const targetPosition = getTilePosition(player.position, safePlayerIndex, players.length);
    const currentUser = useUserStore.getState().userInfo;
    const currentPlayer = useGameStore.getState().players[useGameStore.getState().currentPlayerIndex];
    const isThisPlayersTurn = currentPlayer?.id === player.id;
    const isMyPlayer = currentUser?.userId === player.id;

    // Only animate if the player's position has actually changed in the state
    if (player.position !== prevPositionRef.current) {
      if (isThisPlayersTurn && gamePhase === 'PLAYER_MOVING') {
        // This is a dice roll move, animate step-by-step
        const diceSum = dice[0] + dice[1];
        const path = calculatePath(prevPositionRef.current, player.position, diceSum, boardLength, safePlayerIndex, players.length);

        isAnimatingRef.current = true; // Start animation flag

        api.start({
          from: getTilePosition(prevPositionRef.current, safePlayerIndex, players.length),
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
        // This is a chance card or special tile movement, animate with smooth transition

        isAnimatingRef.current = true; // Start animation flag

        api.start({
          position: targetPosition,
          config: { duration: 800 }, // Smoother transition for chance card moves
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
  }, [player.position, api, boardLength, dice, gamePhase, handleTileAction, player.id, safePlayerIndex, players.length]);

  useFrame(() => {
    if (meshRef.current && !isAnimatingRef.current) {
      const actualPosition = meshRef.current.position;
      const expectedPosition = getTilePosition(player.position, safePlayerIndex, players.length);
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