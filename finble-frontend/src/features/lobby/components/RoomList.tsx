import { useLobbyStore, type GameRoom } from '../store/useLobbyStore.ts'

export function RoomList() {
  // 스토어에서 방 목록을 가져옵니다.
  const rooms = useLobbyStore((state) => state.rooms)

  // 대기중인 방만 필터링합니다.
  const waitingRooms = rooms.filter((room) => room.status === 'waiting')

  return (
    <div style={{ width: '100%', maxWidth: '800px', marginTop: '2rem' }}>
      {waitingRooms.map((room) => (
        <div
          key={room.id}
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
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{room.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', color: '#ccc' }}>
              {room.players}/{room.maxPlayers}
            </span>
            <button
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