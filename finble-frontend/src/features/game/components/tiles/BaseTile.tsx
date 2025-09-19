// src/features/game/components/tiles/BaseTile.tsx

import { Text } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import React from 'react';

// ... (getPlayerColor 함수는 변경 없음)
const getPlayerColor = (character: string) => {
  const characterColors = {
    'cone': '#4A90E2', 'sphere': '#E74C3C',
    'box': '#F39C12', 'torus': '#9B59B6'
  };
  return characterColors[character] || '#FFFFFF';
};

interface BaseTileProps {
  tile: TileData;
  tileIndex: number;
  position: [number, number, number];
  textRotationY: number;
  children: React.ReactNode;
  width?: number;   // ✅ 추가
  depth?: number;   // ✅ 추가
}

export function BaseTile({ tile, tileIndex, position, textRotationY, children, width, depth }: BaseTileProps) {
  const players = useGameStore(state => state.players);
  const gamePhase = useGameStore(state => state.gamePhase);
  const selectTravelDestination = useGameStore(state => state.selectTravelDestination);
  const owner = players.find(p => p.properties.includes(tileIndex));
  
  // 기존 상수 대체
  const TILE_WIDTH = width ?? 4;   // ✅ 기존 4 고정 → 오버라이드
  const TILE_DEPTH = depth ?? 6;   // ✅ 기존 6 고정 → 오버라이드
  const TILE_BASE_HEIGHT = 0.4;
  const TILE_TOP_HEIGHT = 0.1;
  const TOTAL_HEIGHT = TILE_BASE_HEIGHT + TILE_TOP_HEIGHT;

  const tileBaseColor = '#0f1a2b';
  const tileTopColor = '#1a243d';
  const worldTravelGlow = '#00ffff';
  
  const handleTileClick = () => {
    if (gamePhase === 'WORLD_TRAVEL_MOVE') selectTravelDestination(tileIndex);
  };
  
  return (
    <group position={position} rotation={[0, textRotationY, 0]} onClick={handleTileClick}>
      
      <mesh position={[0, TILE_BASE_HEIGHT / 2, 0]}>
        <boxGeometry args={[TILE_WIDTH, TILE_BASE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color={tileBaseColor} roughness={0.58} metalness={0.12} />
      </mesh>

      <mesh position={[0, TILE_BASE_HEIGHT + TILE_TOP_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH - 0.2, TILE_TOP_HEIGHT, TILE_DEPTH - 0.2]} />
        <meshStandardMaterial color={tileTopColor} roughness={0.58} metalness={0.12} />
      </mesh>
      
      {/* ✅ 타일 상판 네온 테두리 눈부심 완화 */}
      <mesh position={[0, TOTAL_HEIGHT + 0.01, 0]}>
        <boxGeometry args={[TILE_WIDTH - 0.2, 0.02, TILE_DEPTH - 0.2]} />
        <meshStandardMaterial 
          color={worldTravelGlow} 
          emissive={worldTravelGlow} 
          emissiveIntensity={gamePhase === 'WORLD_TRAVEL_MOVE' ? 0.8 : 0.2} // 강도 낮춤
          // toneMapped={false} 속성 제거하여 자연스러운 빛 표현
        />
      </mesh>
      
      <group position={[0, TOTAL_HEIGHT, 0]}>
        {children}
      </group>

      <Text
        position={[0, TOTAL_HEIGHT + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.8}
        textAlign="center"
        font="/fonts/Galmuri14.ttf"
        outlineWidth={0.04}            // ✅ 외곽선 추가 (troika-text prop)
        outlineColor="#000000"
      >
        {tile.name}
      </Text>

      {owner && (
        <mesh position={[0, TOTAL_HEIGHT + 0.01, TILE_DEPTH / 2 - 0.3]}>
          <boxGeometry args={[TILE_WIDTH - 0.4, 0.05, 0.4]} />
          <meshStandardMaterial color={getPlayerColor(owner.character)} emissive={getPlayerColor(owner.character)} emissiveIntensity={0.6}/>
        </mesh>
      )}
    </group>
  );
}