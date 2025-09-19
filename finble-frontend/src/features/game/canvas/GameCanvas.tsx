// src/features/game/canvas/GameCanvas.tsx
import '../styles/game-layout.css';
import CanvasStage from '../components/CanvasStage';
import BoardFrame from '../components/BoardFrame';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, SoftShadows, OrthographicCamera } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import { Board } from '../components/Board.tsx';
import { Player } from '../components/Player.tsx';
import { GameUI } from '../components/GameUI.tsx';
import { Dice } from '../components/Dice.tsx';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocketStore } from '../../../stores/useWebSocketStore';
import TurnOrderSelection from '../components/TurnOrderSelection';
import GameGuard from '../components/GameGuard';
import bgImage from '../../../assets/game_background.png';

// ==== 보드 치수(다른 파일과 반드시 동일) ====
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

export default function GameCanvas() {
  const players = useGameStore((state) => state.players);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const connect = useGameStore((state) => state.connect);
  const disconnect = useGameStore((state) => state.disconnect);
  const initializeGame = useGameStore((state) => state.initializeGame);

  const {
    isWebSocketReady,
    initialGameState,
    setInitialGameState,
    gameInitialized,
    setGameInitialized,
  } = useWebSocketStore();

  const { gameId } = useParams<{ gameId: string }>();

  const playersArray = useMemo(
    () => (Array.isArray(players) ? players : Object.values(players || {})),
    [players]
  );

  // 초기 상태 적용
  useEffect(() => {
    if (initialGameState && isWebSocketReady) {
      const hasPlayersWithPosition = playersArray.some((p) => p.position > 0);
      const isGameInProgress =
        gamePhase !== 'SELECTING_ORDER' && gamePhase !== 'WAITING_FOR_ROLL' && playersArray.length > 0;

      if (gameInitialized || hasPlayersWithPosition || isGameInProgress) {
        setInitialGameState(null);
      } else {
        initializeGame(initialGameState);
        setGameInitialized(true);
        setInitialGameState(null);
      }
    }
  }, [
    initialGameState,
    isWebSocketReady,
    initializeGame,
    setInitialGameState,
    gameInitialized,
    setGameInitialized,
    playersArray,
    gamePhase,
  ]);

  // 웹소켓 연결
  useEffect(() => {
    if (gameId && isWebSocketReady) connect(gameId);
    return () => disconnect();
  }, [connect, disconnect, gameId, isWebSocketReady]);

  return (
    <div
      className="game-root"
      style={{
        backgroundImage: `url(${bgImage})`,
        /* 나머지 inline 배경 속성은 CSS로 옮겨도 ok */
      }}
    >
      <div className="game-safe-top" /> {/* 상단 HUD 세이프존 */}
      <GameGuard>
        <TurnOrderSelection />
        <GameUI />
      </GameGuard>

      {/* ✅ 캔버스 확대/상단 이동은 여기서만 제어 */}
      <CanvasStage>
        <Canvas shadows gl={{ alpha: true }} style={{ background: 'transparent', width: '100%', height: '100%' }}>
          {/* 오소카메라: 위치/줌은 AutoOrthoCamera가 제어 */}
          <OrthographicCamera makeDefault />
          <AutoOrthoCamera boardSize={BOARD_SIZE} />

          {/* 라이팅 */}
          <SoftShadows size={25} samples={10} focus={0.5} />
          <fog attach="fog" args={['#0f1426', 50, 150]} />
          <ambientLight intensity={1.05} />
          <hemisphereLight skyColor="#8fd3ff" groundColor="#0a0d18" intensity={0.35} />
          <directionalLight
            position={[12, 20, 10]}
            intensity={0.95}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          {/* 네온 포인트 느낌 */}
          <pointLight position={[-25, 10, -20]} color="#47d8ff" intensity={60} distance={90} />
          <pointLight position={[25, 10, 15]} color="#d24bff" intensity={55} distance={90} />

          <Physics>
            {/* 📌 보드를 살짝 띄워서( y=1.5 ) '떠 있는' 느낌 + 타일 가독성 ↑ */}
            <group scale={1.2} position={[0, 1.5, 0]}>
              <Board />
              {playersArray.map((player) => (
                <Player key={player.id} player={player} />
              ))}
              <Dice />
            </group>
          </Physics>

          <OrbitControls target={[0, 0, 0]} makeDefault enableRotate={false} enablePan={false} enableZoom />
        </Canvas>
      </CanvasStage>

      {/* ✅ 플로팅 착시용 비네트/글로우 */}
      <BoardFrame />
    </div>
  );
}
