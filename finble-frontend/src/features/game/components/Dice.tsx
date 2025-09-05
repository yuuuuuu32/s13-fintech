import { Box, useTexture } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore.ts'

// BoxGeometry의 면 순서 (+X, -X, +Y, -Y, +Z, -Z)에 맞춰 이미지 URL 순서를 변경했습니다.
const urls = [ '/dice/4.png', '/dice/3.png', '/dice/6.png', '/dice/1.png', '/dice/5.png', '/dice/2.png' ];

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
  const textures = useTexture(urls)
  const [isRolling, setIsRolling] = useState(false)

  const gamePhase = useGameStore((state) => state.gamePhase)
  const dicePower = useGameStore((state) => state.dicePower)
  const rollDiceAction = useGameStore((state) => state.rollDice)
  const movePlayer = useGameStore((state) => state.movePlayer)

  useEffect(() => {
    const triggerRoll = () => {
      if (gamePhase === 'WAITING_FOR_ROLL') {
        diceRefs.forEach((ref, i) => {
          if (ref.current) {
            ref.current.setTranslation({ x: initialDicePositions[i][0], y: initialDicePositions[i][1], z: initialDicePositions[i][2] }, true)
            ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
            ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
          }
        })
        rollDiceAction()
      }
    }
    window.addEventListener('roll-dice', triggerRoll)
    return () => {
      window.removeEventListener('roll-dice', triggerRoll)
    }
  }, [gamePhase, rollDiceAction])

  useEffect(() => {
    if (gamePhase === 'DICE_ROLLING') {
      setIsRolling(true)
      diceRefs.forEach((ref) => {
        if (ref.current) {
          const force = 5 + (dicePower / 100) * 15;
          const torque = 10 + (dicePower / 100) * 20;

          // [수정됨] y축 힘을 줄여서 주사위가 너무 높이 튀지 않도록 조정합니다.
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
      return Math.abs(linvel.x) < 0.1 && Math.abs(linvel.y) < 0.1 && Math.abs(linvel.z) < 0.1 &&
             Math.abs(angvel.x) < 0.1 && Math.abs(angvel.y) < 0.1 && Math.abs(angvel.z) < 0.1
    })

    if (isStopped) {
      setIsRolling(false)
      const diceValues = diceRefs.map(ref => getDiceValue(ref.current.rotation())) as [number, number]
      console.log(`주사위 결과: ${diceValues[0]}, ${diceValues[1]}`)
      movePlayer(diceValues)
    }
  })
  
  const TILES_PER_LINE = 8
  const TILE_WIDTH = 3
  const BOARD_SIDE_LENGTH = TILES_PER_LINE * TILE_WIDTH
  const HALF_BOARD_SIDE = BOARD_SIDE_LENGTH / 2

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_BOARD_SIDE, 50, 0.5]} position={[0, 25, HALF_BOARD_SIDE + 0.5]} />
        <CuboidCollider args={[HALF_BOARD_SIDE, 50, 0.5]} position={[0, 25, -HALF_BOARD_SIDE - 0.5]} />
        <CuboidCollider args={[0.5, 50, HALF_BOARD_SIDE]} position={[-HALF_BOARD_SIDE - 0.5, 25, 0]} />
        <CuboidCollider args={[0.5, 50, HALF_BOARD_SIDE]} position={[HALF_BOARD_SIDE + 0.5, 25, 0]} />
      </RigidBody>
      
      {diceRefs.map((ref, i) => (
        <RigidBody key={i} ref={ref} colliders="cuboid" position={initialDicePositions[i]} friction={0.8} restitution={0.2} >
          <Box args={[1, 1, 1]}>
            {textures.map((texture, index) => (
              <meshStandardMaterial key={index} map={texture} attach={`material-${index}`} />
            ))}
          </Box>
        </RigidBody>
      ))}
    </>
  )
}