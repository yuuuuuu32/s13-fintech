import { Text } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import React from 'react';

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

  const owner = players.find(p => p.properties.includes(tileIndex));

  const TILE_WIDTH = 3;
  const TILE_DEPTH = 5;
  const TILE_HEIGHT = 0.2;

  const handleTileClick = () => {
    if (gamePhase === 'WORLD_TRAVEL_MOVE') {
      selectTravelDestination(tileIndex);
    }
  };

  return (
    <group position={position} rotation={[0, textRotationY, 0]} onClick={handleTileClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
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