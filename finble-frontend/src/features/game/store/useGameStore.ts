import { create } from 'zustand'
import { boardData as initialBoardData, BuildingType } from '../data/boardData.ts'
import type { TileData } from '../data/boardData.ts'
import { currentUser } from '../../lobby/store/useLobbyStore'

type GamePhase = 'WAITING_FOR_ROLL' | 'DICE_ROLLING' | 'PLAYER_MOVING' | 'TILE_ACTION' | 'WORLD_TRAVEL' | 'GAME_OVER' | 'MANAGE_PROPERTY' | 'WORLD_TRAVEL_MOVE'
type ModalType = 'NONE' | 'BUY_PROPERTY' | 'ACQUIRE_PROPERTY' | 'CHANCE_CARD' | 'INFO' | 'JAIL' | 'EXPO' | 'MANAGE_PROPERTY' | 'INSUFFICIENT_FUNDS'

export interface Player {
  id: string
  name: string
  money: number
  position: number
  character: string
  properties: number[]
  isInJail: boolean
  jailTurns: number
  isTraveling: boolean
  lapCount: number
}

const chanceCards = [
  { text: '정부 지원금 10만원을 받습니다.', action: (player: Player) => ({ ...player, money: player.money + 100000 }) },
  { text: '세금 15만원을 내세요.', action: (player: Player) => ({ ...player, money: player.money - 150000 }) },
  { text: '뒤로 3칸 이동하세요.', action: (player: Player) => ({ ...player, position: (player.position - 3 + initialBoardData.length) % initialBoardData.length }) },
  { text: '은행에서 20만원을 빌립니다.', action: (player: Player) => ({ ...player, money: player.money + 200000 })},
  { text: '가장 비싼 도시로 이동합니다. (통행료 면제)', action: (player: Player) => ({ ...player, position: 28 })}, // 송파
];

interface GameState {
  players: Player[]
  board: TileData[] // 보드 데이터를 상태로 관리
  currentPlayerIndex: number
  gamePhase: GamePhase
  dice: [number, number]
  dicePower: number
  winnerId: string | null
  modal: {
    type: ModalType
    tile?: TileData,
    text?: string,
    acquireCost?: number,
    toll?: number
    properties?: { name: string, index: number }[]
    requiredAmount?: number
    onConfirm?: () => void
  }
  totalTurns: number
  currentTurn: number
  expoLocation: number | null
  setDicePower: (power: number) => void
  rollDice: () => void
  movePlayer: (diceValues: [number, number]) => void
  handleTileAction: () => void
  buyProperty: () => void
  acquireProperty: () => void
  payToll: () => void
  endTurn: () => void
  checkGameOver: () => void
  handleJail: () => void
  payBail: () => void
  selectExpoProperty: (propertyIndex: number) => void
  startWorldTravelSelection: () => void
  selectTravelDestination: (tileIndex: number) => void
  buildBuilding: (tileIndex: number) => void
}

const BAIL_AMOUNT = 500000;

