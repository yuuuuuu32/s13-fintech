import { Cone, Sphere } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../types/gameTypes'
import { useGameStore } from '../store/useGameStore'
import { useFrame } from '@react-three/fiber'
import { useUserStore } from '../../../stores/useUserStore'


const getTilePosition = (index: number): [number, number, number] => {
  const TILES_PER_SIDE = 8;
  const TILE_WIDTH = 4;
  const HALF_BOARD_WIDTH = (TILES_PER_SIDE * TILE_WIDTH) / 2 - TILE_WIDTH / 2;

  const position: [number, number, number] = [0, 0, 0];
  const side = Math.floor(index / TILES_PER_SIDE);
  const indexOnSide = index % TILES_PER_SIDE;

  switch (side) {
    case 0:
      position[0] = HALF_BOARD_WIDTH - indexOnSide * TILE_WIDTH;
      position[2] = HALF_BOARD_WIDTH;
      break
    case 1:
      position[0] = -HALF_BOARD_WIDTH;
      position[2] = HALF_BOARD_WIDTH - indexOnSide * TILE_WIDTH;
      break
    case 2:
      position[0] = -HALF_BOARD_WIDTH + indexOnSide * TILE_WIDTH;
      position[2] = -HALF_BOARD_WIDTH;
      break
    case 3:
      position[0] = HALF_BOARD_WIDTH;
      position[2] = -HALF_BOARD_WIDTH + indexOnSide * TILE_WIDTH;
      break
  }
  return [position[0], 0.5, position[2]];
}

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
  const { userInfo } = useUserStore();
  const handleTileAction = useGameStore(state => state.handleTileAction);
  const gamePhase = useGameStore(state => state.gamePhase);
  const currentPlayerIndex = useGameStore(state => state.currentPlayerIndex);
  const players = useGameStore(state => state.players);

  // 현재 턴인 플레이어가 실제 사용자인지 확인하고, 이 Player 컴포넌트가 그 플레이어인지 확인
  const currentPlayer = players[currentPlayerIndex];
  const isCurrentPlayerMe = currentPlayer?.id === userInfo?.userId;
  const isThisPlayerMe = player.id === userInfo?.userId;
  const isMyTurn = isCurrentPlayerMe && isThisPlayerMe;

  const dice = useGameStore(state => state.dice);
  const boardLength = useGameStore(state => state.board.length);

  console.log(`Player ${player.id}: isCurrentPlayerMe=${isCurrentPlayerMe}, isThisPlayerMe=${isThisPlayerMe}, isMyTurn=${isMyTurn}`);

  const prevPositionRef = useRef(player.position);
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for the animated mesh

  // Initialize useSpring with the player's current position
  const [springs, api] = useSpring(() => ({
    position: getTilePosition(player.position), // Initialize with actual player position
    config: { duration: 200 }, 
  }));

  // This useEffect will handle all position updates
  useEffect(() => {
    const targetPosition = getTilePosition(player.position);
    const currentVisualPosition = meshRef.current?.position.toArray(); // Get current visual position

    console.log(`Player ${player.id}: Current Pos: ${player.position}, Prev Pos Ref: ${prevPositionRef.current}, Game Phase: ${gamePhase}, Is My Turn: ${isMyTurn}, Dice: ${dice[0]}, ${dice[1]}`);
    if (currentVisualPosition) {
      console.log(`Player ${player.id}: Current Visual Mesh Position:`, currentVisualPosition);
    }

    // Only animate if the player's position has actually changed in the state
    if (player.position !== prevPositionRef.current) {
      if (isMyTurn && gamePhase === 'PLAYER_MOVING') {
        // This is a dice roll move, animate step-by-step
        const diceSum = dice[0] + dice[1];
        const path = calculatePath(prevPositionRef.current, player.position, diceSum, boardLength);
        
        api.start({
          from: getTilePosition(prevPositionRef.current), // Start from the actual previous position
          to: async (next) => {
            for (const pos of path) {
              await next({ position: pos });
            }
          },
          config: { duration: path.length > 1 ? 200 : 400 },
          onRest: () => {
            // Only call handleTileAction if it's still PLAYER_MOVING phase
            // This prevents double calls if gamePhase changes quickly
            if (isMyTurn && useGameStore.getState().gamePhase === 'PLAYER_MOVING') {
              console.log(`Player ${player.id}: Calling handleTileAction from onRest`);
              handleTileAction();
            }
          }
        });
      } else {
        // This is a non-animated position change (e.g., teleport from chance card, world travel, or other player's move)
        // Directly set the spring's value to the new position.
        api.set({ position: targetPosition });
        console.log(`Player ${player.id}: Directly setting mesh position to:`, targetPosition);

        // 서버에서 받은 위치 업데이트인 경우에도 handleTileAction 호출
        if (isMyTurn && gamePhase === 'PLAYER_MOVING') {
          console.log(`Player ${player.id}: Calling handleTileAction after server position update`);
          handleTileAction();
        }
      }
    }
    
    // Always update prevPositionRef to the current player.position for the next render cycle
    prevPositionRef.current = player.position;
  }, [player.position, api, boardLength, dice, gamePhase, handleTileAction, isMyTurn]);

  useFrame(() => {
    if (meshRef.current) {
      // console.log(`Player ${player.id}: Mesh Position:`, meshRef.current.position.toArray()); // Keep this for now
    }
  });

  return (
    <animated.mesh ref={meshRef} position={springs.position as unknown as [number, number, number]} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="royalblue" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="hotpink" /></Sphere>}
    </animated.mesh>
  )
}