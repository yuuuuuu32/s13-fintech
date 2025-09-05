import { create } from 'zustand'
import { boardData } from '../data/boardData.ts'
import type { TileData } from '../data/boardData.ts'

type GamePhase = 'WAITING_FOR_ROLL' | 'DICE_ROLLING' | 'PLAYER_MOVING' | 'TILE_ACTION' | 'GAME_OVER'
type ModalType = 'NONE' | 'BUY_PROPERTY' | 'ACQUIRE_PROPERTY' | 'CHANCE_CARD' | 'INFO'

export interface Player {
  id: string
  name: string
  money: number
  position: number
  character: string
  properties: number[]
}

const chanceCards = [
    { text: '정부 지원금 10만원을 받습니다.', action: (player: Player) => ({ ...player, money: player.money + 100000 }) },
    { text: '세금 15만원을 내세요.', action: (player: Player) => ({ ...player, money: player.money - 150000 }) },
    { text: '뒤로 3칸 이동하세요.', action: (player: Player) => ({ ...player, position: (player.position - 3 + boardData.length) % boardData.length }) },
];

interface GameState {
  players: Player[]
  currentPlayerIndex: number
  gamePhase: GamePhase
  dice: [number, number]
  dicePower: number // 주사위 게이지 값
  winnerId: string | null
  modal: { type: ModalType; tile?: TileData, text?: string, acquireCost?: number, toll?: number }
  setDicePower: (power: number) => void
  rollDice: () => void
  movePlayer: (diceValues: [number, number]) => void
  handleTileAction: () => void
  buyProperty: () => void
  acquireProperty: () => void
  payToll: () => void
  endTurn: () => void
  checkGameOver: () => void
}

