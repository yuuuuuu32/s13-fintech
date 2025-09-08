import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'

export default function GameCanvas() {
  const players = useGameStore((state) => state.players)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 카메라 위치를 조정하여 고정된 아이소메트릭 뷰를 만듭니다.
        position: [x, y, z] -> y(높이)와 z(거리) 값을 조정하여 원하는 각도를 찾습니다.
      */}
      <Canvas camera={{ position: [0, 40, 40], fov: 45 }} shadows>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={1.5} />
        <directionalLight 
          position={[0, 10, 5]} 
          intensity={2} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
        />
        
        <Physics>
          <Board />
          {players.map((player) => (
            <Player key={player.id} player={player} />
          ))}
          <Dice />
        </Physics>

        {/* OrbitControls 설정을 변경하여 카메라 회전 및 줌을 막습니다.
          - enableRotate={false} : 마우스 드래그로 회전 비활성화
          - enableZoom={false} : 마우스 휠로 줌 비활성화
          - enablePan={false} : 마우스 우클릭 드래그로 이동 비활성화
          - target={[0, 0, 0]} : 카메라가 항상 보드 중앙을 바라보도록 설정
        */}
        <OrbitControls 
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
      <GameUI />
    </div>
  )
}
