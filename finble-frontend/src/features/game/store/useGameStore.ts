import { create } from 'zustand'
import { boardData } from '../data/boardData.ts'
import type { TileData } from '../data/boardData.ts'

// 게임 단계, 모달 종류, 플레이어 상태에 새로운 타입들을 추가합니다.
type GamePhase = 'WAITING_FOR_ROLL' | 'DICE_ROLLING' | 'PLAYER_MOVING' | 'TILE_ACTION' | 'WORLD_TRAVEL' | 'GAME_OVER'
type ModalType = 'NONE' | 'BUY_PROPERTY' | 'ACQUIRE_PROPERTY' | 'CHANCE_CARD' | 'INFO' | 'JAIL' | 'EXPO' | 'WORLD_TRAVEL_PICKER'

export interface Player {
  id: string
  name: string
  money: number
  position: number
  character: string
  properties: number[]
  isInJail: boolean // 감옥 상태
  jailTurns: number // 감옥에 남은 턴
  isTraveling: boolean // 세계여행 중인지 여부
}

// 찬스 카드 종류를 추가합니다.
const chanceCards = [
  { text: '정부 지원금 10만원을 받습니다.', action: (player: Player) => ({ ...player, money: player.money + 100000 }) },
  { text: '세금 15만원을 내세요.', action: (player: Player) => ({ ...player, money: player.money - 150000 }) },
  { text: '뒤로 3칸 이동하세요.', action: (player: Player) => ({ ...player, position: (player.position - 3 + boardData.length) % boardData.length }) },
  { text: '은행에서 20만원을 빌립니다.', action: (player: Player) => ({ ...player, money: player.money + 200000 })},
  { text: '가장 비싼 도시로 이동합니다. (통행료 면제)', action: (player: Player) => ({ ...player, position: 28 })}, // 송파
];

// 게임 전체 상태 인터페이스
interface GameState {
  players: Player[]
  currentPlayerIndex: number
  gamePhase: GamePhase
  dice: [number, number]
  dicePower: number
  winnerId: string | null
  // 모달 상태를 더 구체적으로 정의합니다.
  modal: { 
    type: ModalType
    tile?: TileData, 
    text?: string, 
    acquireCost?: number, 
    toll?: number
    properties?: { name: string, index: number }[]
  }
  totalTurns: number // 전체 턴 수
  currentTurn: number // 현재 턴 수
  setDicePower: (power: number) => void
  rollDice: () => void
  movePlayer: (diceValues: [number, number]) => void
  handleTileAction: () => void
  buyProperty: () => void
  acquireProperty: () => void
  payToll: () => void
  endTurn: () => void
  checkGameOver: () => void
  handleJail: () => void // 감옥 관련 액션
  payBail: () => void // 보석금 지불
  selectExpoProperty: (propertyIndex: number) => void // 박람회에서 땅 선택
  selectTravelDestination: (tileIndex: number) => void // 세계여행 목적지 선택
}

const BAIL_AMOUNT = 500000; // 보석금

