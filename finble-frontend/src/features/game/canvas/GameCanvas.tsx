import React, { useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, SoftShadows, OrthographicCamera } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

// --- Store Imports ---
// FIX: Added file extensions (.ts) to resolve compilation errors.
import { useGameStore } from '../store/useGameStore.ts';
import { useWebSocketStore } from '../../../stores/useWebSocketStore.ts';

// --- Component Imports ---
// FIX: Added file extensions (.tsx) to resolve compilation errors.
import { Board } from '../components/Board.tsx';
import { Player } from '../components/Player.tsx';
import { GameUI } from '../components/GameUI.tsx';
import { Dice } from '../components/Dice.tsx';
import TurnOrderSelection from '../components/TurnOrderSelection.tsx';
import CanvasStage from '../components/CanvasStage.tsx';
import BoardFrame from '../components/BoardFrame.tsx';
import GameGuard from '../components/GameGuard.tsx';

// --- Asset & Style Imports ---
// FIX: Added file extensions (.png, .css) to resolve compilation errors.
import bgImage from '../../../assets/game_background.png';
import styles from './GameCanvas.module.css';
import '../styles/game-layout.css';


// ==== Board Dimensions ====
const TILES_PER_SIDE = 9;
const TILE_WIDTH = 4;
const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;

// === Auto-fitting Orthographic Camera ===
// This helper component adjusts the camera to perfectly frame the board on any screen size.
function AutoOrthoCamera({ boardSize }: { boardSize: number }) {
  const { size, camera } = useThree();

  useEffect(() => {
    // Set a consistent isometric-like camera angle
    const radius = 60;
    const yaw = Math.PI / 4; // 45 degrees
    const tilt = THREE.MathUtils.degToRad(35);

    const x = Math.cos(yaw) * Math.cos(tilt) * radius;
    const y = Math.sin(tilt) * radius;
    const z = Math.sin(yaw) * Math.cos(tilt) * radius;

    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    // Auto-zoom to fit the board with a bit of padding
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

// === Game Scene Components (with and without physics) ===
// These are defined here because they are specific to this canvas setup.

function GameScene() {
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

function BoardWithPhysics() {
  return (
    <Physics>
      <GameScene />
    </Physics>
  );
}

function BoardWithoutPhysics() {
  return <GameScene />;
}


// ==== Main GameCanvas Component ====
export default function GameCanvas() {
  // --- State from Stores ---
  const { players, gamePhase, connect, disconnect, initializeGame } = useGameStore();
  const {
    isWebSocketReady,
    initialGameState,
    setInitialGameState,
    gameInitialized,
    setGameInitialized
  } = useWebSocketStore();

  // --- Router Params ---
  const { gameId } = useParams<{ gameId: string }>();
  console.log('[1번 체크] useParams로 가져온 gameId:', gameId);
  // Safely convert players object/array to an array for rendering
  const playersArray = useMemo(
    () => (Array.isArray(players) ? players : Object.values(players || {})),
    [players]
  );

  // --- Logic Hooks (useEffect) ---

  // Effect to apply the initial game state when entering a room
  useEffect(() => {
    if (initialGameState && isWebSocketReady) {
      const hasPlayersWithPosition = playersArray.some(p => p.position > 0);
      const isGameInProgress = gamePhase !== "SELECTING_ORDER" && gamePhase !== "WAITING_FOR_ROLL" && playersArray.length > 0;

      // Avoid re-initializing if the game is already in progress
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

  // Effect to connect and disconnect WebSocket
  useEffect(() => {
    console.log('[2번 체크] useEffect 실행됨. isWebSocketReady:', isWebSocketReady, 'gameId:', gameId);
    if (gameId && isWebSocketReady) {
      // CRITICAL FIX: Set gameId in the global store BEFORE connecting.
      // This ensures other parts of the app can access it for API calls.
      useGameStore.setState({ gameId: gameId }); 
      connect(gameId);
    }
    // Cleanup on component unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, gameId, isWebSocketReady]);

  // --- Loading State ---
  // More robust loading condition
  const isLoading = playersArray.length === 0 && !gameInitialized;

  return (
    <div
      className={styles.gameContainer}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="game-safe-top" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          Loading game...
        </div>
      )}
      
      {/* 2D UI Layer */}
      <GameGuard>
        <TurnOrderSelection />
        <GameUI />
      </GameGuard>

      {/* 3D Canvas Layer */}
      <CanvasStage>
        <Canvas
          shadows
          gl={{ alpha: true }} // Allows transparent background
          className={styles.canvas}
        >
          <OrthographicCamera makeDefault />
          <AutoOrthoCamera boardSize={BOARD_SIZE} />

          {/* Lighting & Environment */}
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
          <pointLight position={[-25, 8, -20]} color="#47d8ff" intensity={30} distance={80} />
          <pointLight position={[25, 8, 15]} color="#d24bff" intensity={25} distance={80} />

          {/* Game Board and Pieces */}
          <Suspense fallback={<BoardWithoutPhysics />}>
            <BoardWithPhysics />
          </Suspense>

          {/* Controls (disabled for gameplay, useful for debugging) */}
          <OrbitControls target={[0, 0, 0]} makeDefault enableRotate={false} enablePan={false} enableZoom={false} />
        </Canvas>
      </CanvasStage>

      <BoardFrame />
    </div>
  );
}