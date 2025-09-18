import { Text } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import React, { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BaseTileProps {
  tile: TileData;
  tileIndex: number;
  position: [number, number, number];
  textRotationY: number;
  children: React.ReactNode;
}

const getPlayerColor = (playerId: string) => {
  if (playerId === 'player-1' || playerId === 'user-me') return 'royalblue';
  if (playerId === 'player-2') return 'hotpink';
  return 'white';
};

export function BaseTile({ tile, tileIndex, position, textRotationY, children }: BaseTileProps) {
  const players = useGameStore(state => state.players);
  const gamePhase = useGameStore(state => state.gamePhase);
  const selectTravelDestination = useGameStore(state => state.selectTravelDestination);

  const [isHovered, setIsHovered] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const owner = players.find(p => p.properties.includes(tileIndex));

  const TILE_WIDTH = 3;
  const TILE_DEPTH = 5;
  const TILE_HEIGHT = 0.2;

  const isWorldTravelMode = gamePhase === 'WORLD_TRAVEL_MOVE';

  useFrame((state) => {
    if (isWorldTravelMode) {
      const time = state.clock.getElapsedTime();
      setGlowIntensity(0.5 + 0.3 * Math.sin(time * 2));
    }
  });

  const handleTileClick = () => {
    if (isWorldTravelMode) {
      selectTravelDestination(tileIndex);
    }
  };

  const handlePointerOver = () => {
    if (isWorldTravelMode) {
      setIsHovered(true);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    document.body.style.cursor = 'auto';
  };

  const getTileColor = () => {
    if (isWorldTravelMode) {
      if (isHovered) {
        return '#4fd1c7';
      }
      return `hsl(180, 70%, ${60 + glowIntensity * 20}%)`;
    }

    // Tile type based colors similar to 132.png
    switch (tile.type) {
      case 'city':
      case 'NORMAL':
        return "#f8f8f8"; // Light beige like the reference
      case 'company':
        return "#e8e0d0"; // Slightly darker beige
      case 'chance':
      case 'CHANCE':
        return "#ff6b6b"; // Red for chance tiles
      case 'special':
      case 'SPECIAL':
      case 'START':
        return "#4ecdc4"; // Teal for special tiles
      case 'JAIL':
        return "#95a5a6"; // Gray for jail
      case 'AIRPLANE':
        return "#3498db"; // Blue for airport
      default:
        return "#f8f8f8";
    }
  };

  return (
    <group position={position} rotation={[0, textRotationY, 0]}
           onClick={handleTileClick}
           onPointerOver={handlePointerOver}
           onPointerOut={handlePointerOut}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial
          color={getTileColor()}
          emissive={isWorldTravelMode ? new THREE.Color(0x004d4d).multiplyScalar(glowIntensity * 0.3) : undefined}
        />
      </mesh>

      {/* Tile border */}
      <mesh position={[0, TILE_HEIGHT / 2 + 0.001, 0]}>
        <boxGeometry args={[TILE_WIDTH + 0.02, 0.002, TILE_DEPTH + 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {isWorldTravelMode && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.005, 0]}>
          <boxGeometry args={[TILE_WIDTH + 0.1, 0.01, TILE_DEPTH + 0.1]} />
          <meshStandardMaterial
            color="#00ffff"
            transparent
            opacity={0.6 + glowIntensity * 0.4}
            emissive={new THREE.Color(0x00ffff).multiplyScalar(0.2)}
          />
        </mesh>
      )}
      
      {/* Type-specific content will be rendered here */}
      {children}

      <Text
        position={[0, TILE_HEIGHT / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.6}
        textAlign="center"
        lineHeight={1.2}
      >
        {tile.name}
      </Text>

      {owner && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.01, TILE_DEPTH / 2 - 0.5]}>
          <boxGeometry args={[TILE_WIDTH - 0.2, 0.1, 0.5]} />
          <meshStandardMaterial color={getPlayerColor(owner.id)} />
        </mesh>
      )}
    </group>
  );
}