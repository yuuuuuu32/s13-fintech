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

  try {
    if (index >= 0 && index <= 8) { // Bottom row (moves left)
      position[0] = HALF_BOARD_WIDTH - index * TILE_WIDTH;
      position[2] = -HALF_BOARD_WIDTH;
    } else if (index > 8 && index <= 16) { // Left column (moves up)
      position[0] = -HALF_BOARD_WIDTH;
      position[2] = -HALF_BOARD_WIDTH + (index - 8) * TILE_WIDTH;
    } else if (index > 16 && index <= 24) { // Top row (moves right)
      position[0] = -HALF_BOARD_WIDTH + (index - 16) * TILE_WIDTH;
      position[2] = HALF_BOARD_WIDTH;
    } else if (index > 24 && index <= 31) { // Right column (moves down)
      position[0] = HALF_BOARD_WIDTH;
      position[2] = HALF_BOARD_WIDTH - (index - 24) * TILE_WIDTH;
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

      console.log("📍 [POSITION_OFFSET] Calculated offset:", {
        playerIndex: safePlayerIndex,
        totalPlayers: playerCount,
        offset: [position[0] - (HALF_BOARD_WIDTH - index * TILE_WIDTH), position[2] + HALF_BOARD_WIDTH],
        finalPosition: position
      });
    }
  } catch (error) {
    console.error("🚨 [POSITION_ERROR] Error calculating tile position:", {
      index,
      playerIndex,
      totalPlayers,
      error: error.message,
      stackTrace: error.stack
    });

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
    console.error("🚨 [PATH_ERROR] Error calculating path:", {
      start,
      end,
      diceSum,
      boardLength,
      playerIndex,
      totalPlayers,
      error: error.message
    });

    // 안전한 기본 경로 반환
    path.push(getTilePosition(end, playerIndex, totalPlayers));
  }

  return path;
};

interface PlayerProps {
  player: PlayerData
}

