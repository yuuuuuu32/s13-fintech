import React from 'react';
import * as THREE from 'three';
import { useTexture, Billboard, Plane } from '@react-three/drei';

interface PixelPlayerProps {
  // 이제 이미지 URL 대신 'p1', 'p2' 같은 캐릭터 ID를 받습니다.
  character: string; 
}

export function PixelPlayer({ character }: PixelPlayerProps) {
  // ✅ 이미지 선택 로직을 PixelPlayer 컴포넌트 안으로 이동시켰습니다.
  const characterImageMap = {
    // ✅ 경로 맨 앞에 '/'를 붙여 public 폴더를 기준으로 경로를 지정해야 합니다.
    'p1': '/assets/player_slime.png',
    'p2': '/assets/player_cat.png',
    'p3': '/assets/player_robot.png',
    'p4': '/assets/player_goblin.png',
    'default': '/assets/player_slime.png' // 기본 이미지
  };

  // character 값에 해당하는 이미지 URL을 찾습니다.
  const imageUrl = characterImageMap[character] || characterImageMap['default'];
  const texture = useTexture(imageUrl);

  return (
    <Billboard>
      <Plane args={[2, 2]} position={[0, 1.0, 0]}>
        <meshStandardMaterial 
          map={texture}
          transparent={true}
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </Plane>
    </Billboard>
  );
}