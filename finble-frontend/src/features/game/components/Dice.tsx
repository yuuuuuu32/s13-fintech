import { Box, useTexture, Html } from "@react-three/drei";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "../store/useGameStore.ts";
import styles from "./Dice.module.css";

// 주사위 값에 따른 회전 값을 반환하는 헬퍼 함수
const getRotationForDiceValue = (value: number): THREE.Quaternion => {
  const quaternion = new THREE.Quaternion();
  // Using Euler angles for simplicity and clarity
  switch (value) {
    case 1: // -Y face up
      quaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      break;
    case 2: // -Z face up
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      break;
    case 3: // -X face up
      quaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
      break;
    case 4: // +X face up
      quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      break;
    case 5: // +Z face up
      quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      break;
    case 6: // +Y face up (default)
    default:
      quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      break;
  }
  return quaternion;
};

const initialDicePositions: [number, number, number][] = [
  [-2, 5, 0],
  [2, 5, 0],
];

// 주사위 한 개를 렌더링하는 컴포넌트
const Die = () => {
  // useTexture를 사용해 public 폴더의 이미지로 텍스처를 적용합니다.
  const textures = useTexture([
    "/dice/4.png", // +X (오른쪽)
    "/dice/3.png", // -X (왼쪽)
    "/dice/6.png", // +Y (위)
    "/dice/1.png", // -Y (아래)
    "/dice/5.png", // +Z (앞)
    "/dice/2.png", // -Z (뒤)
  ]);

  // useMemo를 사용해 재질이 렌더링마다 재생성되지 않도록 최적화합니다.
  const materials = useMemo(
    () =>
      textures.map(
        (texture) => new THREE.MeshStandardMaterial({ map: texture })
      ),
    [textures]
  );

  // Box에 6개의 면 재질을 배열로 전달합니다.
  return <Box args={[1, 1, 1]} material={materials} castShadow />;
};

export function Dice() {
  const diceRefs = useMemo(
    () => [
      React.createRef<RapierRigidBody>(),
      React.createRef<RapierRigidBody>(),
    ],
    []
  );
  const [isRolling, setIsRolling] = useState(false);
  const [displayDiceSum, setDisplayDiceSum] = useState<number | null>(null);

  const gamePhase = useGameStore((state) => state.gamePhase);
  const dicePower = useGameStore((state) => state.dicePower);
  const rollDiceAction = useGameStore((state) => state.rollDice);
  const dice = useGameStore((state) => state.dice); // 서버에서 받은 개별 주사위 값
  const serverDiceNum = useGameStore((state) => state.serverDiceNum); // 서버에서 받은 주사위 합계
  const finishDiceRoll = useGameStore((state) => state.finishDiceRoll);
  const isDiceRolled = useGameStore((state) => state.isDiceRolled);
  const setIsDiceRolled = useGameStore((state) => state.setIsDiceRolled);

  useEffect(() => {
    const triggerRoll = () => {
      rollDiceAction();
    };
    window.addEventListener("roll-dice", triggerRoll);
    return () => {
      window.removeEventListener("roll-dice", triggerRoll);
    };
  }, [rollDiceAction]);

  useEffect(() => {
    if (gamePhase === "DICE_ROLLING") {
      setIsRolling(true);
      setDisplayDiceSum(null); // Clear previous sum
      diceRefs.forEach((ref, i) => {
        if (ref.current) {
          ref.current.setTranslation(
            {
              x: initialDicePositions[i][0],
              y: initialDicePositions[i][1],
              z: initialDicePositions[i][2],
            },
            true
          );
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

          const force = 4 + (dicePower / 100) * 12;
          const torque = 8 + (dicePower / 100) * 15;

          ref.current.setLinvel(
            {
              x: (Math.random() - 0.5) * force,
              y: 6 + Math.random() * (force / 2),
              z: (Math.random() - 0.5) * force,
            },
            true
          );
          ref.current.setAngvel(
            {
              x: (Math.random() - 0.5) * torque,
              y: (Math.random() - 0.5) * torque,
              z: (Math.random() - 0.5) * torque,
            },
            true
          );
        }
      });
    }
  }, [gamePhase, dicePower, diceRefs]);

  useFrame(() => {
    if (!isRolling) return;

    const isStopped = diceRefs.every((ref) => {
      if (!ref.current) return false;
      const linvel = ref.current.linvel();
      const angvel = ref.current.angvel();
      // threshold 값을 0.1 -> 0.2로 높여서 더 빨리 멈춘 것으로 간주합니다. (시간 단축)
      const threshold = 0.2;
      return (
        Math.abs(linvel.x) < threshold &&
        Math.abs(linvel.y) < threshold &&
        Math.abs(linvel.z) < threshold &&
        Math.abs(angvel.x) < threshold &&
        Math.abs(angvel.y) < threshold &&
        Math.abs(angvel.z) < threshold
      );
    });

    if (isStopped && !isDiceRolled) {
      setIsRolling(false);
      setIsDiceRolled(true);

      // 서버에서 받은 주사위 값으로 주사위의 최종 회전을 설정
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

  const TILES_PER_SIDE = 8;
  const TILE_WIDTH = 4;
  const TILE_DEPTH = 6;
  const BOARD_SIZE = TILES_PER_SIDE * TILE_WIDTH;
  const GREEN_AREA_SIZE = BOARD_SIZE - TILE_DEPTH * 2;
  const HALF_GREEN_AREA_SIZE = GREEN_AREA_SIZE / 2;

  const WALL_THICKNESS = 2;
  const HALF_WALL_THICKNESS = WALL_THICKNESS / 2;

  return (
    <>
      {/* 주사위 */}
      {diceRefs.map((ref, i) => (
        <RigidBody
          key={i}
          ref={ref}
          position={initialDicePositions[i]}
          colliders="cuboid"
          scale={2.5}
        >
          <Die />
        </RigidBody>
      ))}

      {displayDiceSum !== null && (
        <Html position={[0, 2, 0]} center>
          <div className={styles.diceSum}>{displayDiceSum}</div>
        </Html>
      )}
      
      {/* 주사위가 밖으로 나가지 않도록 하는 투명한 벽 */}
      {/* Front Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.5, HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS]}>
          <boxGeometry
            args={[GREEN_AREA_SIZE + WALL_THICKNESS, 100, WALL_THICKNESS]}
          />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Back Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={[0, 0.5, -(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS)]}
        >
          <boxGeometry
            args={[GREEN_AREA_SIZE + WALL_THICKNESS, 100, WALL_THICKNESS]}
          />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS, 0.5, 0]}>
          <boxGeometry
            args={[WALL_THICKNESS, 100, GREEN_AREA_SIZE + WALL_THICKNESS]}
          />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={[-(HALF_GREEN_AREA_SIZE + HALF_WALL_THICKNESS), 0.5, 0]}
        >
          <boxGeometry
            args={[WALL_THICKNESS, 100, GREEN_AREA_SIZE + WALL_THICKNESS]}
          />
          <meshStandardMaterial visible={false} />
        </mesh>
      </RigidBody>
    </>
  );
}
