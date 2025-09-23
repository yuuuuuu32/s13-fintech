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

// 간단한 박스 형태로 건물을 표현합니다. 레벨에 따라 크기와 색상이 달라집니다.
function Building({ level }: BuildingProps) {
  const TILE_HEIGHT = 0.2;

  switch (level) {
    case 1: // 주택
      return (
        <Box position={[0, TILE_HEIGHT / 2 + 0.3, -1.5]} args={[1, 0.6, 1]} castShadow>
          <meshStandardMaterial color={getCSSVariable('--building-house-color')} />
        </Box>
      );
    case 2: // 호텔
      return (
        <Box position={[0, TILE_HEIGHT / 2 + 0.6, -1.5]} args={[1.2, 1.2, 1.2]} castShadow>
          <meshStandardMaterial color={getCSSVariable('--building-hotel-color')} />
        </Box>
      );
    case 3: // 빌딩
      return (
        <Box position={[0, TILE_HEIGHT / 2 + 1, -1.5]} args={[1.5, 2, 1.5]} castShadow>
          <meshStandardMaterial color={getCSSVariable('--building-skyscraper-color')} />
        </Box>
      );
    default:
      return null;
  }
}
export default Building;