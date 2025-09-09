// 건물 레벨에 따른 이름 정의 (UI 표시용)
export const BuildingType = {
  1: '주택',
  2: '호텔',
  3: '빌딩'
};

// 각 칸(타일)의 데이터 타입을 정의합니다.
export interface TileData { // [수정] export 추가
  name: string // 칸의 이름 (예: "서울", "찬스")
  type: 'city' | 'company' | 'special' | 'chance' // 칸의 종류
  price?: number // 땅값 (도시, 건설사)
  buildingPrice?: number // 건물 1단계(주택) 건설 비용
  // 통행료: [기본, 주택, 호텔, 빌딩]
  tolls?: number[]
  // 건물 상태를 저장할 객체 추가
  buildings?: {
      level: 0 | 1 | 2 | 3; // 0: 없음, 1: 주택, 2: 호텔, 3: 빌딩
  }
}

// 32칸 보드판 데이터. 각 모서리에 특수 칸을 배치합니다.
// 모든 city 타입에 buildings 속성과 4단계 통행료를 추가했습니다.
export const boardData: TileData[] = [
  // 1번 라인 (아래쪽)
  { name: '시작', type: 'special' }, // 0
  { name: '광주', type: 'city', price: 250000, buildingPrice: 120000, tolls: [20000, 100000, 250000, 450000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },
  { name: '울산', type: 'city', price: 300000, buildingPrice: 150000, tolls: [25000, 120000, 300000, 550000], buildings: { level: 0 } },
  { name: 'GS건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '대전', type: 'city', price: 350000, buildingPrice: 180000, tolls: [30000, 150000, 380000, 680000], buildings: { level: 0 } },
  { name: '대구', type: 'city', price: 350000, buildingPrice: 180000, tolls: [30000, 150000, 380000, 680000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },

  // 2번 라인 (왼쪽)
  { name: '무인도', type: 'special' }, // 8
  { name: '인천', type: 'city', price: 400000, buildingPrice: 200000, tolls: [40000, 180000, 450000, 800000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },
  { name: '수원', type: 'city', price: 420000, buildingPrice: 210000, tolls: [42000, 200000, 500000, 900000], buildings: { level: 0 } },
  { name: '롯데건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '성남', type: 'city', price: 450000, buildingPrice: 220000, tolls: [45000, 220000, 550000, 1000000], buildings: { level: 0 } },
  { name: '용인', type: 'city', price: 450000, buildingPrice: 220000, tolls: [45000, 220000, 550000, 1000000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },

  // 3번 라인 (위쪽)
  { name: '박람회', type: 'special' }, // 16
  { name: '제주', type: 'city', price: 500000, buildingPrice: 250000, tolls: [50000, 250000, 600000, 1100000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },
  { name: '세종', type: 'city', price: 520000, buildingPrice: 260000, tolls: [52000, 270000, 650000, 1200000], buildings: { level: 0 } },
  { name: '포스코이앤씨', type: 'company', price: 400000, tolls: [100000] },
  { name: '부산', type: 'city', price: 550000, buildingPrice: 280000, tolls: [55000, 300000, 750000, 1400000], buildings: { level: 0 } },
  { name: '해운대', type: 'city', price: 550000, buildingPrice: 280000, tolls: [55000, 300000, 750000, 1400000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },

  // 4번 라인 (오른쪽)
  { name: '세계여행', type: 'special' }, // 24
  { name: '강남', type: 'city', price: 650000, buildingPrice: 320000, tolls: [65000, 350000, 850000, 1600000], buildings: { level: 0 } },
  { name: '찬스', type: 'chance' },
  { name: '서초', type: 'city', price: 700000, buildingPrice: 350000, tolls: [70000, 400000, 950000, 1800000], buildings: { level: 0 } },
  { name: '현대건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '송파', type: 'city', price: 750000, buildingPrice: 380000, tolls: [75000, 450000, 1100000, 2000000], buildings: { level: 0 } },
  { name: '삼성물산', type: 'company', price: 400000, tolls: [100000] },
  { name: '찬스', type: 'chance' },
]