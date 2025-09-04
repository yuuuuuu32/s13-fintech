import { Cone, Sphere } from '@react-three/drei'
import { useMemo } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { Player as PlayerData } from '../store/useGameStore'
import { useGameStore } from '../store/useGameStore'

// 가장 정확한 위치 계산 함수
const getTilePosition = (index: number): [number, number, number] => {
  const TILES_PER_LINE = 8
  const TILE_WIDTH = 3
  const TILE_DEPTH = 4.5
  const HALF_BOARD_SIDE = (TILES_PER_LINE * TILE_WIDTH) / 2
  const HALF_TILE_WIDTH = TILE_WIDTH / 2
  const HALF_TILE_DEPTH = TILE_DEPTH / 2

  let x = 0
  let z = 0

  const side = Math.floor(index / TILES_PER_LINE)
  const indexOnSide = index % TILES_PER_LINE

  switch (side) {
    case 0: // 아래쪽 (우측 상단 코너부터 시작)
      x = HALF_BOARD_SIDE - HALF_TILE_WIDTH - indexOnSide * TILE_WIDTH
      z = HALF_BOARD_SIDE - HALF_TILE_DEPTH
      break
    case 1: // 왼쪽 (아래쪽으로 이동)
      x = -HALF_BOARD_SIDE + HALF_TILE_DEPTH
      z = HALF_BOARD_SIDE - HALF_TILE_WIDTH - indexOnSide * TILE_WIDTH
      break
    case 2: // 위쪽 (좌측 하단 코너부터 시작)
      x = -HALF_BOARD_SIDE + HALF_TILE_WIDTH + indexOnSide * TILE_WIDTH
      z = -HALF_BOARD_SIDE + HALF_TILE_DEPTH
      break
    case 3: // 오른쪽 (위쪽으로 이동)
      x = HALF_BOARD_SIDE - HALF_TILE_DEPTH
      z = -HALF_BOARD_SIDE + HALF_TILE_WIDTH + indexOnSide * TILE_WIDTH
      break
  }
  return [x, 0.5, z]
}

interface PlayerProps {
  player: PlayerData
}

export function Player({ player }: PlayerProps) {
  const handleTileAction = useGameStore(state => state.handleTileAction)
  const gamePhase = useGameStore(state => state.gamePhase)
  const isMyTurn = useGameStore(state => state.players[state.currentPlayerIndex].id === player.id)

  const targetPosition = useMemo(() => getTilePosition(player.position), [player.position])

  const { position } = useSpring({
    to: { position: targetPosition },
    config: { duration: 1000 },
    onRest: () => {
      if (isMyTurn && gamePhase === 'PLAYER_MOVING') {
        handleTileAction()
      }
    },
  })

  return (
    <animated.mesh position={position as any}>
      {player.character === 'cone' && <Cone args={[0.5, 1]}><meshStandardMaterial color="royalblue" /></Cone>}
      {player.character === 'sphere' && <Sphere args={[0.5]}><meshStandardMaterial color="hotpink" /></Sphere>}
    </animated.mesh>
  )
}