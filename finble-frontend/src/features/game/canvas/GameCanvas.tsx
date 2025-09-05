import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore' // 스토어 가져오기
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'

export default function GameCanvas() {
  const players = useGameStore((state) => state.players)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 20, 25], fov: 60 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 10, 5]} intensity={2} castShadow />
        
        <Physics>
          <Board />
          {/* 스토어의 플레이어 목록을 기반으로 Player 컴포넌트를 여러 개 렌더링 */}
          {players.map((player) => (
            <Player key={player.id} player={player} />
          ))}
          <Dice />
        </Physics>

        <OrbitControls />
      </Canvas>
      <GameUI />
    </div>
  )
}