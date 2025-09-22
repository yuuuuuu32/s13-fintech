import '../styles/game-layout.css';
import CanvasStage from '../components/CanvasStage';
import BoardFrame from '../components/BoardFrame';
import GameGuard from '../components/GameGuard';
import BookIcon from '../components/BookIcon';

import { Canvas } from '@react-three/fiber'
import { OrbitControls, SoftShadows, OrthographicCamera } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore'
import { Board } from '../components/Board.tsx'
import { Player } from '../components/Player.tsx'
import { GameUI } from '../components/GameUI.tsx'
import { Dice } from '../components/Dice.tsx'
import { useEffect, useMemo, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocketStore } from '../../../stores/useWebSocketStore'
import TurnOrderSelection from '../components/TurnOrderSelection';
import bgImage from '../../../assets/game_background.png';

// ==== 보드 치수 === =
const TILES_PER_SIDE = 9;
const TILE_WIDTH = 4;
const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH; // 36

// === Canvas 내부에서만 useThree 사용: 카메라 자동 프레이밍 ===
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

function AutoOrthoCamera({ boardSize }: { boardSize: number }) {
  const { size, camera } = useThree();

  useEffect(() => {
    // 레퍼런스 시점: 45° 대각 + 35° 틸트
    const radius = 60;
    const yaw = Math.PI / 4; // 45deg
    const tilt = THREE.MathUtils.degToRad(35);

    const x = Math.cos(yaw) * Math.cos(tilt) * radius;
    const y = Math.sin(tilt) * radius;
    const z = Math.sin(yaw) * Math.cos(tilt) * radius;

    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    // 오소카메라 줌 자동 맞춤 (패딩으로 여유)
    const padding = 1.15;
    const wZoom = size.width / (boardSize * padding);
    const hZoom = size.height / (boardSize * padding);
    const fitZoom = Math.min(wZoom, hZoom);

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = fitZoom;
    ortho.updateProjectionMatrix();
  }, [size, camera, boardSize]);

  return null;
}

// 물리 엔진 없는 보드 (fallback)
function BoardWithoutPhysics() {
  const playersArray = useGameStore(state => Array.isArray(state.players) ? state.players : Object.values(state.players || {}));
  
  return (
    <group scale={1.2} position={[0, 1.5, 0]}>
      <Board />
      {playersArray.map((player) => (
        <Player key={player.id} player={player} />
      ))}
      <Dice />
    </group>
  );
}

// 물리 엔진 포함 보드
function BoardWithPhysics() {
  const playersArray = useGameStore(state => Array.isArray(state.players) ? state.players : Object.values(state.players || {}));
  
  return (
    <Physics>
      <group scale={1.2} position={[0, 1.5, 0]}>
        <Board />
        {playersArray.map((player) => (
          <Player key={player.id} player={player} />
        ))}
        <Dice />
      </group>
    </Physics>
  );
}

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

  // 초기 상태 적용
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

  // 웹소켓 연결
  useEffect(() => {
    if (gameId && isWebSocketReady) {
      connect(gameId);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, gameId, isWebSocketReady]);

  const isLoading = playersArray.length === 0;

  return (
    <div 
      className="game-root"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="game-safe-top" />
      
      {/* <BookIcon 
        position="top-center" 
        size="medium" 
      /> */}
      
      <GameGuard>
        <TurnOrderSelection />
        <GameUI />
      </GameGuard>

      <CanvasStage>
        <Canvas
          shadows
          gl={{ alpha: true }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <OrthographicCamera makeDefault />
          <AutoOrthoCamera boardSize={BOARD_SIZE} />

          {/* 바닥과 조화된 라이팅 */}
          <SoftShadows size={25} samples={10} focus={0.5} />
          <fog attach="fog" args={['#050508', 60, 120]} />
          <ambientLight intensity={0.6} />
          <hemisphereLight skyColor="#2a3441" groundColor="#0f0f1a" intensity={0.4} />
          <directionalLight
            position={[15, 25, 12]}
            intensity={1.0}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={120}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
          />
          {/* 네온 포인트 라이트 */}
          <pointLight position={[-25, 8, -20]} color="#47d8ff" intensity={30} distance={80} />
          <pointLight position={[25, 8, 15]} color="#d24bff" intensity={25} distance={80} />

          {/* Physics를 Suspense로 감싸서 안전하게 로딩 */}
          <Suspense fallback={<BoardWithoutPhysics />}>
            <BoardWithPhysics />
          </Suspense>

          <OrbitControls target={[0, 0, 0]} makeDefault enableRotate={false} enablePan={false} enableZoom />
        </Canvas>
      </CanvasStage>

      <BoardFrame />
    </div>
  )
}