export function Player({ player }: PlayerProps) {
  try {
    const handleTileAction = useGameStore(state => state.handleTileAction);
    const gamePhase = useGameStore(state => state.gamePhase);
    const dice = useGameStore(state => state.dice);
    const boardLength = useGameStore(state => state.board.length);
    const players = useGameStore(state => state.players);

    // Input validation
    if (!player) {
      console.error("🚨 [CRITICAL] Player prop is null or undefined");
      return null;
    }

    if (!players || players.length === 0) {
      console.error("🚨 [CRITICAL] Players array is empty or undefined");
      return null;
    }

    if (typeof player.position !== 'number' || player.position < 0) {
      console.error("🚨 [CRITICAL] Invalid player position:", player.position);
      player.position = 0; // 안전한 기본값
    }

    const prevPositionRef = useRef(player.position);
    const meshRef = useRef<THREE.Mesh>(null!); // Ref for the animated mesh

    // Get player index for position offset (safe handling for -1)
    const playerIndex = players.findIndex(p => p.id === player.id);
    const safePlayerIndex = playerIndex >= 0 ? playerIndex : 0;

    // Debug logging for player index issues
    if (playerIndex === -1) {
      console.error("🚨 [CRITICAL] Player not found in players array:", {
        playerId: player.id,
        playerName: player.name,
        playersInArray: players.map(p => ({ id: p.id, name: p.name })),
        stackTrace: new Error().stack?.split('\n').slice(1, 4).join(' → ')
      });
    }

  // Initialize useSpring with the player's current position
  const [springs, api] = useSpring(() => ({
    position: getTilePosition(player.position, safePlayerIndex, players.length), // Initialize with safe player position and offset
    config: { duration: 200 },
  }));

  // Enhanced Component Lifecycle Tracking with context
  useEffect(() => {
    console.log("🎭 [LIFECYCLE] Player component MOUNTED:", {
      timestamp: new Date().toISOString(),
      playerId: player.id,
      playerName: player.name,
      character: player.character,
      initialPosition: player.position,
      playerIndex: playerIndex,
      safePlayerIndex: safePlayerIndex,
      totalPlayersAtMount: players.length,
      gamePhase: gamePhase,
      allPlayersAtMount: players.map(p => ({ id: p.id, name: p.name, position: p.position })),
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
    });

    return () => {
      console.log("🎭 [LIFECYCLE] Player component UNMOUNTING:", {
        timestamp: new Date().toISOString(),
        playerId: player.id,
        playerName: player.name,
        finalPosition: player.position,
        playerIndex: playerIndex,
        gamePhaseAtUnmount: gamePhase,
        stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
      });
    };
  }, []);

  // Initialize prevPositionRef with current position
  useEffect(() => {
    if (prevPositionRef.current !== player.position) {
      prevPositionRef.current = player.position;
    }
  }, []);

  // This useEffect will handle all position updates
  useEffect(() => {
    const targetPosition = getTilePosition(player.position, safePlayerIndex, players.length);
    const currentUser = useUserStore.getState().userInfo;
    const currentPlayer = useGameStore.getState().players[useGameStore.getState().currentPlayerIndex];
    const isThisPlayersTurn = currentPlayer?.id === player.id;
    const isMyPlayer = currentUser?.userId === player.id;

    // Enhanced position debugging with player index context
    console.log("📍 [POSITION] Player useEffect triggered:", {
      playerId: player.id,
      playerName: player.name,
      currentPosition: player.position,
      prevPosition: prevPositionRef.current,
      positionChanged: player.position !== prevPositionRef.current,
      isMyPlayer: isMyPlayer,
      gamePhase: gamePhase,
      playerIndex: playerIndex,
      safePlayerIndex: safePlayerIndex,
      totalPlayers: players.length,
      playersSnapshot: players.map((p, idx) => ({
        index: idx,
        id: p.id,
        name: p.name,
        position: p.position
      }))
    });

    // CRITICAL: Alert if position becomes 0 unexpectedly
    if (player.position === 0 && prevPositionRef.current !== 0 && prevPositionRef.current !== undefined) {
      console.error("🚨 [CRITICAL] Player position reset to 0 in useEffect!", {
        playerId: player.id,
        playerName: player.name,
        from: prevPositionRef.current,
        to: player.position,
        gamePhase: gamePhase,
        isMyPlayer: isMyPlayer,
        stackTrace: new Error().stack
      });
    }

    // Only animate if the player's position has actually changed in the state
    if (player.position !== prevPositionRef.current) {
      console.log("📍 [POSITION] Player position CHANGE detected:", {
        playerId: player.id,
        playerName: player.name,
        from: prevPositionRef.current,
        to: player.position,
        isMyPlayer: isMyPlayer,
        isThisPlayersTurn: isThisPlayersTurn,
        gamePhase: gamePhase,
        currentUserId: currentUser?.userId,
        currentUserNickname: currentUser?.nickname,
        willAnimate: isThisPlayersTurn && gamePhase === 'PLAYER_MOVING'
      });

      if (isThisPlayersTurn && gamePhase === 'PLAYER_MOVING') {
        // This is a dice roll move, animate step-by-step
        const diceSum = dice[0] + dice[1];
        const path = calculatePath(prevPositionRef.current, player.position, diceSum, boardLength, safePlayerIndex, players.length);

        api.start({
          from: getTilePosition(prevPositionRef.current, safePlayerIndex, players.length),
          to: async (next) => {
            for (const pos of path) {
              await next({ position: pos });
            }
          },
          config: { duration: path.length > 1 ? 200 : 400 },
          onRest: () => {
            console.log("📍 [ANIMATION] Dice roll animation completed:", {
              playerId: player.id,
              playerName: player.name,
              startPosition: prevPositionRef.current,
              endPosition: player.position,
              diceSum: diceSum,
              pathLength: path.length,
              isMyPlayer: isMyPlayer,
              willTriggerTileAction: isMyPlayer && isThisPlayersTurn && useGameStore.getState().gamePhase === 'PLAYER_MOVING'
            });
            prevPositionRef.current = player.position;
            // Only trigger tile action for my own player
            if (isMyPlayer && isThisPlayersTurn && useGameStore.getState().gamePhase === 'PLAYER_MOVING') {
              handleTileAction();
            }
          }
        });
      } else if (gamePhase === 'TILE_ACTION' && isThisPlayersTurn) {
        // This is a chance card or special tile movement, animate with smooth transition
        console.log("📍 [POSITION] Chance card movement animation:", {
          playerId: player.id,
          from: prevPositionRef.current,
          to: player.position
        });

        api.start({
          position: targetPosition,
          config: { duration: 800 }, // Smoother transition for chance card moves
          onRest: () => {
            console.log("📍 [POSITION] Chance card animation completed for player:", player.id);
            prevPositionRef.current = player.position;
          }
        });
      } else {
        // This is a non-animated position change
        api.set({ position: targetPosition });
        prevPositionRef.current = player.position;
      }
    }
  }, [player.position, api, boardLength, dice, gamePhase, handleTileAction, player.id, safePlayerIndex, players.length]);

  useFrame(() => {
    if (meshRef.current) {
      // Animation frame logic if needed
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
  } catch (error) {
    console.error("🚨 [CRITICAL] Player component error:", {
      playerId: player?.id,
      playerName: player?.name,
      error: error.message,
      stackTrace: error.stack
    });

    // 에러 발생 시 기본 위치에 기본 도형 렌더링
    return (
      <mesh position={[0, 0.5, 0]} castShadow>
        <Sphere args={[0.5]}><meshStandardMaterial color="gray" /></Sphere>
      </mesh>
    );
  }
}