import { Box } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';

// 각 주사위 면에 대한 텍스처를 동적으로 생성하는 함수입니다.
// Canvas API를 사용해 주사위 눈을 그린 뒤 이미지 텍스처로 만듭니다.
const createDiceFaceTexture = (value: number) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const size = 256; // 텍스처 해상도
  canvas.width = size;
  canvas.height = size;

  if (!context) {
    // 컨텍스트를 가져오지 못하면 null 반환
    return null;
  }

  // 흰색 배경을 그립니다.
  context.fillStyle = 'white';
  context.fillRect(0, 0, size, size);
  
  // 검은색으로 주사위 눈을 그립니다.
  context.fillStyle = 'black';

  const pipRadius = size * 0.1;
  const positions: { [key: number]: [number, number][] } = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.25, 0.75], [0.75, 0.25], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.25, 0.75], [0.75, 0.25], [0.75, 0.75], [0.5, 0.5]],
    6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
  };

  const pips = positions[value];
  if (pips) {
    pips.forEach(([x, y]) => {
      context.beginPath();
      context.arc(x * size, y * size, pipRadius, 0, 2 * Math.PI);
      context.fill();
    });
  }

  // 그려진 canvas를 바탕으로 3D 텍스처를 생성하여 반환합니다.
  return new THREE.CanvasTexture(canvas);
};

// 주사위 한 개를 렌더링하는 컴포넌트
const Die = () => {
  // useMemo를 사용해 텍스처가 렌더링마다 재생성되지 않도록 최적화합니다.
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4) }), // +X (오른쪽)
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3) }), // -X (왼쪽)
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6) }), // +Y (위)
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1) }), // -Y (아래)
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5) }), // +Z (앞)
    new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2) }), // -Z (뒤)
  ], []);

  // Box에 6개의 면 재질을 배열로 전달합니다.
  return (
    <Box args={[1, 1, 1]} material={materials} castShadow />
  );
};

// 윗면의 값을 계산하는 함수
const getDiceValue = (rotation: THREE.Quaternion): number => {
    let maxDot = -Infinity;
    let value = 0;
    const upVector = new THREE.Vector3(0, 1, 0);

    const axes = [
        { value: 6, vec: new THREE.Vector3(0, 1, 0) },
        { value: 1, vec: new THREE.Vector3(0, -1, 0) },
        { value: 5, vec: new THREE.Vector3(0, 0, 1) },
        { value: 2, vec: new THREE.Vector3(0, 0, -1) },
        { value: 4, vec: new THREE.Vector3(1, 0, 0) },
        { value: 3, vec: new THREE.Vector3(-1, 0, 0) },
    ];

    for (const axis of axes) {
        const worldVector = axis.vec.clone().applyQuaternion(rotation);
        const dot = worldVector.dot(upVector);
        if (dot > maxDot) {
            maxDot = dot;
            value = axis.value;
        }
    }
    return value;
};

const initialDicePositions: [number, number, number][] = [[-2, 5, 0], [2, 5, 0]];

export function Dice() {
  const diceRefs = [useRef<any>(null!), useRef<any>(null!)]
  const [isRolling, setIsRolling] = useState(false)

  const gamePhase = useGameStore((state) => state.gamePhase)
  const dicePower = useGameStore((state) => state.dicePower)
  const rollDiceAction = useGameStore((state) => state.rollDice)
  const movePlayer = useGameStore((state) => state.movePlayer)

  useEffect(() => {
    const triggerRoll = () => {
      rollDiceAction()
    }
    window.addEventListener('roll-dice', triggerRoll)
    return () => {
      window.removeEventListener('roll-dice', triggerRoll)
    }
  }, [rollDiceAction])

  useEffect(() => {
    if (gamePhase === 'DICE_ROLLING') {
      setIsRolling(true)
      diceRefs.forEach((ref, i) => {
        if (ref.current) {
          ref.current.setTranslation({ x: initialDicePositions[i][0], y: initialDicePositions[i][1], z: initialDicePositions[i][2] }, true)
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
          
          // 주사위를 던지는 힘과 회전력을 약간 줄여 안정성을 높입니다.
          const force = 4 + (dicePower / 100) * 12;
          const torque = 8 + (dicePower / 100) * 15;

          ref.current.setLinvel({ x: (Math.random() - 0.5) * force, y: 6 + Math.random() * (force / 2), z: (Math.random() - 0.5) * force }, true);
          ref.current.setAngvel({ x: (Math.random() - 0.5) * torque, y: (Math.random() - 0.5) * torque, z: (Math.random() - 0.5) * torque }, true);
        }
      })
    }
  }, [gamePhase, dicePower]);

  useFrame(() => {
    if (!isRolling) return

    const isStopped = diceRefs.every(ref => {
      if (!ref.current) return false
      const linvel = ref.current.linvel()
      const angvel = ref.current.angvel()
      const threshold = 0.1;
      return Math.abs(linvel.x) < threshold && Math.abs(linvel.y) < threshold && Math.abs(linvel.z) < threshold &&
             Math.abs(angvel.x) < threshold && Math.abs(angvel.y) < threshold && Math.abs(angvel.z) < threshold
    })

    if (isStopped) {
      setIsRolling(false)
      const diceValues = diceRefs.map(ref => getDiceValue(ref.current.rotation())) as [number, number]
      console.log(`주사위 결과: ${diceValues[0]}, ${diceValues[1]}`)
      movePlayer(diceValues)
    }
  })
  
  const TILES_PER_SIDE = 8;
  const TILE_WIDTH = 3;
  const TILE_DEPTH = 4.5;
  const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;
  const GREEN_AREA_SIZE = BOARD_SIZE - TILE_DEPTH * 2;
  const HALF_GREEN_AREA_SIZE = GREEN_AREA_SIZE / 2;
  
  // 벽의 두께를 늘립니다. (0.5 -> 2)
  const WALL_THICKNESS = 2;
  const HALF_WALL_THICKNESS = WALL_THICKNESS / 2;

  return (
    <>
      {/* 투명 벽의 두께를 늘려 주사위가 뚫고 나가는 현상을 방지합니다. */}
      <RigidBody type="fixed" colliders={false}>
          {/* Z축 방향 벽 (위, 아래) */}
          <CuboidCollider args={[HALF_GREEN_AREA_SIZE, 10, HALF_WALL_THICKNESS]} position={[0, 5, HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS]} />
          <CuboidCollider args={[HALF_GREEN_AREA_SIZE, 10, HALF_WALL_THICKNESS]} position={[0, 5, -(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS)]} />
          {/* X축 방향 벽 (왼쪽, 오른쪽) */}
          <CuboidCollider args={[HALF_WALL_THICKNESS, 10, HALF_GREEN_AREA_SIZE]} position={[HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS, 5, 0]} />
          <CuboidCollider args={[HALF_WALL_THICKNESS, 10, HALF_GREEN_AREA_SIZE]} position={[-(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS), 5, 0]} />
      </RigidBody>
      
      {diceRefs.map((ref, i) => (
        <RigidBody key={i} ref={ref} colliders="cuboid" position={initialDicePositions[i]} friction={0.8} restitution={0.2} >
          <Die />
        </RigidBody>
      ))}
    </>
  )
}