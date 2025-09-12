import { useParams, useNavigate } from 'react-router-dom'
import { useLobbyStore } from '../../lobby/store/useLobbyStore.ts'

// Zustand 스토어에서 현재 유저 정보를 가져옵니다. (실제로는 로그인 정보와 연동해야 합니다)
// useLobbyStore.ts 파일에 currentUser를 export 하도록 추가해야 합니다.
// export const currentUser = { id: 'user-me', name: '나' }
import { currentUser } from '../../lobby/store/useLobbyStore.ts'

export default function WaitingRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const rooms = useLobbyStore((state) => state.rooms)

  const currentRoom = rooms.find((room) => room.id === roomId)

  // 방장이 현재 유저인지 확인합니다. (players 배열이 있는지 확인 추가)
  const isHost = currentRoom && currentRoom.players && currentRoom.players.length > 0 && currentRoom.players[0].id === currentUser.id

  if (!currentRoom) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '4rem' }}>
        <h2>방을 찾을 수 없습니다.</h2>
        <button onClick={() => navigate('/lobby')}>로비로 돌아가기</button>
      </div>
    )
  }

  return (
    // 전체 레이아웃 구조를 수정하여 버튼이 밀려나지 않도록 합니다.
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between', // 요소들을 위아래로 분산 배치
        alignItems: 'center',
        padding: '2rem',
        color: 'white',
      }}
    >
      {/* 상단 정보 영역 */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>{currentRoom.name}</h1>
        <p style={{ fontSize: '1.2rem', color: '#ccc', margin: 0 }}>
          ({currentRoom.players ? currentRoom.players.length : 0}/{currentRoom.maxPlayers})
        </p>
      </div>

      {/* 플레이어 목록 영역 */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          margin: '2rem 0', // 위아래 여백 추가
        }}
      >
        {currentRoom.players && currentRoom.players.map((player) => (
          <div
            key={player.id}
            style={{
              padding: '1.5rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '1.2rem',
            }}
          >
            {player.name}
          </div>
        ))}
      </div>

      {/* 하단 버튼 영역 */}
      <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '2rem' }}>
        <button
          onClick={() => navigate('/lobby')}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            backgroundColor: '#555',
          }}
        >
          로비로 가기
        </button>
        {/* 방장일 경우에만 "게임 시작" 버튼을 보여줍니다. */}
        {isHost && (
          <button
            onClick={() => navigate('/game')}
            style={{ padding: '1rem 2rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            게임 시작
          </button>
        )}
      </div>
    </div>
  )
}