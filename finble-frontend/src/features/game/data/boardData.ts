// 건물 레벨에 따른 이름 정의 (UI 표시용)
export const BuildingType = {
  1: '주택',
  2: '빌딩',
  3: '호텔'
};

// 각 칸(타일)의 데이터 타입을 정의합니다.
export interface TileData { // [수정] export 추가
  name: string // 칸의 이름 (예: "서울", "찬스")
  type: 'NORMAL' | 'SPECIAL' | 'CHANCE' | 'JAIL' | 'START' | 'AIRPLANE' | 'NTS' // 칸의 종류 (백엔드 enum과 일치)
  price?: number // 땅값 (도시, 건설사)
  buildingPrice?: number // 건물 1단계(주택) 건설 비용
  toll?: number // 서버에서 오는 현재 통행료
  // 건물 상태를 저장할 객체 추가
  buildings?: {
      level: 0 | 1 | 2 | 3; // 0: 없음, 1: 주택, 2: 빌딩, 3: 호텔
  }
  // 서버에서 올 수 있는 추가 필드들
  landPrice?: number
  housePrice?: number
  hotelPrice?: number
}
