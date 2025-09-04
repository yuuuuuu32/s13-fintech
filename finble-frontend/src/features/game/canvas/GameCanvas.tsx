import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Board } from '../components/Board'
import { Player } from '../components/Player'

export default function GameCanvas() {
  return (
    <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
      {/* 주변광: 씬 전체를 부드럽게 비춥니다. */}
      <ambientLight intensity={1.5} />
      {/* 방향광: 특정 방향에서 오는 빛으로, 그림자를 만듭니다. */}
      <directionalLight position={[5, 10, 7.5]} intensity={3.5} />
      
      {/* 마우스로 씬을 회전, 줌, 이동할 수 있게 해주는 컨트롤러 */}
      <OrbitControls />

      {/* 게임 보드 컴포넌트를 렌더링합니다. */}
      <Board />
      
      {/* 플레이어 말 컴포넌트를 렌더링합니다. */}
      <Player />
    </Canvas>
  )
}