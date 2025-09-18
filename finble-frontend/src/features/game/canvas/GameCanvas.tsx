import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocketStore } from '../../../stores/useWebSocketStore'
import TurnOrderSelection from '../components/TurnOrderSelection';

export default function GameCanvas() {
  const players = useGameStore((state) => state.players)
  const connect = useGameStore((state) => state.connect)
  const disconnect = useGameStore((state) => state.disconnect)
  const initializeGame = useGameStore((state) => state.initializeGame);

  const { 
    isWebSocketReady, 
    initialGameState, 
    setInitialGameState 
  } = useWebSocketStore();

  const { gameId } = useParams<{ gameId: string }>();

  // Component Lifecycle Tracking
  useEffect(() => {
    console.log("🎮 [LIFECYCLE] GameCanvas MOUNTED:", {
      timestamp: new Date().toISOString(),
      gameId,
      isWebSocketReady,
      hasInitialGameState: !!initialGameState,
      playersCount: players.length,
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
    });

    return () => {
      console.log("🎮 [LIFECYCLE] GameCanvas UNMOUNTING:", {
        timestamp: new Date().toISOString(),
        gameId,
        playersCount: players.length,
        stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
      });
    };
  }, []);

  useEffect(() => {
    if (initialGameState && isWebSocketReady) {
        console.log("🎮 [LIFECYCLE] Initializing game from stored state:", {
          timestamp: new Date().toISOString(),
          initialGameState,
          currentPlayersCount: players.length,
          stackTrace: new Error().stack?.split('\n').slice(1, 3).join(' -> ')
        });
        initializeGame(initialGameState);
        setInitialGameState(null); // Clear the state after using it
    }
  }, [initialGameState, isWebSocketReady, initializeGame, setInitialGameState]);

  useEffect(() => {
    if (gameId && isWebSocketReady) { // WebSocket이 준비되었을 때만 connect 호출
      connect(gameId);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, gameId, isWebSocketReady]); // isWebSocketReady를 의존성 배열에 추가

  console.log('Players in GameCanvas:', players);

  // Convert players object to array if needed
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});

  if (playersArray.length === 0) {
    return <div>Loading game...</div>; // 데이터가 로드될 때까지 로딩 상태를 표시
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <TurnOrderSelection />
      <GameUI />
      <Canvas camera={{ position: [0, 40, 50], fov: 50 }} shadows>
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
          <group scale={1.2}>
              <Board />
              {playersArray.map((player) => (
                <Player key={player.id} player={player} />
              ))}
              <Dice />
            </group>
        </Physics>

        <OrbitControls 
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  )
}