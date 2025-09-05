import { useNavigate } from 'react-router-dom'
import { useLobbyStore } from '../store/useLobbyStore.ts'

export function RoomList() {
  const rooms = useLobbyStore((state) => state.rooms)
  const navigate = useNavigate()

  // 현재는 waitingRooms 필터링 로직을 유지하지만,
  // 백엔드에서 받은 status를 활용하는 것이 더 정확합니다.
  const waitingRooms = rooms.filter((room) => room.status === 'waiting')

  return (
    <div style={{ width: '100%', maxWidth: '800px', marginTop: '2rem' }}>
      {waitingRooms.map((room) => (
        <div
          key={room.roomNo}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            marginBottom: '1rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #444',
          }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{room.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', color: '#ccc' }}>
              {room.currentPlayer}/{room.maxPlayer}
            </span>
            <button
              onClick={() => navigate(`/room/${room.roomNo}`)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#535bf2',
                color: 'white',
              }}
            >
              참여
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
