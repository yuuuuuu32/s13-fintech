import { Box } from '@react-three/drei';

// CSS 변수 값을 가져오는 함수
const getCSSVariable = (variableName: string) => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
};

interface BuildingProps {
  level: 1 | 2 | 3;
}

// 간단한 박스 형태로 건물을 표현합니다. 레벨에 따라 이미지가 달라집니다.
function Building({ level }: BuildingProps) {
  const TILE_HEIGHT = 0.2;

  // 각 레벨에 맞는 건물 텍스처(이미지)를 불러옵니다.
  // 주의: 아래 경로는 예시이며, 실제 이미지 파일 위치에 맞게 수정해야 합니다.
  const [houseTexture, hotelTexture, skyscraperTexture] = useTexture([
    "/src/assets/building_house.png",
    "/src/assets/building_building.png",
    "/src/assets/building_hotel.png",
  ]);

  switch (level) {
    case 1: // 주택
      return (
        <Box
          position={[0, TILE_HEIGHT / 2 + 0.3, -1.5]}
          args={[1, 0.6, 1]}
          castShadow
        >
          {/* 재질(Material)에 map 속성으로 불러온 텍스처를 적용합니다. */}
                    <meshStandardMaterial map={houseTexture} />       {" "}
        </Box>
      );
    case 2: // 호텔
      return (
        <Box
          position={[0, TILE_HEIGHT / 2 + 0.6, -1.5]}
          args={[1.2, 1.2, 1.2]}
          castShadow
        >
                    <meshStandardMaterial map={hotelTexture} />       {" "}
        </Box>
      );
    case 3: // 빌딩
      return (
        <Box
          position={[0, TILE_HEIGHT / 2 + 1, -1.5]}
          args={[1.5, 2, 1.5]}
          castShadow
        >
                    <meshStandardMaterial map={skyscraperTexture} />       {" "}
        </Box>
      );
    default:
      return null;
  }
}
export default Building;
