import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'
import { useEffect } from 'react'

export default function GameCanvas() {
  const players = useGameStore((state) => state.players)
  const connect = useGameStore((state) => state.connect)
  const disconnect = useGameStore((state) => state.disconnect)

  // Dummy gameId for testing. In a real app, this would come from routing or context.
  const gameId = 'test-game-id'; 

  useEffect(() => {
    connect(gameId);
    return () => {
      disconnect();
    };
  }, [connect, disconnect, gameId]);

  console.log('Players in GameCanvas:', players);
  console.log('Players in GameCanvas:', players);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <GameUI />
      <Canvas camera={{ position: [0, 40, 40], fov: 50 }} shadows>
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
          <group rotation={[0, -Math.PI / 4, 0]} scale={1.2}>
              <Board />
              {players.map((player) => (
                <Player key={player.id} player={player} />
              ))}
              <Dice />
            </group>
        </Physics>

        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  )
}