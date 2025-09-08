import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.ts'
import { useNavigate } from 'react-router-dom';
import { boardData } from '../data/boardData.ts';

export function GameUI() {
  const {
    players,
    currentPlayerIndex,
    gamePhase,
    winnerId,
    modal,
    totalTurns,
    currentTurn,
    buyProperty,
    acquireProperty,
    payToll,
    endTurn,
    setDicePower,
    payBail,
    handleJail,
    selectExpoProperty,
    selectTravelDestination,
  } = useGameStore(state => state);

  const navigate = useNavigate();

  const [gauge, setGauge] = useState(0)
  const gaugeRef = useRef<any>(null)
  const [isCharging, setIsCharging] = useState(false)
  const [showWorldTravelPicker, setShowWorldTravelPicker] = useState(false);

  useEffect(() => {
    return () => clearInterval(gaugeRef.current)
  }, [])

  const handleChargeStart = () => {
    if (gamePhase !== 'WAITING_FOR_ROLL') return
    
    setIsCharging(true)
    setGauge(0)
    let power = 0
    let direction = 1
    const interval = setInterval(() => {
      power += direction * 2
      if (power > 100) { power = 100; direction = -1; }
      if (power < 0) { power = 0; direction = 1; }
      setGauge(power)
    }, 20)
    gaugeRef.current = interval
  }

  const handleChargeEnd = () => {
    if (!isCharging) return;

    setIsCharging(false)
    clearInterval(gaugeRef.current)
    setDicePower(gauge)
    window.dispatchEvent(new Event('roll-dice'))
  }

  const handleGoToLobby = () => {
    // 여기에 게임 상태 초기화 로직을 추가할 수 있습니다.
    navigate('/lobby');
  };
  
  useEffect(() => {
    setShowWorldTravelPicker(modal.type === 'WORLD_TRAVEL_PICKER');
  }, [modal.type]);

  const winner = winnerId ? players.find(p => p.id === winnerId) : null;
  const isGameOver = gamePhase === 'GAME_OVER';
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      {/* 남은 턴 / 현재 턴 표시 */}
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {currentTurn} / {totalTurns} 턴
      </div>

      {players.map((player, index) => (
        <div 
          key={player.id}
          style={{
            position: 'absolute',
            ...(index === 0 && { top: '20px', left: '20px' }),
            ...(index === 1 && { top: '20px', right: '20px' }),
            padding: '10px',
            backgroundColor: `rgba(0,0,0,${player.money <= 0 ? 0.3 : 0.7})`, // 파산 시 반투명
            border: `2px solid ${index === currentPlayerIndex && gamePhase !== 'GAME_OVER' ? 'yellow' : 'white'}`,
            borderRadius: '8px',
            transition: 'background-color 0.3s'
          }}
        >
          <h3>{player.name} {player.money <= 0 ? '(파산)' : ''}</h3>
          <p>자산: {player.money.toLocaleString()}원</p>
          <p>소유도시: {player.properties.length}개</p>
        </div>
      ))}

      <div style={{ position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'all', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {gamePhase === 'WAITING_FOR_ROLL' && (
          <div style={{ width: '300px', height: '30px', backgroundColor: '#4a5568', borderRadius: '15px', overflow: 'hidden', border: '2px solid white', marginBottom: '1rem' }}>
            <div style={{ width: `${gauge}%`, height: '100%', backgroundColor: '#f56565', transition: 'width 0.02s linear' }} />
          </div>
        )}
        <button 
          onMouseDown={handleChargeStart}
          onMouseUp={handleChargeEnd}
          onMouseLeave={handleChargeEnd}
          disabled={gamePhase !== 'WAITING_FOR_ROLL'}
          style={{ padding: '20px 40px', fontSize: '24px', cursor: 'pointer', opacity: gamePhase !== 'WAITING_FOR_ROLL' ? 0.5 : 1 }}
        >
          {currentPlayer.isInJail ? '무인도...' : (isCharging ? '놓아서 굴리기!' : '눌러서 파워 조절')}
        </button>
      </div>

      {(modal.type !== 'NONE' || isGameOver || showWorldTravelPicker) && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'all', zIndex: 10 }}>
          <div style={{ padding: '30px', backgroundColor: 'white', color: 'black', borderRadius: '10px', textAlign: 'center', minWidth: '350px' }}>
            {modal.type === 'BUY_PROPERTY' && (
              <>
                <h2>{modal.tile?.name}</h2>
                <p>가격: {modal.tile?.price?.toLocaleString()}원</p>
                <p>구매하시겠습니까?</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={buyProperty} style={{ padding: '10px 20px' }}>구매</button>
                  <button onClick={endTurn} style={{ padding: '10px 20px' }}>패스</button>
                </div>
              </>
            )}
             {modal.type === 'ACQUIRE_PROPERTY' && (
              <>
                <h2>{modal.tile?.name} 인수</h2>
                <p>통행료: {modal.toll?.toLocaleString()}원</p>
                <p>인수 비용: {modal.acquireCost?.toLocaleString()}원</p>
                <p>인수하시겠습니까?</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={acquireProperty} style={{ padding: '10px 20px' }}>인수</button>
                  <button onClick={payToll} style={{ padding: '10px 20px' }}>통행료만 지불</button>
                </div>
              </>
            )}
            {modal.type === 'CHANCE_CARD' && (
              <>
                <h2>★ 찬스 카드 ★</h2>
                <p style={{ fontSize: '1.2rem', margin: '20px 0' }}>{modal.text}</p>
                <button onClick={endTurn} style={{ padding: '10px 20px' }}>확인</button>
              </>
            )}
            {modal.type === 'INFO' && (
              <>
                <h2>알림</h2>
                <p style={{ fontSize: '1.1rem', margin: '20px 0' }}>{modal.text}</p>
                <button onClick={endTurn} style={{ padding: '10px 20px' }}>확인</button>
              </>
            )}
             {modal.type === 'JAIL' && (
              <>
                <h2>무인도 도착</h2>
                <p>보석금을 내고 즉시 탈출하거나, 3턴 동안 머물러야 합니다.</p>
                <p>(남은 턴: {currentPlayer.jailTurns})</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={payBail} style={{ padding: '10px 20px' }}>보석금 ({ (500000).toLocaleString() }원) 지불</button>
                  <button onClick={handleJail} style={{ padding: '10px 20px' }}>머물기</button>
                </div>
              </>
            )}
             {modal.type === 'EXPO' && (
              <>
                <h2>박람회 개최!</h2>
                <p>소유한 땅 중 하나의 통행료를 2배로 올릴 수 있습니다.</p>
                <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '20px 0', border: '1px solid #ccc', borderRadius: '5px' }}>
                  {modal.properties?.map(prop => (
                    <button key={prop.index} onClick={() => selectExpoProperty(prop.index)} style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left' }}>
                      {prop.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {showWorldTravelPicker && (
              <>
                <h2>세계여행</h2>
                <p>이동하고 싶은 타일을 클릭하세요.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', marginTop: '1rem', pointerEvents: 'all' }}>
                  {boardData.map((tile, index) => (
                    <button 
                      key={index} 
                      onClick={() => {
                        setShowWorldTravelPicker(false);
                        selectTravelDestination(index);
                      }}
                      style={{ padding: '8px 4px', fontSize: '10px', border: '1px solid #eee' }}
                      title={tile.name}
                    >
                      {tile.name.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </>
            )}
            {isGameOver && (
              <>
                <h2>게임 종료!</h2>
                <p style={{ fontSize: '1.5rem', margin: '20px 0' }}>
                  {winner ? `${winner.name}님이 최종 승리했습니다!` : '모든 플레이어가 파산했습니다.'}
                </p>
                <button onClick={handleGoToLobby} style={{ padding: '10px 20px' }}>로비로 돌아가기</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
