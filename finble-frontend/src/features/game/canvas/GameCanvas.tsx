import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocketStore } from '../../../stores/useWebSocketStore'
import TurnOrderSelection from '../components/TurnOrderSelection';
import bgImage from '../../../assets/game_background.png';

export default function GameCanvas() {
  const players = useGameStore((state) => state.players)
  const gamePhase = useGameStore((state) => state.gamePhase)
  const connect = useGameStore((state) => state.connect)
  const disconnect = useGameStore((state) => state.disconnect)
  const initializeGame = useGameStore((state) => state.initializeGame);

  const {
    isWebSocketReady,
    initialGameState,
    setInitialGameState,
    gameInitialized,
    setGameInitialized
  } = useWebSocketStore();

  const { gameId } = useParams<{ gameId: string }>();

  // players가 객체/배열 어느 형태든 안전하게 변환
  const playersArray = useMemo(
    () => (Array.isArray(players) ? players : Object.values(players || {})),
    [players]
  );

  useEffect(() => {
    if (initialGameState && isWebSocketReady) {
      const hasPlayersWithPosition = playersArray.some(p => p.position > 0);
      const isGameInProgress = gamePhase !== "SELECTING_ORDER" && gamePhase !== "WAITING_FOR_ROLL" && playersArray.length > 0;

      if (gameInitialized || hasPlayersWithPosition || isGameInProgress) {
        setInitialGameState(null);
      } else {
        initializeGame(initialGameState);
        setGameInitialized(true);
        setInitialGameState(null);
      }
    }
  }, [
    initialGameState, isWebSocketReady, initializeGame, setInitialGameState,
    gameInitialized, setGameInitialized, playersArray, gamePhase
  ]);

  useEffect(() => {
    if (gameId && isWebSocketReady) {
      console.log("🔌 [CANVAS] Connecting to game:", gameId);
      connect(gameId);
    }
    return () => {
      console.log("🔌 [CANVAS] Disconnecting from game");
      disconnect();
    };
  }, [gameId, isWebSocketReady]); // connect, disconnect 제거하여 불필요한 재실행 방지

  const isLoading = playersArray.length === 0;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'Galmuri14, sans-serif'
    }}>
      {/* 로딩 오버레이: 배경은 유지 */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 50, // UI 위로
          backdropFilter: 'blur(2px)',
          color: '#fff', fontSize: 20, fontWeight: 600
        }}>
          Loading game...
        </div>
      )}

      <TurnOrderSelection />
      <GameUI />

      <Canvas
        camera={{ position: [0, 40, 50], fov: 50 }}
        shadows
        gl={{ alpha: true }}
        style={{ background: 'transparent' }}
      >
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

        <OrbitControls target={[0, 0, 0]} makeDefault />
      </Canvas>
    </div>
  )
}
