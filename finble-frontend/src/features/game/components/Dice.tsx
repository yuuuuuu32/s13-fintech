import { Box, useTexture, Html } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';

// 주사위 값에 따른 회전 값을 반환하는 헬퍼 함수
const getRotationForDiceValue = (value: number): THREE.Quaternion => {
  const quaternion = new THREE.Quaternion();
  switch (value) {
    case 1: quaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0)); break;            // -Y up
    case 2: quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); break;        // -Z up
    case 3: quaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2)); break;       // -X up
    case 4: quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); break;        // +X up
    case 5: quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); break;       // +Z up
    case 6:
    default: quaternion.setFromEuler(new THREE.Euler(0, 0, 0)); break;                  // +Y up
  }
  return quaternion;
};

const initialDicePositions: [number, number, number][] = [[-2, 5, 0], [2, 5, 0]];

// 주사위 한 개
const Die = () => {
  const textures = useTexture([
    '/dice/4.png', // +X
    '/dice/3.png', // -X
    '/dice/6.png', // +Y
    '/dice/1.png', // -Y
    '/dice/5.png', // +Z
    '/dice/2.png', // -Z
  ]);
  const materials = useMemo(
    () => textures.map((t) => new THREE.MeshStandardMaterial({ map: t })),
    [textures]
  );
  return <Box args={[1, 1, 1]} material={materials} castShadow />;
};

export function Dice() {
  const diceRefs = useMemo(
    () => [React.createRef<RapierRigidBody>(), React.createRef<RapierRigidBody>()],
    []
  );
  const [isRolling, setIsRolling] = useState(false);
  const [displayDiceSum, setDisplayDiceSum] = useState<number | null>(null);

  const gamePhase = useGameStore((s) => s.gamePhase);
  const dicePower = useGameStore((s) => s.dicePower);
  const rollDiceAction = useGameStore((s) => s.rollDice);
  const dice = useGameStore((s) => s.dice);
  const serverDiceNum = useGameStore((s) => s.serverDiceNum);
  const finishDiceRoll = useGameStore((s) => s.finishDiceRoll);
  const isDiceRolled = useGameStore((s) => s.isDiceRolled);
  const setIsDiceRolled = useGameStore((s) => s.setIsDiceRolled);

  useEffect(() => {
    const triggerRoll = () => rollDiceAction();
    window.addEventListener('roll-dice', triggerRoll);
    return () => window.removeEventListener('roll-dice', triggerRoll);
  }, [rollDiceAction]);

  useEffect(() => {
    if (gamePhase === 'DICE_ROLLING') {
      setIsRolling(true);
      setDisplayDiceSum(null);
      diceRefs.forEach((ref, i) => {
        if (!ref.current) return;
        ref.current.setTranslation(
          { x: initialDicePositions[i][0], y: initialDicePositions[i][1], z: initialDicePositions[i][2] },
          true
        );
        ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

        const force = 4 + (dicePower / 100) * 12;
        const torque = 8 + (dicePower / 100) * 15;

        ref.current.setLinvel(
          { x: (Math.random() - 0.5) * force, y: 6 + Math.random() * (force / 2), z: (Math.random() - 0.5) * force },
          true
        );
        ref.current.setAngvel(
          { x: (Math.random() - 0.5) * torque, y: (Math.random() - 0.5) * torque, z: (Math.random() - 0.5) * torque },
          true
        );
      });
    }
  }, [gamePhase, dicePower, diceRefs]);

  useFrame(() => {
    if (!isRolling) return;
    const threshold = 0.2;
    const isStopped = diceRefs.every((ref) => {
      if (!ref.current) return false;
      const v = ref.current.linvel();
      const w = ref.current.angvel();
      return (
        Math.abs(v.x) < threshold &&
        Math.abs(v.y) < threshold &&
        Math.abs(v.z) < threshold &&
        Math.abs(w.x) < threshold &&
        Math.abs(w.y) < threshold &&
        Math.abs(w.z) < threshold
      );
    });

    if (isStopped && !isDiceRolled) {
      setIsRolling(false);
      setIsDiceRolled(true);

      diceRefs.forEach((ref, i) => {
        if (ref.current && dice[i] !== undefined) {
          ref.current.setRotation(getRotationForDiceValue(dice[i]), true);
        }
      });

      setDisplayDiceSum(serverDiceNum);
      setTimeout(() => {
        setDisplayDiceSum(null);
        finishDiceRoll();
      }, 2000);
    }
  });

  // ===== 보드 치수: Board.tsx와 반드시 동일 =====
  const TILES_PER_SIDE = 9; // ✅ 8 → 9 맞춤
  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;
  const GREEN_AREA_SIZE = BOARD_SIZE - TILE_DEPTH * 2;
  const HALF_GREEN_AREA_SIZE = GREEN_AREA_SIZE / 2;

  const WALL_THICKNESS = 2.5;
  const HALF_WALL_THICKNESS = WALL_THICKNESS / 2;
  const SAFETY_MARGIN = 1.0; // ✅ 누락되어 있던 상수 추가

  return (
    <>
      {/* 주사위 본체(반발 낮고, 미끄러짐 적게, 터널링 방지) */}
      {diceRefs.map((ref, i) => (
        <RigidBody
          key={i}
          ref={ref}
          position={initialDicePositions[i]}
          colliders="cuboid"
          restitution={0.25}
          friction={0.9}
          ccd
        >
          <Die />
        </RigidBody>
      ))}

      {displayDiceSum !== null && (
        <Html position={[0, 2, 0]} center>
          <div
            style={{
              color: 'white',
              fontSize: '3em',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {displayDiceSum}
          </div>
        </Html>
      )}

      {/* 보호벽: 네 변 모두 여유치 포함 + 충분한 높이 */}
      {/* Front */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={1}>
        <mesh position={[0, 1, HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS]}>
          <boxGeometry args={[GREEN_AREA_SIZE + WALL_THICKNESS + SAFETY_MARGIN, 100, WALL_THICKNESS]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Back */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={1}>
        <mesh position={[0, 1, -(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS)]}>
          <boxGeometry args={[GREEN_AREA_SIZE + WALL_THICKNESS + SAFETY_MARGIN, 100, WALL_THICKNESS]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Right */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={1}>
        <mesh position={[HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS, 1, 0]}>
          <boxGeometry args={[WALL_THICKNESS, 100, GREEN_AREA_SIZE + WALL_THICKNESS + SAFETY_MARGIN]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Left */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={1}>
        <mesh position={[-(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS), 1, 0]}>
          <boxGeometry args={[WALL_THICKNESS, 100, GREEN_AREA_SIZE + WALL_THICKNESS + SAFETY_MARGIN]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* 세이프티 바닥 (경계면 이슈 대비) */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={1}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[BOARD_SIZE + 10, 0.1, BOARD_SIZE + 10]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>
    </>
  );
}