export const useGameStore = create<GameState>()((set, get) => ({
  players: [
    { id: currentUser.id, name: `${currentUser.name}`, money: 2200000, position: 0, character: 'cone', properties: [], isInJail: false, jailTurns: 0, isTraveling: false, lapCount: 0 },
    { id: 'player-2', name: '플레이어 2', money: 2000000, position: 0, character: 'sphere', properties: [], isInJail: false, jailTurns: 0, isTraveling: false, lapCount: 0 },
  ],
  board: JSON.parse(JSON.stringify(initialBoardData)), // 초기 보드 데이터 깊은 복사
  currentPlayerIndex: 0,
  gamePhase: 'WAITING_FOR_ROLL',
  dice: [1, 1],
  dicePower: 0,
  winnerId: null,
  modal: { type: 'NONE' },
  totalTurns: 20,
  currentTurn: 1,
  expoLocation: null,

  setDicePower: (power) => set({ dicePower: power }),

  rollDice: () => {
    const { gamePhase, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];

    if (gamePhase !== 'WAITING_FOR_ROLL') return;

    if (currentPlayer.isInJail) {
      set({ modal: { type: 'JAIL' } });
      return;
    }

    if (currentPlayer.isTraveling) {
      set({ modal: { type: 'INFO', text: '세계여행! 이동할 칸을 보드에서 직접 클릭하세요.', onConfirm: get().startWorldTravelSelection } });
      return;
    }

    set({ gamePhase: 'DICE_ROLLING' });
  },

  movePlayer: (diceValues) => {
    const { players, currentPlayerIndex, board } = get()
    const currentPlayer = players[currentPlayerIndex]
    const diceSum = diceValues[0] + diceValues[1]

    const newPosition = (currentPlayer.position + diceSum)
    let updatedMoney = currentPlayer.money
    let lapCount = currentPlayer.lapCount

    if (newPosition >= board.length) {
      updatedMoney += 200000;
      lapCount += 1;
    }

    const finalPosition = newPosition % board.length;
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayerIndex] = { ...currentPlayer, position: finalPosition, money: updatedMoney, lapCount }

    set({ players: updatedPlayers, dice: diceValues, gamePhase: 'PLAYER_MOVING' })
  },
  
  handleTileAction: () => {
    set({ gamePhase: 'TILE_ACTION' });
    const { players, currentPlayerIndex, board } = get()
    const currentPlayer = players[currentPlayerIndex]
    
    if (currentPlayer.money < 0) {
      get().checkGameOver()
      return;
    }

    const currentTile = board[currentPlayer.position]

    switch (currentTile.type) {
      case 'city':
      case 'company':
        const owner = players.find(p => p.properties.includes(currentPlayer.position))
        if (!owner) {
          if(currentPlayer.money >= (currentTile.price ?? 0)) {
            set({ modal: { type: 'BUY_PROPERTY', tile: currentTile } })
          } else {
            get().endTurn()
          }
        } else if (owner.id !== currentPlayer.id) {
          let toll = currentTile.tolls?.[currentTile.buildings?.level || 0] || 50000;
          
          if (get().expoLocation === currentPlayer.position) {
            toll *= 2;
          }

          const acquireCost = (currentTile.price || 0) * 2
          set({ modal: { type: 'ACQUIRE_PROPERTY', tile: currentTile, acquireCost, toll } })
        } else {
          if (currentTile.type === 'city' && currentPlayer.lapCount > 0 && (currentTile.buildings?.level ?? 0) < 3) {
            set({ gamePhase: 'MANAGE_PROPERTY', modal: { type: 'MANAGE_PROPERTY', tile: currentTile }})
          } else {
            get().endTurn()
          }
        }
        break;

      case 'chance':
        const randomCard = chanceCards[Math.floor(Math.random() * chanceCards.length)];
        set(state => {
            const currentPlayer = state.players[state.currentPlayerIndex];
            const originalPosition = currentPlayer.position;
            const playerAfterAction = randomCard.action(currentPlayer);
            const moved = playerAfterAction.position !== originalPosition;
            const updatedPlayers = state.players.map(p => 
                p.id === playerAfterAction.id ? playerAfterAction : p
            );
            
            return { 
                players: updatedPlayers, 
                modal: { 
                    type: 'CHANCE_CARD', 
                    text: randomCard.text,
                    onConfirm: () => {
                      set({ modal: { type: 'NONE' } });
                      if (moved) {
                        get().handleTileAction(); // 이동이 발생했으면 다시 타일 액션
                      } else {
                        get().endTurn(); // 이동이 없었으면 턴 종료
                      }
                    }
                } 
            };
        });
        break;

      case 'special':
        switch(currentTile.name) {
          case '무인도':
            set(state => {
              const updatedPlayers = [...state.players];
              updatedPlayers[state.currentPlayerIndex] = { ...updatedPlayers[state.currentPlayerIndex], isInJail: true, jailTurns: 3 };
              return { 
                players: updatedPlayers, 
                modal: { type: 'INFO', text: '무인도에 갇혔습니다! 다음 턴부터 3턴 동안 머물게 됩니다.', onConfirm: get().endTurn } 
              };
            });
            break;
          case '박람회':
            const ownedProperties = currentPlayer.properties.map(index => ({ name: board[index].name, index }));
            if (ownedProperties.length > 0) {
              set({ modal: { type: 'EXPO', properties: ownedProperties } });
            } else {
              set({ modal: { type: 'INFO', text: '소유한 땅이 없어 박람회 효과를 받을 수 없습니다.', onConfirm: get().endTurn } });
            }
            break;
          case '세계여행':
            set(state => {
              const updatedPlayers = [...state.players];
              updatedPlayers[state.currentPlayerIndex] = { ...updatedPlayers[state.currentPlayerIndex], isTraveling: true };
              return { 
                players: updatedPlayers, 
                modal: { type: 'INFO', text: '세계여행! 다음 턴에 원하는 곳으로 이동할 수 있습니다.', onConfirm: get().endTurn }
              };
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
      const { players, currentPlayerIndex, modal, board } = state;
      const tileIndex = board.findIndex(t => t.name === modal.tile?.name);
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
      const { players, currentPlayerIndex, modal, board } = state;
      const tileIndex = board.findIndex(t => t.name === modal.tile?.name);
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
      const { players, currentPlayerIndex, modal, board } = state;
      if (!modal.toll) {
          return { modal: { type: 'NONE' } };
      };
  
      const currentPlayer = players[currentPlayerIndex];
      const tileIndex = board.findIndex(t => t.name === modal.tile?.name);
      const toll = modal.toll;
  
      if (currentPlayer.money < toll) {
          const requiredAmount = toll - currentPlayer.money;
          
          const propertiesToSell = currentPlayer.properties
              .map(index => ({ index, price: board[index].price || 0 }))
              .sort((a, b) => b.price - a.price);
  
          let moneyRaised = 0;
          const soldProperties: number[] = [];
  
          for (const prop of propertiesToSell) {
              if (moneyRaised >= requiredAmount) break;
              
              const salePrice = prop.price * 0.8;
              moneyRaised += salePrice;
              soldProperties.push(prop.index);
          }
  
          if (currentPlayer.money + moneyRaised >= toll) {
              const updatedPlayer = {
                  ...currentPlayer,
                  money: currentPlayer.money + moneyRaised - toll,
                  properties: currentPlayer.properties.filter(p => !soldProperties.includes(p)),
              };
              
              const updatedPlayers = [...players];
              updatedPlayers[currentPlayerIndex] = updatedPlayer;
  
              const finalOwner = updatedPlayers.find(p => p.properties.includes(tileIndex))!;
              const ownerIndex = updatedPlayers.findIndex(p => p.id === finalOwner.id);
              updatedPlayers[ownerIndex] = { ...finalOwner, money: finalOwner.money + toll };
  
              return { 
                  players: updatedPlayers, 
                  modal: { 
                      type: 'INFO', 
                      text: `현금이 부족하여 부동산 ${soldProperties.length}개를 자동 매각하고 통행료를 지불했습니다.`,
                  } 
              };
          }
      }
      
      const currentPlayers = [...players];
      const player = currentPlayers[currentPlayerIndex];
      const currentOwner = currentPlayers.find(p => p.properties.includes(tileIndex))!;
      const ownerIdx = currentPlayers.findIndex(p => p.id === currentOwner.id);
      
      currentPlayers[currentPlayerIndex] = { ...player, money: player.money - toll };
      currentPlayers[ownerIdx] = { ...currentOwner, money: currentOwner.money + toll };

      const updatedPlayer = currentPlayers[currentPlayerIndex];
      const text = updatedPlayer.money < 0
          ? `${updatedPlayer.name}님이 파산했습니다.`
          : `통행료 ${toll.toLocaleString()}원을 지불했습니다.`;

      return {
          players: currentPlayers,
          modal: {
              type: 'INFO',
              text: text,
          }
      };
    });
  },

  endTurn: () => {
    const { players, currentPlayerIndex, gamePhase, currentTurn, totalTurns } = get();
    if (gamePhase === 'GAME_OVER') return;

    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    let nextTurn = currentTurn;
    if (nextPlayerIndex === 0) {
      nextTurn = currentTurn + 1;
    }

    if (nextTurn > totalTurns) {
      get().checkGameOver();
      return;
    }

    while (players[nextPlayerIndex].money < 0) {
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
    const { players, currentTurn, totalTurns, board } = get();
    const alivePlayers = players.filter(p => p.money >= 0);
    
    let winner = null;
    if (alivePlayers.length <= 1) {
      winner = alivePlayers[0] ?? null;
    } else if (currentTurn > totalTurns) {
      winner = players
        .filter(p => p.money >= 0)
        .reduce((prev, current) => {
            const prevAssets = prev.money + prev.properties.reduce((sum, i) => sum + (board[i].price || 0), 0);
            const currentAssets = current.money + current.properties.reduce((sum, i) => sum + (board[i].price || 0), 0);
            return prevAssets > currentAssets ? prev : current;
        });
    }

    if (winner || alivePlayers.length === 0 || currentTurn > totalTurns) {
      set({ gamePhase: 'GAME_OVER', winnerId: winner?.id ?? null, modal: { type: 'NONE' } });
    } else {
      get().endTurn();
    }
  },

  handleJail: () => {
    set(state => {
      const updatedPlayers = [...state.players];
      const currentPlayer = updatedPlayers[state.currentPlayerIndex];
      const newJailTurns = currentPlayer.jailTurns - 1;

      if (newJailTurns <= 0) {
        updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, isInJail: false, jailTurns: 0 };
        return { 
          players: updatedPlayers, 
          modal: { type: 'INFO', text: '무인도에서 탈출했습니다! 다음 턴부터 정상 진행됩니다.', onConfirm: get().endTurn }
        };
      } else {
        updatedPlayers[state.currentPlayerIndex] = { ...currentPlayer, jailTurns: newJailTurns };
        return { 
          players: updatedPlayers, 
          modal: { type: 'INFO', text: `무인도 탈출까지 ${newJailTurns}턴 남았습니다.`, onConfirm: get().endTurn }
        };
      }
    });
  },

  payBail: () => {
    set(state => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.money >= BAIL_AMOUNT) {
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          money: currentPlayer.money - BAIL_AMOUNT,
          isInJail: false,
          jailTurns: 0
        };
        return { players: updatedPlayers, modal: { type: 'NONE' }, gamePhase: 'WAITING_FOR_ROLL' };
      } else {
        return { modal: { type: 'INFO', text: '보석금이 부족합니다.' } };
      }
    });
  },

  selectExpoProperty: (propertyIndex: number) => {
    set({ 
      expoLocation: propertyIndex,
      modal: { type: 'INFO', text: `${get().board[propertyIndex].name}에서 박람회가 개최되어 통행료가 2배가 됩니다!`, onConfirm: get().endTurn }
    });
  },

  startWorldTravelSelection: () => {
    set({ gamePhase: 'WORLD_TRAVEL_MOVE', modal: { type: 'NONE' } });
  },

  selectTravelDestination: (tileIndex: number) => {
    set(state => {
      const { players, currentPlayerIndex } = state;
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...updatedPlayers[currentPlayerIndex],
        position: tileIndex,
        isTraveling: false,
      };
      return { players: updatedPlayers, gamePhase: 'PLAYER_MOVING', dice: [0, 0], modal: { type: 'NONE' } };
    });
  },
  
  buildBuilding: (tileIndex: number) => {
    set(state => {
      const { players, currentPlayerIndex, board } = state;
      const currentPlayer = players[currentPlayerIndex];
      const tile = board[tileIndex];
      
      if (!tile.buildingPrice || !tile.buildings || tile.buildings.level >= 3) {
        return { modal: { type: 'INFO', text: '더 이상 건물을 지을 수 없습니다.', onConfirm: get().endTurn } };
      }

      if (currentPlayer.money < tile.buildingPrice) {
        return { modal: { type: 'INFO', text: '건설 비용이 부족합니다.', onConfirm: get().endTurn } };
      }
      
      if (currentPlayer.lapCount <= tile.buildings.level) {
        return { modal: { type: 'INFO', text: `건설에 필요한 바퀴 수(${tile.buildings.level + 1}바퀴)가 부족합니다.`, onConfirm: get().endTurn } };
      }

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        money: currentPlayer.money - tile.buildingPrice,
      };
      
      const newBoard = board.map((t, index) => {
        if (index === tileIndex && t.buildings) {
          return {
            ...t,
            buildings: { level: (t.buildings.level + 1) as 1 | 2 | 3 }
          };
        }
        return t;
      });

      return {
        players: updatedPlayers,
        board: newBoard,
        modal: { 
          type: 'INFO', 
          text: `${tile.name}에 ${BuildingType[newBoard[tileIndex].buildings!.level]}을(를) 건설했습니다!`,
          onConfirm: get().endTurn 
        }
      };
    });
  },
}));