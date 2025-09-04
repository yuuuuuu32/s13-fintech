// 각 칸(타일)의 데이터 타입을 정의합니다.
export interface TileData {
  name: string // 칸의 이름 (예: "서울", "찬스")
  type: 'city' | 'company' | 'special' | 'chance' // 칸의 종류
  price?: number // 땅값 (도시, 건설사)
  buildingPrice?: number // 건물값 (도시)
  tolls?: number[] // 통행료 [기본, 건물1채]
}

// 32칸 보드판의 전체 데이터 배열입니다.
export const boardData: TileData[] = [
  // 1번 라인 (오른쪽)
  { name: '시작', type: 'special' },
  { name: '광주', type: 'city', price: 250000, buildingPrice: 120000, tolls: [20000, 100000] },
  { name: '찬스', type: 'chance' },
  { name: '울산', type: 'city', price: 300000, buildingPrice: 150000, tolls: [25000, 120000] },
  { name: 'GS건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '대전', type: 'city', price: 350000, buildingPrice: 180000, tolls: [30000, 150000] },
  { name: '대구', type: 'city', price: 350000, buildingPrice: 180000, tolls: [30000, 150000] },
  { name: '감옥', type: 'special' },

  // 2번 라인 (위쪽)
  { name: '인천', type: 'city', price: 400000, buildingPrice: 200000, tolls: [40000, 180000] },
  { name: '찬스', type: 'chance' },
  { name: '수원', type: 'city', price: 420000, buildingPrice: 210000, tolls: [42000, 200000] },
  { name: '롯데건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '성남', type: 'city', price: 450000, buildingPrice: 220000, tolls: [45000, 220000] },
  { name: '용인', type: 'city', price: 450000, buildingPrice: 220000, tolls: [45000, 220000] },
  { name: '박람회', type: 'special' },

  // 3번 라인 (왼쪽)
  { name: '제주', type: 'city', price: 500000, buildingPrice: 250000, tolls: [50000, 250000] },
  { name: '찬스', type: 'chance' },
  { name: '세종', type: 'city', price: 520000, buildingPrice: 260000, tolls: [52000, 270000] },
  { name: '포스코이앤씨', type: 'company', price: 400000, tolls: [100000] },
  { name: '부산', type: 'city', price: 550000, buildingPrice: 280000, tolls: [55000, 300000] },
  { name: '해운대', type: 'city', price: 550000, buildingPrice: 280000, tolls: [55000, 300000] },
  { name: '우주여행', type: 'special' },

  // 4번 라인 (아래쪽)
  { name: '강남', type: 'city', price: 650000, buildingPrice: 320000, tolls: [65000, 350000] },
  { name: '찬스', type: 'chance' },
  { name: '서초', type: 'city', price: 700000, buildingPrice: 350000, tolls: [70000, 400000] },
  { name: '현대건설', type: 'company', price: 400000, tolls: [100000] },
  { name: '송파', type: 'city', price: 750000, buildingPrice: 380000, tolls: [75000, 450000] },
  { name: '삼성물산', type: 'company', price: 400000, tolls: [100000] },
]