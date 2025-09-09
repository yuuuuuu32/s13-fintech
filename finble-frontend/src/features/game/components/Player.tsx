import { Cone, Sphere } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../store/useGameStore'
import { useGameStore } from '../store/useGameStore'



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
  console.log('Rendering player:', player);
  const handleTileAction = useGameStore(state => state.handleTileAction);
  const gamePhase = useGameStore(state => state.gamePhase);
  const isMyTurn = useGameStore(state => state.players[state.currentPlayerIndex]?.id === player.id);
  const dice1 = useGameStore(state => state.dice[0]);
  const dice2 = useGameStore(state => state.dice[1]);
  const boardLength = useGameStore(state => state.board.length);

  const prevPositionRef = useRef(player.position);

  const [springs, api] = useSpring(() => ({
    position: getTilePosition(player.position),
    config: { duration: 200 }, 
  }));

  useEffect(() => {
    const startPos = prevPositionRef.current;
    const endPos = player.position;

    if (startPos !== endPos) {
      if (isMyTurn) {
        let path;
        if (gamePhase === 'PLAYER_MOVING') {
          const diceSum = dice1 + dice2;
          path = calculatePath(startPos, endPos, diceSum, boardLength);
        } else {
          path = [getTilePosition(endPos)];
        }
        
        api.start({
          to: async (next) => {
            for (const pos of path) {
              await next({ position: pos });
            }
          },
          config: { duration: path.length > 1 ? 200 : 400 },
          onRest: () => {
            if (isMyTurn && gamePhase === 'PLAYER_MOVING') {
              handleTileAction();
            }
          }
        });
      } else {
         api.start({ to: { position: getTilePosition(endPos) }, immediate: true});
      }
    }
    
    prevPositionRef.current = endPos;
  }, [player.position, api, boardLength, dice1, dice2, gamePhase, handleTileAction, isMyTurn]);

  return (
    <animated.mesh position={springs.position as any} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="royalblue" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="hotpink" /></Sphere>}
    </animated.mesh>
  )
}