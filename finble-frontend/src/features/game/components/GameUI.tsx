import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.ts'
import { useNavigate } from 'react-router-dom';

export function GameUI() {
  const players = useGameStore((state) => state.players)
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex)
  const gamePhase = useGameStore((state) => state.gamePhase)
  const winnerId = useGameStore((state) => state.winnerId)
  const modal = useGameStore((state) => state.modal)
  const buyProperty = useGameStore((state) => state.buyProperty)
  const acquireProperty = useGameStore((state) => state.acquireProperty)
  const payToll = useGameStore((state) => state.payToll)
  const endTurn = useGameStore((state) => state.endTurn)
  const setDicePower = useGameStore((state) => state.setDicePower)
  const navigate = useNavigate();

  const [gauge, setGauge] = useState(0)
  const gaugeRef = useRef<any>(null)
  const [isCharging, setIsCharging] = useState(false)

  // 컴포넌트가 언마운트될 때 인터벌을 정리하기 위한 useEffect
  useEffect(() => {
    return () => clearInterval(gaugeRef.current)
  }, [])

  const handleChargeStart = () => {
    if (gamePhase !== 'WAITING_FOR_ROLL') return
    
    setIsCharging(true)
    setGauge(0) // 누르기 시작하면 게이지 초기화

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
    navigate('/lobby');
  };

  const winner = winnerId ? players.find(p => p.id === winnerId) : null;
  const isGameOver = gamePhase === 'GAME_OVER';

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'white' }}>
      {players.map((player, index) => (
        <div 
          key={player.id}
          style={{
            position: 'absolute',
            ...(index === 0 && { top: '20px', left: '20px' }),
            ...(index === 1 && { top: '20px', right: '20px' }),
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: `2px solid ${index === currentPlayerIndex ? 'yellow' : 'white'}`,
            borderRadius: '8px',
            display: player.money <= 0 ? 'none' : 'block' // 파산한 플레이어 정보 숨기기
          }}
        >
          <h3>{player.name}</h3>
          <p>자산: {player.money.toLocaleString()}원</p>
          <p>소유도시: {player.properties.length}개</p>
        </div>
      ))}

      <div style={{ position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'all', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* [수정됨] WAITING_FOR_ROLL 상태일 때 항상 게이지 바가 보이도록 수정 */}
        {gamePhase === 'WAITING_FOR_ROLL' && (
          <div style={{ width: '300px', height: '30px', backgroundColor: '#4a5568', borderRadius: '15px', overflow: 'hidden', border: '2px solid white', marginBottom: '1rem' }}>
            <div style={{ width: `${gauge}%`, height: '100%', backgroundColor: '#f56565', transition: 'width 0.02s linear' }} />
          </div>
        )}
        <button 
          onMouseDown={handleChargeStart}
          onMouseUp={handleChargeEnd}
          onMouseLeave={handleChargeEnd} // 버튼 밖으로 마우스가 나가도 굴림 처리
          disabled={gamePhase !== 'WAITING_FOR_ROLL'}
          style={{ padding: '20px 40px', fontSize: '24px', cursor: 'pointer' }}
        >
          {gamePhase === 'WAITING_FOR_ROLL' ? (isCharging ? '놓아서 굴리기!' : '눌러서 파워 조절') : '...'}
        </button>
      </div>

      {(modal.type !== 'NONE' || isGameOver) && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'all' }}>
          <div style={{ padding: '30px', backgroundColor: 'white', color: 'black', borderRadius: '10px', textAlign: 'center', maxWidth: '400px' }}>
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