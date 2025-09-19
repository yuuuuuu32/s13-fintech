// src/game/components/theme.ts

export const theme = {
  colors: {
    // 플레이어 색상
    player: {
      p1: 'royalblue',
      p2: 'hotpink',
      default: 'white',
    },
    // 타일 색상
    tile: {
      base: '#3d3d3d',       // 타일의 어두운 기반
      topSurface: '#f5f5f5',  // 타일의 밝은 상판
      textPrimary: '#212121',
      textSecondary: '#424242',
    },
    // 타일 유형별 헤더 색상
    tileType: {
      city: '#81c784',
      company: '#64b5f6',
      special: '#4ecdc4',
      chance: '#ff6b6b',
    },
    // 월드 여행 모드 시각 효과
    worldTravel: {
      glow: '#00ffff',
      hover: '#4fd1c7',
    }
  },
  sizes: {
    // 타일 크기
    tile: {
      width: 3,
      depth: 5,
      baseHeight: 0.4,
      topHeight: 0.1,
    },
    // 소유자 토큰 크기
    ownerToken: {
      radius: 0.3,
      height: 0.2,
    }
  },
  fontSizes: {
    // 텍스트 크기
    large: 0.45,
    medium: 0.4,
  }
};