export const useGameStore = create<GameState>()((set, get) => ({
  players: [
    { id: 'player-1', name: '플레이어 1', money: 2000000, position: 0, character: 'cone', properties: [] },
    { id: 'player-2', name: '플레이어 2', money: 2000000, position: 0, character: 'sphere', properties: [] },
  ],
  currentPlayerIndex: 0,
  gamePhase: 'WAITING_FOR_ROLL',
  dice: [1, 1],
  dicePower: 0,
  winnerId: null,
  modal: { type: 'NONE' },

  setDicePower: (power) => set({ dicePower: power }),

  rollDice: () => {
    if (get().gamePhase !== 'WAITING_FOR_ROLL') return
    set({ gamePhase: 'DICE_ROLLING' })
  },

  movePlayer: (diceValues) => {
    const { players, currentPlayerIndex } = get()
    const currentPlayer = players[currentPlayerIndex]
    const diceSum = diceValues[0] + diceValues[1]
    const newPosition = (currentPlayer.position + diceSum) % boardData.length
    
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = { ...currentPlayer, position: newPosition }
    
    set({ players: updatedPlayers, dice: diceValues, gamePhase: 'PLAYER_MOVING' })
  },

  handleTileAction: () => {
    const { players, currentPlayerIndex } = get()
    const currentPlayer = players[currentPlayerIndex]
    
    // 턴 시작 시 플레이어가 파산 상태인지 확인
    if (currentPlayer.money <= 0) {
      get().checkGameOver()
      return;
    }

    const currentTile = boardData[currentPlayer.position]

    if (currentTile.type === 'city' || currentTile.type === 'company') {
      const owner = players.find(p => p.properties.includes(currentPlayer.position))
      if (!owner) {
        set({ modal: { type: 'BUY_PROPERTY', tile: currentTile } })
      } else if (owner.id !== currentPlayer.id) {
        const toll = currentTile.tolls?.[0] || 50000;
        const acquireCost = (currentTile.price || 0) * 2
        set({ modal: { type: 'ACQUIRE_PROPERTY', tile: currentTile, acquireCost, toll } })
      } else {
        get().endTurn()
      }
    } else if (currentTile.type === 'chance') {
        const randomCard = chanceCards[Math.floor(Math.random() * chanceCards.length)];
        const updatedPlayers = [...players]
        const updatedPlayer = randomCard.action(currentPlayer) as Player;
        updatedPlayers[currentPlayerIndex] = updatedPlayer
  
        set({ players: updatedPlayers, modal: { type: 'CHANCE_CARD', text: randomCard.text } })
    } else {
      get().endTurn()
    }
  },
  
  buyProperty: () => {
    const { players, currentPlayerIndex, modal } = get()
    const tileIndex = boardData.findIndex(t => t.name === modal.tile?.name)
    if (tileIndex === -1 || !modal.tile?.price) return

    const currentPlayer = players[currentPlayerIndex]
    if (currentPlayer.money >= modal.tile.price) {
      const updatedPlayers = [...players]
      updatedPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - modal.tile.price,
        properties: [...currentPlayer.properties, tileIndex]
      }
      set({ players: updatedPlayers })
    } else {
      // 돈이 부족하면 구매 실패 및 모달 닫기
      set({ modal: { type: 'INFO', text: '자산이 부족하여 구매할 수 없습니다.' } })
      return;
    }
    get().checkGameOver()
  },

  acquireProperty: () => {
    const { players, currentPlayerIndex, modal } = get()
    const tileIndex = boardData.findIndex(t => t.name === modal.tile?.name)
    if (tileIndex === -1 || !modal.acquireCost) return

    const currentPlayer = players[currentPlayerIndex]
    const owner = players.find(p => p.properties.includes(tileIndex))!

    if (currentPlayer.money >= modal.acquireCost) {
      const updatedPlayers = [...players]
      // 인수자
      updatedPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - modal.acquireCost,
        properties: [...currentPlayer.properties, tileIndex]
      }
      // 피인수자
      const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id);
      updatedPlayers[ownerIndex] = {
        ...owner,
        money: owner.money + modal.acquireCost,
        properties: owner.properties.filter(p => p !== tileIndex)
      }
      set({ players: updatedPlayers })
    } else {
      set({ modal: { type: 'INFO', text: '자산이 부족하여 인수할 수 없습니다.' } })
      return;
    }
    get().checkGameOver()
  },

  payToll: () => {
    const { players, currentPlayerIndex, modal } = get()
    if (!modal.toll) return

    const currentPlayer = players[currentPlayerIndex]
    const owner = players.find(p => p.properties.includes(boardData.findIndex(t => t.name === modal.tile?.name)))!
    
    const updatedPlayers = [...players]
    // 통행료 지불
    updatedPlayers[currentPlayerIndex] = { ...currentPlayer, money: currentPlayer.money - modal.toll }
    // 통행료 받음
    const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id)
    updatedPlayers[ownerIndex] = { ...owner, money: owner.money + modal.toll }
    
    set({ players: updatedPlayers })
    get().checkGameOver()
  },

  endTurn: () => {
    const { players, currentPlayerIndex, gamePhase } = get()
    if (gamePhase === 'GAME_OVER') return;

    const remainingPlayers = players.filter(p => p.money > 0);
    if (remainingPlayers.length <= 1) {
      get().checkGameOver();
      return;
    }

    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    while(players[nextPlayerIndex].money <= 0) {
        nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
    }
    set({ modal: { type: 'NONE' }, currentPlayerIndex: nextPlayerIndex, gamePhase: 'WAITING_FOR_ROLL' })
  },
  
  checkGameOver: () => {
    const { players } = get()
    const alivePlayers = players.filter(p => p.money > 0);
    
    if (alivePlayers.length <= 1) {
      if (alivePlayers.length === 1) {
        set({ gamePhase: 'GAME_OVER', winnerId: alivePlayers[0].id, modal: { type: 'NONE' } })
      } else {
        // 모든 플레이어가 파산한 경우
        set({ gamePhase: 'GAME_OVER', winnerId: null, modal: { type: 'NONE' } })
      }
    } else {
        get().endTurn()
    }
  },
}))