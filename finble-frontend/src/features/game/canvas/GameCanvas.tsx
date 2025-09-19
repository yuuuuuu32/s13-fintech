import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocketStore } from '../../../stores/useWebSocketStore'
import TurnOrderSelection from '../components/TurnOrderSelection';

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

  // Physics 준비 상태 관리
  const [isPhysicsReady, setIsPhysicsReady] = useState(false);

  // Convert players object to array if needed
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});

  useEffect(() => {
    if (initialGameState && isWebSocketReady) {

        // 추가 체크: 게임이 이미 진행 중이면 초기화하지 않음
        const hasPlayersWithPosition = players.some(p => p.position > 0);
        const isGameInProgress = gamePhase !== "SELECTING_ORDER" && gamePhase !== "WAITING_FOR_ROLL" && players.length > 0;

        if (gameInitialized || hasPlayersWithPosition || isGameInProgress) {
          setInitialGameState(null); // Clear the state without calling initializeGame
        } else {
          initializeGame(initialGameState);
          setGameInitialized(true); // Mark as initialized globally
          setInitialGameState(null); // Clear the state after using it
        }
    }
  }, [initialGameState, isWebSocketReady, initializeGame, setInitialGameState, gameInitialized, setGameInitialized]);

  useEffect(() => {
    if (gameId && isWebSocketReady) { // WebSocket이 준비되었을 때만 connect 호출
      connect(gameId);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, gameId, isWebSocketReady]); // isWebSocketReady를 의존성 배열에 추가

  // Physics 초기화 지연 로딩
  useEffect(() => {
    const initPhysics = async () => {
      try {
        // WASM 로딩을 위한 최소 지연 시간
        await new Promise(resolve => setTimeout(resolve, 500));

        // Rapier WASM이 준비되었는지 확인
        const { init } = await import('@dimforge/rapier3d-compat');
        await init();

        setIsPhysicsReady(true);
      } catch (error) {
        console.warn('Physics 초기화 실패, 재시도 중...', error);
        // 1초 후 재시도
        setTimeout(() => {
          setIsPhysicsReady(true);
        }, 1000);
      }
    };

    if (playersArray.length > 0) {
      initPhysics();
    }
  }, [playersArray.length]);

  if (playersArray.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#fff'
      }}>
        게임 데이터를 로딩 중...
      </div>
    );
  }

  if (!isPhysicsReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#fff',
        gap: '1rem'
      }}>
        <div>물리 엔진을 초기화하는 중...</div>
        <div style={{ fontSize: '1rem', opacity: 0.7 }}>
          잠시만 기다려주세요
        </div>
      </div>
    );
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

        {isPhysicsReady && (
          <Physics>
            <group scale={1.2}>
                <Board />
                {playersArray.map((player) => (
                  <Player key={player.id} player={player} />
                ))}
                <Dice />
              </group>
          </Physics>
        )}

        <OrbitControls 
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  )
}