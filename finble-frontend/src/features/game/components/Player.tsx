import { Cone, Sphere } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../types/gameTypes'
import { useGameStore } from '../store/useGameStore'
import { useFrame } from '@react-three/fiber'
import { useUserStore } from '../../../stores/useUserStore'


const getTilePosition = (index: number): [number, number, number] => {
  const TILE_WIDTH = 3;
  const TILES_PER_SIDE = 8; // Corner to corner
  const HALF_BOARD_WIDTH = TILES_PER_SIDE * TILE_WIDTH / 2; // 12

  const position: [number, number, number] = [0, 0, 0];

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

  position[1] = 0.5; // Set Y position to be above the board
  return position;
};

const calculatePath = (start: number, end: number, diceSum: number, boardLength: number): [number, number, number][] => {
  const path: [number, number, number][] = [];
  
  if (diceSum === 0) {
      return [getTilePosition(end)];
  }

  for (let i = 1; i <= diceSum; i++) {
    const nextIndex = (start + i) % boardLength;
    path.push(getTilePosition(nextIndex));
  }
  
  if (path.length === 0 && start !== end) {
      path.push(getTilePosition(end));
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

  const prevPositionRef = useRef(player.position);
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for the animated mesh

  // Initialize useSpring with the player's current position
  const [springs, api] = useSpring(() => ({
    position: getTilePosition(player.position), // Initialize with actual player position
    config: { duration: 200 },
  }));

  // Component Lifecycle Tracking
  useEffect(() => {
    console.log("🎭 [LIFECYCLE] Player component MOUNTED:", {
      timestamp: new Date().toISOString(),
      playerId: player.id,
      playerName: player.name,
      initialPosition: player.position,
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
    });

    return () => {
      console.log("🎭 [LIFECYCLE] Player component UNMOUNTING:", {
        timestamp: new Date().toISOString(),
        playerId: player.id,
        playerName: player.name,
        finalPosition: player.position,
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
    const targetPosition = getTilePosition(player.position);
    const currentUser = useUserStore.getState().userInfo;
    const currentPlayer = useGameStore.getState().players[useGameStore.getState().currentPlayerIndex];
    const isThisPlayersTurn = currentPlayer?.id === player.id;
    const isMyPlayer = currentUser?.userId === player.id;

    // Always log position for debugging, regardless of change
    console.log("📍 [POSITION] Player useEffect triggered:", {
      playerId: player.id,
      playerName: player.name,
      currentPosition: player.position,
      prevPosition: prevPositionRef.current,
      positionChanged: player.position !== prevPositionRef.current,
      isMyPlayer: isMyPlayer,
      gamePhase: gamePhase
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
        const path = calculatePath(prevPositionRef.current, player.position, diceSum, boardLength);

        api.start({
          from: getTilePosition(prevPositionRef.current),
          to: async (next) => {
            for (const pos of path) {
              await next({ position: pos });
            }
          },
          config: { duration: path.length > 1 ? 200 : 400 },
          onRest: () => {
            console.log("📍 [POSITION] Animation completed for player:", player.id);
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
  }, [player.position, api, boardLength, dice, gamePhase, handleTileAction, player.id]);

  useFrame(() => {
    if (meshRef.current) {
      // Animation frame logic if needed
    }
  });

  return (
    <animated.mesh ref={meshRef} position={springs.position as unknown as [number, number, number]} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="royalblue" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="hotpink" /></Sphere>}
    </animated.mesh>
  )
}