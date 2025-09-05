import { useState, useEffect } from 'react'
import { RoomList } from '../components/RoomList.tsx'
import { CreateRoomModal } from '../components/CreateRoomModal.tsx'
import { useLobbyStore } from '../store/useLobbyStore.ts'

export default function LobbyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fetchRooms = useLobbyStore((state) => state.fetchRooms)

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        color: 'white',
      }}
    >
      <header
        style={{
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>게임 대기방</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '0.8rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          방 만들기
        </button>
      </header>

      <RoomList />

      {isModalOpen && <CreateRoomModal onClose={() => setIsModalOpen(false)} />}
    </div>
  )
}
