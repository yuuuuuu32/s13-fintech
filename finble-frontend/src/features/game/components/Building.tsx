import { Image } from "@react-three/drei";

// 3개의 PNG 이미지 파일을 모두 import 합니다.
import houseTextureUrl from "../../../assets/building_house.png";
import buildingTextureUrl from "../../../assets/building_building.png";
import hotelTextureUrl from "../../../assets/building_hotel.png";

interface BuildingProps {
  level: 1 | 2 | 3;
  tileIndex: number;
}

// 보드 위치에 따른 기본 회전 각도를 계산하는 함수
const getRotationByTileIndex = (tileIndex: number) => {
  if (tileIndex >= 9 && tileIndex <= 16) { // 보드 왼쪽 면
    return -Math.PI / 2; // 90도
  }

  if (tileIndex >= 25 && tileIndex <= 31) { // 보드 오른쪽 면
    return -Math.PI / 2; // -90도
  }
  return 0; // 보드 아래쪽 면 (기본값)
};

function Building({ level, tileIndex }: BuildingProps) {
  const TILE_HEIGHT = 0.2;
  const Z_POSITION = -0.8;

  // 타일 위치에 따른 기본 각도
  const baseRotation = getRotationByTileIndex(tileIndex);

  // 각 건물의 정보를 객체로 정리
  const buildingParams = {
    house: {
      size: [1.8, 1.5],
      yPos: TILE_HEIGHT / 2 + 1.5 / 2,
      rotationY: Math.PI / 6, // 30도 (개별 각도)
    },
    building: {
      size: [2.0, 3.2],
      yPos: TILE_HEIGHT / 2 + 3.2 / 2,
      rotationY: Math.PI / 4, // 45도 (개별 각도)
    },
    hotel: {
      size: [2.1, 3.6],
      yPos: TILE_HEIGHT / 2 + 3.6 / 2,
      rotationY: Math.PI / 5, // 36도 (개별 각도)
    },
  };

  // X축 위치는 레벨에 따라 다르게 설정
  let houseX = 0,
    buildingX = 0,
    hotelX = 0;

  if (level === 1) {
    houseX = 0;
  } else if (level === 2) {
    houseX = -0.7;
    buildingX = 0.7;
  } else if (level === 3) {
    houseX = -0.9;
    buildingX = 0;
    hotelX = 1.2;
  }

  return (
    <group>
      {level >= 1 && (
        <Image
          url={houseTextureUrl}
          scale={buildingParams.house.size}
          position={[houseX, buildingParams.house.yPos, Z_POSITION]}
          rotation={[0, baseRotation + buildingParams.house.rotationY, 0]} // 기본 각도 + 개별 각도
          transparent
        />
      )}

      {level >= 2 && (
        <Image
          url={buildingTextureUrl}
          scale={buildingParams.building.size}
          position={[buildingX, buildingParams.building.yPos, Z_POSITION]}
          rotation={[0, baseRotation + buildingParams.building.rotationY, 0]} // 기본 각도 + 개별 각도
          transparent
        />
      )}

      {level >= 3 && (
        <Image
          url={hotelTextureUrl}
          scale={buildingParams.hotel.size}
          position={[hotelX, buildingParams.hotel.yPos, Z_POSITION]}
          rotation={[0, baseRotation + buildingParams.hotel.rotationY, 0]} // 기본 각도 + 개별 각도
          transparent
        />
      )}
    </group>
  );
}

export default Building;