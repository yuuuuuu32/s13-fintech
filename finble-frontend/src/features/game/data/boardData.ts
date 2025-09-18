// 건물 레벨에 따른 이름 정의 (UI 표시용)
export const BuildingType = {
  1: '주택',
  2: '호텔',
  3: '빌딩'
};

// 각 칸(타일)의 데이터 타입을 정의합니다.
export interface TileData { // [수정] export 추가
  name: string // 칸의 이름 (예: "서울", "찬스")
  type: 'city' | 'company' | 'special' | 'chance' | 'JAIL' | 'AIRPLANE' // 칸의 종류
  price?: number // 땅값 (도시, 건설사)
  buildingPrice?: number // 건물 1단계(주택) 건설 비용
  // 통행료: [기본, 주택, 호텔, 빌딩]
  tolls?: number[]
  // 건물 상태를 저장할 객체 추가
  buildings?: {
      level: 0 | 1 | 2 | 3; // 0: 없음, 1: 주택, 2: 호텔, 3: 빌딩
  }
}