export const useGameStore = create<GameState>()((set, get) => ({
  // 초기 플레이어 상태 설정
  players: [
    { id: 'player-1', name: '플레이어 1', money: 2000000, position: 0, character: 'cone', properties: [], isInJail: false, jailTurns: 0, isTraveling: false },
    { id: 'player-2', name: '플레이어 2', money: 2000000, position: 0, character: 'sphere', properties: [], isInJail: false, jailTurns: 0, isTraveling: false },
  ],
  currentPlayerIndex: 0,
  gamePhase: 'WAITING_FOR_ROLL',
  dice: [1, 1],
  dicePower: 0,
  winnerId: null,
  modal: { type: 'NONE' },
  totalTurns: 20, // 전체 턴 수
  currentTurn: 1, // 현재 턴 수

  setDicePower: (power) => set({ dicePower: power }),

  rollDice: () => {
    const { gamePhase, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    if (gamePhase !== 'WAITING_FOR_ROLL') return;

    // 감옥에 있을 경우 감옥 모달을 띄웁니다.
    if (currentPlayer.isInJail) {
      get().handleJail();
      return;
    }

    // 세계여행 중일 경우 목적지 선택 모달을 띄웁니다.
    if (currentPlayer.isTraveling) {
      set({ gamePhase: 'WORLD_TRAVEL', modal: { type: 'WORLD_TRAVEL_PICKER' } });
      return;
    }

    set({ gamePhase: 'DICE_ROLLING' });
  },

  movePlayer: (diceValues) => {
    const { players, currentPlayerIndex } = get()
    const currentPlayer = players[currentPlayerIndex]
    const diceSum = diceValues[0] + diceValues[1]
    
    // 시작점을 지났는지 확인하고 월급을 지급합니다.
    const newPosition = (currentPlayer.position + diceSum)
    let updatedMoney = currentPlayer.money
    if (newPosition >= boardData.length) {
      updatedMoney += 200000; // 월급
    }
    
    const finalPosition = newPosition % boardData.length;
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = { ...currentPlayer, position: finalPosition, money: updatedMoney }
    
    set({ players: updatedPlayers, dice: diceValues, gamePhase: 'PLAYER_MOVING' })
  },
  
  // 타일 도착 후 액션 처리
  handleTileAction: () => {
    const { players, currentPlayerIndex } = get()
    const currentPlayer = players[currentPlayerIndex]
    
    if (currentPlayer.money <= 0) {
      get().checkGameOver()
      return;
    }

    const currentTile = boardData[currentPlayer.position]

    switch (currentTile.type) {
      case 'city':
      case 'company':
        const owner = players.find(p => p.properties.includes(currentPlayer.position))
        if (!owner) {
          if(currentPlayer.money >= (currentTile.price ?? 0)) {
            set({ modal: { type: 'BUY_PROPERTY', tile: currentTile } })
          } else {
            get().endTurn() // 돈이 없으면 그냥 턴 종료
          }
        } else if (owner.id !== currentPlayer.id) {
          const toll = currentTile.tolls?.[0] || 50000;
          const acquireCost = (currentTile.price || 0) * 2
          set({ modal: { type: 'ACQUIRE_PROPERTY', tile: currentTile, acquireCost, toll } })
        } else {
          get().endTurn()
        }
        break;

      case 'chance':
        const randomCard = chanceCards[Math.floor(Math.random() * chanceCards.length)];
        set(state => {
          const updatedPlayers = [...state.players];
          const updatedPlayer = randomCard.action(updatedPlayers[state.currentPlayerIndex]);
          updatedPlayers[state.currentPlayerIndex] = updatedPlayer;
          return { players: updatedPlayers, modal: { type: 'CHANCE_CARD', text: randomCard.text } };
        });
        break;

      case 'special':
        switch(currentTile.name) {
          case '무인도':
            set(state => {
              const updatedPlayers = [...state.players];
              updatedPlayers[state.currentPlayerIndex] = {
                ...updatedPlayers[state.currentPlayerIndex],
                isInJail: true,
                jailTurns: 3
              };
              return { players: updatedPlayers, modal: { type: 'JAIL' } };
            });
            break;
          case '박람회':
            const ownedProperties = currentPlayer.properties.map(index => ({ name: boardData[index].name, index }));
            if (ownedProperties.length > 0) {
              set({ modal: { type: 'EXPO', properties: ownedProperties } });
            } else {
              set({ modal: { type: 'INFO', text: '소유한 땅이 없어 박람회 효과를 받을 수 없습니다.' } });
            }
            break;
          case '세계여행':
            set(state => {
              const updatedPlayers = [...state.players];
              updatedPlayers[state.currentPlayerIndex] = { ...updatedPlayers[state.currentPlayerIndex], isTraveling: true };
              return { players: updatedPlayers, modal: { type: 'INFO', text: '세계여행! 다음 턴에 원하는 곳으로 이동할 수 있습니다.' } };
            });
            break;
          default:
            get().endTurn();
            break;
        }
        break;

      default:
        get().endTurn();
        break;
    }
  },
  
  buyProperty: () => {
    set(state => {
      const { players, currentPlayerIndex, modal } = state;
      const tileIndex = boardData.findIndex(t => t.name === modal.tile?.name);
      if (tileIndex === -1 || !modal.tile?.price) return {};

      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer.money >= modal.tile.price) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - modal.tile.price,
          properties: [...currentPlayer.properties, tileIndex]
        };
        return { players: updatedPlayers };
      }
      return { modal: { type: 'INFO', text: '자산이 부족하여 구매할 수 없습니다.' } };
    });
    get().endTurn();
  },

  acquireProperty: () => {
    set(state => {
      const { players, currentPlayerIndex, modal } = state;
      const tileIndex = boardData.findIndex(t => t.name === modal.tile?.name);
      if (tileIndex === -1 || !modal.acquireCost) return {};

      const currentPlayer = players[currentPlayerIndex];
      const owner = players.find(p => p.properties.includes(tileIndex))!;

      if (currentPlayer.money >= modal.acquireCost) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - modal.acquireCost,
          properties: [...currentPlayer.properties, tileIndex]
        };
        const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id);
        updatedPlayers[ownerIndex] = {
          ...owner,
          money: owner.money + modal.acquireCost,
          properties: owner.properties.filter(p => p !== tileIndex)
        };
        return { players: updatedPlayers };
      }
      return { modal: { type: 'INFO', text: '자산이 부족하여 인수할 수 없습니다.' } };
    });
    get().endTurn();
  },

  payToll: () => {
    set(state => {
      const { players, currentPlayerIndex, modal } = state;
      if (!modal.toll) return {};

      const currentPlayer = players[currentPlayerIndex];
      const owner = players.find(p => p.properties.includes(boardData.findIndex(t => t.name === modal.tile?.name)))!;
      
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = { ...currentPlayer, money: currentPlayer.money - modal.toll };
      const ownerIndex = updatedPlayers.findIndex(p => p.id === owner.id);
      updatedPlayers[ownerIndex] = { ...owner, money: owner.money + modal.toll };
      
      return { players: updatedPlayers };
    });
    get().checkGameOver();
  },

  endTurn: () => {
    const { players, currentPlayerIndex, gamePhase, currentTurn, totalTurns } = get();
    if (gamePhase === 'GAME_OVER') return;

    // 턴 종료 시 턴 수를 증가시킵니다. (모든 플레이어가 한 번씩 플레이했을 때)
    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    let nextTurn = currentTurn;
    if (nextPlayerIndex === 0) {
      nextTurn = currentTurn + 1;
    }

    if (nextTurn > totalTurns) {
      get().checkGameOver();
      return;
    }

    // 파산한 플레이어는 건너뜁니다.
    while (players[nextPlayerIndex].money <= 0) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
       if (nextPlayerIndex === 0 && currentTurn !== nextTurn) {
         nextTurn = currentTurn + 1;
       }
       if (nextTurn > totalTurns) {
        get().checkGameOver();
        return;
      }
    }
    set({ modal: { type: 'NONE' }, currentPlayerIndex: nextPlayerIndex, gamePhase: 'WAITING_FOR_ROLL', currentTurn: nextTurn });
  },
  
  checkGameOver: () => {
    const { players, currentTurn, totalTurns } = get();
    const alivePlayers = players.filter(p => p.money > 0);
    
    let winner = null;
    if (alivePlayers.length <= 1) {
      winner = alivePlayers[0] ?? null;
    } else if (currentTurn > totalTurns) {
      // 턴 종료로 게임이 끝났을 경우, 자산이 가장 많은 플레이어가 승리
      winner = players.reduce((prev, current) => (prev.money > current.money) ? prev : current);
    }

    if (winner || alivePlayers.length === 0 || currentTurn > totalTurns) {
      set({ gamePhase: 'GAME_OVER', winnerId: winner?.id ?? null, modal: { type: 'NONE' } });
    } else {
      get().endTurn();
    }
  },

  // 감옥 관련 로직
  handleJail: () => {
    set(state => {
      const { players, currentPlayerIndex } = state;
      const currentPlayer = players[currentPlayerIndex];

      if (currentPlayer.jailTurns > 1) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = { ...currentPlayer, jailTurns: currentPlayer.jailTurns - 1 };
        return { players: updatedPlayers, modal: { type: 'INFO', text: `무인도 탈출까지 ${currentPlayer.jailTurns - 1}턴 남았습니다.` } };
      } else {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = { ...currentPlayer, isInJail: false, jailTurns: 0 };
        return { players: updatedPlayers, modal: { type: 'INFO', text: '무인도에서 탈출했습니다! 다음 턴부터 정상 진행됩니다.' } };
      }
    });
    get().endTurn(); // 턴을 넘깁니다.
  },

  // 보석금 지불 로직
  payBail: () => {
    set(state => {
      const { players, currentPlayerIndex } = state;
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer.money >= BAIL_AMOUNT) {
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - BAIL_AMOUNT,
          isInJail: false,
          jailTurns: 0
        };
        return { players: updatedPlayers, modal: { type: 'NONE' } };
      } else {
        return { modal: { type: 'INFO', text: '보석금이 부족합니다.' } };
      }
    });
    // 보석금을 냈다면 바로 턴을 진행하지 않고, 다음 턴부터 시작하도록 endTurn()을 호출하지 않습니다.
    // 대신, 게임 단계를 WAITING_FOR_ROLL로 변경하여 주사위를 굴릴 수 있게 합니다.
    set({ gamePhase: 'WAITING_FOR_ROLL' });
  },

  // 박람회 땅 선택 로직
  selectExpoProperty: (propertyIndex: number) => {
    // 이 기능은 백엔드와 연동이 필요하여, 여기서는 모달을 닫고 턴을 종료하는 것으로 구현합니다.
    // 실제 구현 시에는 해당 땅의 통행료를 2배로 만드는 로직이 필요합니다.
    console.log(`Property at index ${propertyIndex} selected for double toll.`);
    set({ modal: { type: 'INFO', text: `${boardData[propertyIndex].name}의 통행료가 2배가 되었습니다!` } });
    // get().endTurn(); // 정보 모달을 띄우고 확인 버튼을 누르면 턴이 종료되도록 GameUI에서 처리
  },

  // 세계여행 목적지 선택 로직
  selectTravelDestination: (tileIndex: number) => {
    set(state => {
      const { players, currentPlayerIndex } = state;
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...updatedPlayers[currentPlayerIndex],
        position: tileIndex,
        isTraveling: false,
      };
      return { players: updatedPlayers, gamePhase: 'PLAYER_MOVING', modal: { type: 'NONE' } };
    });
    // 이동 후 타일 액션을 즉시 실행합니다.
    // get().handleTileAction(); // Player 컴포넌트의 onRest에서 처리
  }
}));
