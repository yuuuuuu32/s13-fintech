import { create } from 'zustand'

// 각 플레이어의 정보를 정의합니다. 지금은 간단히 id만 가집니다.
export type Player = {
  id: string
  name: string
}

// GameRoom 타입에 players 배열을 추가합니다.
export type GameRoom = {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  status: 'waiting' | 'playing'
  mode: string
  map: string
}

interface LobbyState {
  rooms: GameRoom[]
  // addRoom 함수가 새로 만든 방의 ID를 반환하도록 수정합니다.
  addRoom: (roomName: string, maxPlayers: number, gameMode: string) => string
}

// 가짜 유저 데이터 (로그인 기능 구현 전 임시 사용)
// 다른 파일에서 이 정보를 가져다 쓸 수 있도록 export 키워드를 추가했습니다.
export const currentUser = { id: 'user-me', name: '나' }

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [
    { id: 'room-1', name: '초보만 오세요', players: [{id: 'user-1', name: '유저1'}, {id: 'user-2', name: '유저2'}], maxPlayers: 4, status: 'waiting', mode: 'Battle Royale', map: 'Cyber Grid' },
    { id: 'room-2', name: '고수들의 전쟁', players: [], maxPlayers: 4, status: 'playing', mode: 'Team Deathmatch', map: 'Neo-Seoul' },
    { id: 'room-3', name: '즐겜하실 분~', players: [{id: 'user-3', name: '유저3'}], maxPlayers: 4, status: 'waiting', mode: 'Capture the Flag', map: 'Data Haven' },
    { id: 'room-4', name: '금융왕이 될테야', players: [{id: 'user-4', name: '유저4'}, {id: 'user-5', name: '유저5'}, {id: 'user-6', name: '유저6'}], maxPlayers: 4, status: 'waiting', mode: 'Battle Royale', map: 'Stock Exchange' },
  ],
  addRoom: (roomName, maxPlayers, gameMode) => {
    const newRoom: GameRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      players: [currentUser], // 방을 만든 사람이 첫 번째 플레이어로 참여
      maxPlayers,
      status: 'waiting',
      mode: gameMode,
      map: 'Random Map', // Assign a default map as it is not selected on creation
    }
    set((state) => ({
      rooms: [...state.rooms, newRoom],
    }))
    return newRoom.id // 새로 만든 방의 ID를 반환
  },
}))