import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.ts'
import { useNavigate } from 'react-router-dom';
import { BuildingType } from '../data/boardData.ts';
import type { TileData } from '../data/boardData.ts';
import { useUserStore } from '../../../stores/useUserStore';
import { Modal, Box, Typography, Button, Card, CardContent, LinearProgress, List, ListItem, ListItemButton, ListItemText, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import styles from './GameUI.module.css';

const BAIL_AMOUNT = 500000; 

const calculateTotalAssets = (player, board: TileData[]) => {
  const propertyValue = player.properties.reduce((sum, index) => {
    const tile = board[index];
    if (!tile) return sum;

    // 서버 데이터 구조에 맞게 landPrice 사용
    let value = tile.landPrice || tile.price || 0;

    // 건물 가치 추가
    if (tile.buildings && tile.buildings.level > 0) {
      const housePrice = tile.housePrice || 0;
      const buildingPrice = tile.buildingPrice || 0;
      const hotelPrice = tile.hotelPrice || 0;

      switch (tile.buildings.level) {
        case 1: // 주택
          value += housePrice;
          break;
        case 2: // 빌딩
          value += housePrice + buildingPrice;
          break;
        case 3: // 호텔
          value += housePrice + buildingPrice + hotelPrice;
          break;
      }
    }

    return sum + value;
  }, 0);
  return player.money + propertyValue;
};

// BuyPropertyModalContent
const BuyPropertyModalContent = ({ modal, buyPropertyWithItems, endTurn, currentPlayer, applyEconomicMultiplier }) => {
  const [selectedItems, setSelectedItems] = useState({
    land: false, // 땅도 선택사항
    house: false,
    building: false,
    hotel: false
  });

  const tile = modal.tile;
  // 서버 데이터 구조에 맞게 가격 추출
  const baseLandPrice = tile?.landPrice || tile?.price || 0;
  const baseHousePrice = tile?.housePrice || 0;
  const baseBuildingPrice = tile?.buildingPrice || 0;
  const baseHotelPrice = tile?.hotelPrice || 0;

  // Adjusted prices using the multiplier function
  const landPrice = applyEconomicMultiplier(baseLandPrice, 'propertyPriceMultiplier');
  const housePrice = applyEconomicMultiplier(baseHousePrice, 'buildingCostMultiplier');
  const buildingPrice = applyEconomicMultiplier(baseBuildingPrice, 'buildingCostMultiplier');
  const hotelPrice = applyEconomicMultiplier(baseHotelPrice, 'buildingCostMultiplier');


  const handleItemChange = (item: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (item === 'land' && !event.target.checked) {
      // 땅을 체크 해제하면 모든 건물도 해제
      setSelectedItems({
        land: false,
        house: false,
        building: false,
        hotel: false
      });
    } else {
      setSelectedItems(prev => ({ ...prev, [item]: event.target.checked }));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    if (selectedItems.land) total += landPrice;
    if (selectedItems.house) total += housePrice;
    if (selectedItems.building) total += buildingPrice;
    if (selectedItems.hotel) total += hotelPrice;
    return total;
  };

  const totalCost = calculateTotal();
  const canAfford = currentPlayer?.money >= totalCost;
  const hasSelectedItems = Object.values(selectedItems).some(item => item);

  const handlePurchase = () => {
    // GameStore의 buyProperty를 사용하지 않고 직접 구매 로직 구현
    // 선택된 항목들과 총 비용으로 구매 처리
    const purchaseData = {
      selectedItems,
      totalCost,
      tile
    };

    // 커스텀 구매 함수 호출
    buyPropertyWithItems(purchaseData);
    endTurn();
  };

  return (
    <>
      <Typography variant="h5" component="h2" fontWeight="bold">{tile?.name}</Typography>
      <Typography sx={{ mt: 2, mb: 3 }}>구매할 항목을 선택하세요:</Typography>

      <FormGroup sx={{ alignItems: 'flex-start' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.land}
              onChange={handleItemChange('land')}
            />
          }
          label={
            <Box>
              <Typography>땅 증서</Typography>
              <Typography variant="body2" color="text.secondary">
                {landPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.house}
              onChange={handleItemChange('house')}
              disabled={!selectedItems.land}
            />
          }
          label={
            <Box>
              <Typography color={!selectedItems.land ? 'text.disabled' : 'text.primary'}>
                주택 {!selectedItems.land && '(땅 구매 필요)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {housePrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.building}
              onChange={handleItemChange('building')}
              disabled={!selectedItems.land}
            />
          }
          label={
            <Box>
              <Typography color={!selectedItems.land ? 'text.disabled' : 'text.primary'}>
                빌딩 {!selectedItems.land && '(땅 구매 필요)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {buildingPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.hotel}
              onChange={handleItemChange('hotel')}
              disabled={!selectedItems.land}
            />
          }
          label={
            <Box>
              <Typography color={!selectedItems.land ? 'text.disabled' : 'text.primary'}>
                호텔 {!selectedItems.land && '(땅 구매 필요)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hotelPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />
      </FormGroup>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6">
          {hasSelectedItems ? `총 비용: ${totalCost.toLocaleString()}원` : '선택된 항목이 없습니다'}
        </Typography>
        <Typography variant="body2" color={hasSelectedItems ? (canAfford ? 'success.main' : 'error.main') : 'text.secondary'}>
          보유 현금: {currentPlayer?.money.toLocaleString()}원
          {hasSelectedItems && !canAfford && ' (현금 부족)'}
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        {hasSelectedItems && (
          <Button
            variant="contained"
            onClick={handlePurchase}
            disabled={!canAfford}
          >
            구매 ({totalCost.toLocaleString()}원)
          </Button>
        )}
        <Button variant="outlined" onClick={endTurn}>
          {hasSelectedItems ? '패스' : '구매하지 않음'}
        </Button>
      </Box>
    </>
  );
};

// AcquirePropertyModalContent
const AcquirePropertyModalContent = ({ modal, acquireProperty, payToll, currentPlayer, endTurn }) => (
  <>
    <Typography variant="h5" component="h2" fontWeight="bold">{modal.tile?.name} 인수</Typography>
    <Typography sx={{ mt: 2 }}>통행료: {modal.toll?.toLocaleString()}원</Typography>
    <Typography sx={{ mt: 1 }}>인수 비용: {modal.acquireCost?.toLocaleString()}원</Typography>
    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
      <Button variant="contained" onClick={() => { acquireProperty(); endTurn(); }} disabled={(currentPlayer?.money || 0) < (modal.acquireCost || 0)}>인수</Button>
      <Button variant="outlined" onClick={() => { payToll(); endTurn(); }}>통행료만 지불</Button>
    </Box>
  </>
);

// ChanceCardModalContent
const ChanceCardModalContent = ({ modal }) => (
  <>
    <Typography variant="h5" component="h2" fontWeight="bold">찬스!</Typography>
    <Typography sx={{ mt: 2 }}>{modal.text}</Typography>
    <Button sx={{ mt: 3 }} variant="contained" onClick={modal.onConfirm}>확인</Button>
  </>
);

// InfoModalContent
const InfoModalContent = ({ modal, endTurn }) => (
  <>
    <Typography variant="h6" component="h2">알림</Typography>
    <Typography sx={{ mt: 2 }}>{modal.text}</Typography>
    <Button sx={{ mt: 3 }} variant="contained" onClick={modal.onConfirm || endTurn}>확인</Button>
  </>
);

// JailModalContent
const JailModalContent = ({ payBail, handleJail, BAIL_AMOUNT }) => (
  <>
    <Typography variant="h5" component="h2">감옥</Typography>
    <Typography sx={{ mt: 2 }}>3턴 동안 갖혀있게 됩니다.</Typography>
    <Typography sx={{ mt: 1 }}>보석금을 내고 즉시 탈출할 수 있습니다.</Typography>
    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
      <Button variant="contained" onClick={payBail}>보석금 ({ BAIL_AMOUNT.toLocaleString() }원)</Button>
      <Button variant="outlined" onClick={handleJail}>머물기</Button>
    </Box>
  </>
);

// ExpoModalContent
const ExpoModalContent = ({ modal, selectExpoProperty }) => (
  <>
    <Typography variant="h5" component="h2">박람회 개최!</Typography>
    <Typography sx={{ mt: 2 }}>소유한 땅 중 하나의 통행료를 2배로 올릴 수 있습니다.</Typography>
    <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 2, border: '1px solid #ccc', borderRadius: 1 }}>
      <List>
        {(modal.properties?.length > 0) ? modal.properties?.map(prop => (
          <ListItem disablePadding key={prop.index}>
            <ListItemButton onClick={() => selectExpoProperty(prop.index)}>
              <ListItemText primary={prop.name} />
            </ListItemButton>
          </ListItem>
        )) : <ListItem><ListItemText primary="선택할 땅이 없습니다." /></ListItem>}
      </List>
    </Box>
  </>
);

// ManagePropertyModalContent
const ManagePropertyModalContent = ({ modal, buildBuilding, endTurn, board }) => (
  <>
    <Typography variant="h5" component="h2">{modal.tile?.name} 관리</Typography>
    <Typography sx={{ mt: 2 }}>건물을 건설하여 통행료를 올릴 수 있습니다.</Typography>
    <Typography sx={{ mt: 1, color: 'blue' }}>다음 건설: {BuildingType[(modal.tile?.buildings?.level ?? 0) + 1] || '최대 레벨'}</Typography>
    <Typography sx={{ mt: 1 }}>비용: {modal.tile?.buildingPrice?.toLocaleString()}원</Typography>
    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
      <Button
        variant="contained"
        onClick={() => buildBuilding(board.findIndex(t => t.name === modal.tile?.name))}
        disabled={(modal.tile?.buildings?.level ?? 0) >= 3}
      >
        건설
      </Button>
      <Button variant="outlined" onClick={endTurn}>다음에</Button>
    </Box>
    <Typography sx={{ mt: 2, fontSize: '0.8rem', color: 'gray' }}>
      건물 레벨: {modal.tile?.buildings?.level ?? 0} / 3 (최대)
    </Typography>
  </>
);

// BuySpecialLandModalContent
const BuySpecialLandModalContent = ({ modal, buySpecialLand, endTurn, currentPlayer }) => {
  const tile = modal.tile;
  const landPrice = modal.landPrice || tile?.landPrice || tile?.price || 0;
  const canAfford = currentPlayer?.money >= landPrice;

  const handlePurchase = () => {
    buySpecialLand(tile, landPrice);
    endTurn();
  };

  return (
    <>
      <Typography variant="h5" component="h2" fontWeight="bold">{tile?.name}</Typography>
      <Typography sx={{ mt: 2, mb: 3 }} color="primary">
        🏛️ SSAFY 특별 땅
      </Typography>
      <Typography sx={{ mb: 2 }}>
        이 땅은 건물 건설이 불가능하며, 땅만 구매할 수 있습니다.
      </Typography>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6">
          구매 가격: {landPrice.toLocaleString()}원
        </Typography>
        <Typography variant="body2" color={canAfford ? 'success.main' : 'error.main'}>
          보유 현금: {currentPlayer?.money.toLocaleString()}원
          {!canAfford && ' (현금 부족)'}
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={handlePurchase}
          disabled={!canAfford}
        >
          구매 ({landPrice.toLocaleString()}원)
        </Button>
        <Button variant="outlined" onClick={endTurn}>
          구매하지 않음
        </Button>
      </Box>
    </>
  );
};

// GameOverModalContent
const GameOverModalContent = ({
  winner,
  handleGoToLobby,
  modalStyle,
  players,
  board,
  shouldShowGameOverByTurns
}) => {
  // 승자가 없고 턴 제한으로 게임이 끝난 경우 fallback 승자 결정
  let finalWinner = winner;
  let gameEndReason = '';

  if (!winner && shouldShowGameOverByTurns) {
    const alivePlayers = players.filter(p => p.money >= 0);
    if (alivePlayers.length > 0) {
      finalWinner = alivePlayers.reduce((prev, current) => {
        const prevAssets = calculateTotalAssets(prev, board);
        const currentAssets = calculateTotalAssets(current, board);
        return prevAssets > currentAssets ? prev : current;
      });
      gameEndReason = '턴 제한으로 인한 자산 기준 승리';
    }
  } else if (winner) {
    gameEndReason = '게임 진행 중 승리';
  }


  return (
    <Box sx={modalStyle}>
      <Typography variant="h4" component="h2">🎉 게임 종료!</Typography>
      <Typography sx={{ mt: 2, fontSize: '1.5rem', fontWeight: 'bold' }}>
        {finalWinner ? `${finalWinner.name}님이 최종 승리했습니다!` : '승자 없이 게임이 종료되었습니다.'}
      </Typography>
      {gameEndReason && (
        <Typography sx={{ mt: 1, fontSize: '1rem', color: 'text.secondary' }}>
          {gameEndReason}
        </Typography>
      )}
      {finalWinner && (
        <Typography sx={{ mt: 1, fontSize: '1.2rem' }}>
          🏆 총 자산: {calculateTotalAssets(finalWinner, board).toLocaleString()}원
        </Typography>
      )}
      <Button sx={{ mt: 3 }} variant="contained" size="large" onClick={handleGoToLobby}>
        로비로 돌아가기
      </Button>
    </Box>
  );
};

export function GameUI() {
  const { userInfo } = useUserStore();
  const players = useGameStore(state => state.players);
  const currentPlayerIndex = useGameStore(state => state.currentPlayerIndex);
  const gamePhase = useGameStore(state => state.gamePhase);
  const winnerId = useGameStore(state => state.winnerId);
  const modal = useGameStore(state => state.modal);
  const totalTurns = useGameStore(state => state.totalTurns);
  const currentTurn = useGameStore(state => state.currentTurn);
  const board = useGameStore(state => state.board);
  const economicHistory = useGameStore(state => state.economicHistory);

  // 경제역사 상태 디버깅
  useEffect(() => {
    console.log("🏦 [GameUI] economicHistory 상태 체크:", economicHistory);
  }, [economicHistory]);
  const setDicePower = useGameStore(state => state.setDicePower);
  const buyProperty = useGameStore(state => state.buyProperty);
  const buyPropertyWithItems = useGameStore(state => state.buyPropertyWithItems);
  const applyEconomicMultiplier = useGameStore(state => state.applyEconomicMultiplier);
  const endTurn = useGameStore(state => state.endTurn);
  const acquireProperty = useGameStore(state => state.acquireProperty);
  const payToll = useGameStore(state => state.payToll);
  const payBail = useGameStore(state => state.payBail);
  const handleJail = useGameStore(state => state.handleJail);
  const selectExpoProperty = useGameStore(state => state.selectExpoProperty);
  const buildBuilding = useGameStore(state => state.buildBuilding);
  const cancelWorldTravel = useGameStore(state => state.cancelWorldTravel);
  const buySpecialLand = useGameStore(state => state.buySpecialLand);

  const navigate = useNavigate();

  const [gauge, setGauge] = useState(0);
  const gaugeRef = useRef<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const winner = winnerId ? players.find(p => p.id === winnerId) : null;
  const isGameOver = gamePhase === 'GAME_OVER';
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === userInfo?.userId;

  // 게임 종료 조건 fallback 체크 (20턴 초과 시)
  const shouldShowGameOverByTurns = currentTurn >= totalTurns;
  const shouldShowGameOver = isGameOver || shouldShowGameOverByTurns;

  useEffect(() => {
    console.log("🎮 GameUI useEffect triggered - isMyTurn:", isMyTurn, "currentPlayerIndex:", currentPlayerIndex, "gamePhase:", gamePhase);
    if (isMyTurn) {
      console.log("⏰ Starting timer for my turn");
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(30); // Reset for others as well
    }
  }, [isMyTurn, currentPlayerIndex, gamePhase]); // Also depend on gamePhase

  useEffect(() => {
    return () => {
      if (gaugeRef.current) {
        clearInterval(gaugeRef.current);
      }
    }
  }, []);

  const handleChargeStart = () => {
    if (gamePhase !== 'WAITING_FOR_ROLL' || !isMyTurn) return;
    setIsCharging(true);
    setGauge(0);
    let power = 0;
    let direction = 1;
    const interval = setInterval(() => {
      power += direction * 2;
      if (power > 100) { power = 100; direction = -1; }
      if (power < 0) { power = 0; direction = 1; }
      setGauge(power);
    }, 20);
    gaugeRef.current = interval;
  }

  const handleChargeEnd = () => {
    if (!isCharging) return;
    setIsCharging(false);
    if (gaugeRef.current) {
      clearInterval(gaugeRef.current);
    }
    setDicePower(gauge);
    window.dispatchEvent(new Event('roll-dice'));
  }

  const handleGoToLobby = () => {
    navigate('/lobby');
  };
  
  const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 450,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    color: 'black',
    borderRadius: 2,
    textAlign: 'center' as const,
    fontFamily: 'Galmuri14, sans-serif',
  };

  const mainButtonSx = {
    width: 250,
    height: 60,
    fontSize: '1.2rem',
    fontFamily: 'Galmuri14'
  };

  return (
    <Box className={styles.gameContainer}>
      <Box className={styles.turnInfo}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'Galmuri14' }}>{currentTurn} / {totalTurns} 턴</Typography>
        {isMyTurn && timeLeft > 5 && <Typography variant="h6" sx={{ fontFamily: 'Galmuri14' }}>남은 시간: {timeLeft}초</Typography>}
        {economicHistory && (
          <Typography variant="body2" className={`${styles.economicText} ${economicHistory.isBoom ? styles.boomText : styles.bustText}`}>
            📈 {economicHistory.fullName} (남은 턴: {economicHistory.remainingTurns})
          </Typography>
        )}
      </Box>

      {/* Player Cards in Corner Positions */}
      {players.map((player, index) => {
        const isMyPlayer = player.id === userInfo?.userId;
        const totalAssets = calculateTotalAssets(player, board);
        const characterColors = {
          'cone': '#4A90E2',
          'sphere': '#E74C3C',
          'box': '#F39C12',
          'torus': '#9B59B6'
        };

        // Corner positioning logic based on player index
        const getCornerPosition = (playerIndex: number) => {
          const positions = [
            { top: 20, left: 20 },        // Top-left
            { top: 20, right: 20 },       // Top-right
            { bottom: 120, right: 20 },   // Bottom-right
            { bottom: 120, left: 20 }     // Bottom-left
          ];
          return positions[playerIndex] || positions[0];
        };

        const position = getCornerPosition(index);

        return (
          <Card key={player.id} className={styles.playerCard} sx={{
            position: 'absolute',
            ...position,
            bgcolor: `rgba(0,0,0,${player.money < 0 ? 0.4 : 0.8})`,
            border: `3px solid ${index === currentPlayerIndex && !isGameOver ? '#FFD700' : characterColors[player.character] || 'white'}`,
            boxShadow: index === currentPlayerIndex && !isGameOver ? '0 0 15px rgba(255, 215, 0, 0.6)' : '0 4px 8px rgba(0,0,0,0.3)',
          }}>
            <CardContent className={styles.playerCardContent} sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box className={styles.playerInfo}>
                <Box
                  className={styles.playerIcon}
                  sx={{ bgcolor: characterColors[player.character] || 'white' }}
                />
                <Typography variant="subtitle1" component="div" fontWeight="bold" className={styles.playerName} sx={{ color: 'white' }}>
                  {player.name} {isMyPlayer ? '(나)' : ''}
                  {player.money < 0 && <span className={styles.bankruptText}> (파산)</span>}
                  {player.isInJail && <span className={styles.jailText}> 🔒</span>}
                </Typography>
              </Box>
              <Typography variant="body2" className={styles.playerStats} sx={{ color: 'white' }}>
                💰 {player.money.toLocaleString()}원
              </Typography>
              <Typography variant="body2" className={styles.playerStats} sx={{ color: 'white' }}>
                📊 총 {totalAssets.toLocaleString()}원
              </Typography>
              <Typography variant="body2" className={styles.playerStats} sx={{ color: 'white' }}>
                🏘️ {player.properties.length}개 도시
              </Typography>
              {index === currentPlayerIndex && !isGameOver && (
                <Typography variant="caption" className={styles.currentTurnLabel}>
                  ⭐ 현재 턴
                </Typography>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Box className={styles.bottomControls}>
        {gamePhase === 'WAITING_FOR_ROLL' && (
           <Box className={styles.gaugeContainer}>
             <LinearProgress variant="determinate" value={gauge} color="secondary" className={styles.gauge} />
           </Box>
        )}
        <Button 
          variant="contained"
          size="large"
          onMouseDown={handleChargeStart}
          onMouseUp={handleChargeEnd}
          onMouseLeave={handleChargeEnd}
          disabled={gamePhase !== 'WAITING_FOR_ROLL' || !isMyTurn}
          className={styles.mainButton}
          sx={{ fontFamily: 'Galmuri14' }}
        >
          {currentPlayer?.isInJail ? '감옥...' : (isCharging ? '놓아서 굴리기!' : '눌러서 파워 조절')}
        </Button>

        {isMyTurn && gamePhase === 'TILE_ACTION' && modal.type === 'NONE' && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={endTurn}
            className={styles.mainButton}
            sx={{ fontFamily: 'Galmuri14' }}
          >
            턴 종료
          </Button>
        )}
      </Box>
      
      {gamePhase === 'WORLD_TRAVEL_MOVE' && (
          <Box className={styles.worldTravelOverlay}>
              <Typography variant="h4" className={styles.worldTravelTitle}>
                🌍 세계여행
              </Typography>
              <Typography variant="h6" className={styles.worldTravelText}>
                원하는 목적지를 보드에서 직접 클릭하세요!<br />
                <span className={styles.worldTravelHighlight}>
                  ✨ 반짝이는 타일들이 클릭 가능한 곳입니다
                </span>
              </Typography>
              <Button
                variant="outlined"
                onClick={cancelWorldTravel}
                sx={{
                  color: '#ff6b6b',
                  borderColor: '#ff6b6b',
                  '&:hover': {
                    borderColor: '#ff5252',
                    bgcolor: 'rgba(255, 107, 107, 0.1)'
                  }
                }}
              >
                취소
              </Button>
          </Box>
      )}

      <Modal open={modal.type !== 'NONE' || shouldShowGameOver} sx={{ pointerEvents: 'all' }}>
        <Box sx={modalStyle}>
          {modal.type === 'BUY_PROPERTY' && (
            <BuyPropertyModalContent modal={modal} buyProperty={buyProperty} buyPropertyWithItems={buyPropertyWithItems} endTurn={endTurn} currentPlayer={currentPlayer} applyEconomicMultiplier={applyEconomicMultiplier} />
          )}
          {modal.type === 'BUY_SPECIAL_LAND' && (
            <BuySpecialLandModalContent modal={modal} buySpecialLand={buySpecialLand} endTurn={endTurn} currentPlayer={currentPlayer} />
          )}
          {modal.type === 'ACQUIRE_PROPERTY' && (
            <AcquirePropertyModalContent modal={modal} acquireProperty={acquireProperty} payToll={payToll} currentPlayer={currentPlayer} endTurn={endTurn} />
          )}
          {modal.type === 'CHANCE_CARD' && (
            <ChanceCardModalContent modal={modal} />
          )}
          {modal.type === 'INFO' && (
            <InfoModalContent modal={modal} endTurn={endTurn} />
          )}
          {modal.type === 'JAIL' && (
            <JailModalContent payBail={payBail} handleJail={handleJail} BAIL_AMOUNT={BAIL_AMOUNT} />
          )}
          {modal.type === 'EXPO' && (
            <ExpoModalContent modal={modal} selectExpoProperty={selectExpoProperty} />
          )}
           {modal.type === 'MANAGE_PROPERTY' && (
            <ManagePropertyModalContent modal={modal} buildBuilding={buildBuilding} endTurn={endTurn} board={board} />
          )}
          {shouldShowGameOver && (
             <GameOverModalContent
               winner={winner}
               handleGoToLobby={handleGoToLobby}
               modalStyle={modalStyle}
               players={players}
               board={board}
               shouldShowGameOverByTurns={shouldShowGameOverByTurns}
             />
          )}
        </Box>
      </Modal>
    </Box>
  )
}