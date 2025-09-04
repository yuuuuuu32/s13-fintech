import { useGameStore } from '../store/useGameStore'

export function Player() {
  // useGameStore에서 플레이어의 위치(position) 상태를 가져옵니다.
  const playerPosition = useGameStore((state) => state.player.position)

  return (
    <mesh position={playerPosition}>
      {/* 높이 1, 반지름 0.5인 원뿔 모양 */}
      <coneGeometry args={[0.5, 1]} />
      {/* 파란색 재질 */}
      <meshStandardMaterial color="royalblue" />
    </mesh>
  )
}