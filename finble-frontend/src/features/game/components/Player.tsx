import { Cone, Sphere } from '@react-three/drei'
import { useMemo } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../store/useGameStore'
import { useGameStore } from '../store/useGameStore'

// Board.tsx와 동일한 위치 계산 로직을 사용합니다.
const getTilePosition = (index: number): [number, number, number] => {
  const TILES_PER_SIDE = 8;
  const TILE_WIDTH = 3;
  const HALF_BOARD_WIDTH = (TILES_PER_SIDE * TILE_WIDTH) / 2 - TILE_WIDTH / 2;

  const position: [number, number, number] = [0, 0, 0];
  const side = Math.floor(index / TILES_PER_SIDE);
  const indexOnSide = index % TILES_PER_SIDE;

  switch (side) {
    case 0: // 아래
      position[0] = HALF_BOARD_WIDTH - indexOnSide * TILE_WIDTH;
      position[2] = HALF_BOARD_WIDTH;
      break
    case 1: // 왼쪽
      position[0] = -HALF_BOARD_WIDTH;
      position[2] = HALF_BOARD_WIDTH - indexOnSide * TILE_WIDTH;
      break
    case 2: // 위
      position[0] = -HALF_BOARD_WIDTH + indexOnSide * TILE_WIDTH;
      position[2] = -HALF_BOARD_WIDTH;
      break
    case 3: // 오른쪽
      position[0] = HALF_BOARD_WIDTH;
      position[2] = -HALF_BOARD_WIDTH + indexOnSide * TILE_WIDTH;
      break
  }
  return [position[0], 0.5, position[2]];
}

interface PlayerProps {
  player: PlayerData
}

export function Player({ player }: PlayerProps) {
  const handleTileAction = useGameStore(state => state.handleTileAction)
  const gamePhase = useGameStore(state => state.gamePhase)
  const isMyTurn = useGameStore(state => state.players[state.currentPlayerIndex].id === player.id)

  const targetPosition = useMemo(() => getTilePosition(player.position), [player.position])

  // 플레이어 이동 애니메이션
  const { position } = useSpring({
    to: { position: targetPosition },
    config: { duration: 1000 },
    onRest: () => {
      // 내 턴이고, 이동이 끝났을 때만 타일 액션을 실행합니다.
      if (isMyTurn && (gamePhase === 'PLAYER_MOVING' || gamePhase === 'WORLD_TRAVEL')) {
        handleTileAction()
      }
    },
  })

  return (
    <animated.mesh position={position as any} castShadow>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="royalblue" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="hotpink" /></Sphere>}
    </animated.mesh>
  )
}
