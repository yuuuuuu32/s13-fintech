import { Text, Line } from '@react-three/drei';
import type { TileData } from '../../data/boardData.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { PixelPlayer } from '../PixelPlayer';
import React from 'react';

// CSS 변수 값을 읽어오는 헬퍼 함수
const getCSSVariable = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

// 플레이어 색상 함수
const getPlayerColor = (character: string) => {
  const characterColors = {
    'p1': getCSSVariable('--player-cone-color', '#4A90E2'),
    'p2': getCSSVariable('--player-sphere-color', '#E74C3C'),
    'p3': getCSSVariable('--player-box-color', '#F39C12'),
    'p4': getCSSVariable('--player-torus-color', '#9B59B6')
  };
  return characterColors[character] || getCSSVariable('--player-default-color', '#FFFFFF');
};

interface BaseTileProps {
  tile: TileData;
  tileIndex: number;
  position: [number, number, number];
  textRotationY: number; // 이 prop은 rotation으로 대체됩니다.
  children: React.ReactNode;
  width?: number;
  depth?: number;
  rotation?: [number, number, number]; // ✅ STEP 3: rotation prop 추가
}

export function BaseTile({ tile, tileIndex, position, children, width, depth, rotation }: BaseTileProps) {
  const players = useGameStore(state => state.players);
  const gamePhase = useGameStore(state => state.gamePhase);
  const selectTravelDestination = useGameStore(state => state.selectTravelDestination);

  // 플레이어 배열 안전하게 변환
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});
  const owner = playersArray.find(p => p.properties?.includes(tileIndex));

  // 해당 타일에 위치한 플레이어들 찾기
  const playersOnThisTile = playersArray.filter(player => player.position === tileIndex);

  // 다중 플레이어 배치를 위한 위치 계산
  const getPlayerPosition = (playerIndex: number, totalPlayers: number): [number, number, number] => {
    if (totalPlayers === 1) {
      return [0, 0.5, 0]; // 혼자 있을 때는 타일 중앙
    }

    // 타일 크기에 비례한 배치 반지름 (작은 타일에서는 더 가깝게)
    const maxRadius = Math.min(TILE_WIDTH, TILE_DEPTH) * 0.3;
    const radius = Math.min(maxRadius, totalPlayers > 2 ? maxRadius : maxRadius * 0.7);

    // 원형으로 배치
    const angle = (playerIndex * 2 * Math.PI) / totalPlayers;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    return [x, 0.5, z]; // Y는 타일 위 0.5 높이로 고정
  };
  
  // 기존 상수 대체
  const TILE_WIDTH = width ?? 5;   // 기본 너비 5로 변경
  const TILE_DEPTH = depth ?? 7;   // 기본 깊이 7로 변경
  const TILE_BASE_HEIGHT = 0.4;
  const TILE_TOP_HEIGHT = 0.1;
  const TOTAL_HEIGHT = TILE_BASE_HEIGHT + TILE_TOP_HEIGHT;

  const tileBaseColor = getCSSVariable('--tile-base-color', '#2a2a3a');
  const tileTopColor = getCSSVariable('--tile-top-color', '#90EE90');
  const worldTravelGlow = getCSSVariable('--tile-world-travel-color', '#00ffff');
  
  // 소유자가 있으면 테두리 색상을 소유자 색으로, 없으면 검은색으로 설정
  const borderColor = owner ? getPlayerColor(owner.character) : getCSSVariable('--tile-border-color', 'black');
  
  const handleTileClick = () => {
    if (gamePhase === 'WORLD_TRAVEL_MOVE') selectTravelDestination(tileIndex);
  };
  
  return (
    <group position={position} rotation={rotation} onClick={handleTileClick}>
      
      {/* 타일 베이스 */}
      <mesh position={[0, TILE_BASE_HEIGHT / 2, 0]}>
        <boxGeometry args={[TILE_WIDTH, TILE_BASE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color={tileBaseColor} roughness={0.58} metalness={0.12} />
      </mesh>

      {/* 타일 상판 - 연한 초록색으로 통일 */}
      <mesh position={[0, TILE_BASE_HEIGHT + TILE_TOP_HEIGHT / 2, 0]} castShadow receiveShadow>
        {/* 상판 크기를 테두리보다 약간 작게 조정 */}
        <boxGeometry args={[TILE_WIDTH - 0.05, TILE_TOP_HEIGHT, TILE_DEPTH - 0.05]} />
        <meshStandardMaterial color={tileTopColor} roughness={0.3} metalness={0.1} />
        {/* Line을 사용한 테두리 - 소유자 색상 적용 */}
        <Line
          points={[
            [-TILE_WIDTH / 2, 0.051, -TILE_DEPTH / 2],
            [TILE_WIDTH / 2, 0.051, -TILE_DEPTH / 2],
            [TILE_WIDTH / 2, 0.051, TILE_DEPTH / 2],
            [-TILE_WIDTH / 2, 0.051, TILE_DEPTH / 2],
            [-TILE_WIDTH / 2, 0.051, -TILE_DEPTH / 2],
          ]}
          color={borderColor}
          lineWidth={owner ? 4 : 2} // 소유자가 있으면 더 굵게 표시
        />
      </mesh>
      
      {/* 타일 테두리만 World Travel 모드에서 발광 */}
      {gamePhase === 'WORLD_TRAVEL_MOVE' && (
        <mesh position={[0, TOTAL_HEIGHT + 0.005, 0]}>
          <boxGeometry args={[TILE_WIDTH - 0.15, 0.01, TILE_DEPTH - 0.15]} />
          <meshStandardMaterial 
            color={worldTravelGlow} 
            emissive={worldTravelGlow} 
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* 자식 컴포넌트 렌더링 영역 */}
      <group position={[0, TOTAL_HEIGHT, 0]}>
        {children}
      </group>

      {/* 해당 타일에 위치한 플레이어들 렌더링 */}
      <group position={[0, TOTAL_HEIGHT, 0]}>
        {playersOnThisTile.map((player, index) => {
          const playerPos = getPlayerPosition(index, playersOnThisTile.length);
          return (
            <group key={player.id} position={playerPos}>
              <PixelPlayer character={player.character} />
            </group>
          );
        })}
      </group>

      {/* 특수 타일 인덱스 표시 제거 */}
      {/* {isSpecialTile(tileIndex, tile.type) && ( ... )} */}

      {/* 타일 이름 텍스트 (항상 중앙에 오도록 수정) */}
      <Text
        position={[0, TOTAL_HEIGHT + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        maxWidth={TILE_WIDTH - 0.8}
        textAlign="center"
        font="/fonts/Galmuri14.ttf"
      >
        {tile.name}
      </Text>

      {/* 기존 소유자 표시 막대 제거 */}
      {/* {owner && ( ... )} */}
    </group>
  );
}