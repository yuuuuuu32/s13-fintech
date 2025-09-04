import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLobbyStore } from '../store/useLobbyStore.ts'

interface CreateRoomModalProps {
  onClose: () => void
}

export function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('')
  const addRoom = useLobbyStore((state) => state.addRoom)
  const navigate = useNavigate()

  const handleSubmit = () => {
    console.log('asdas')
    if (roomName.trim()) {
      const newRoomId = addRoom(roomName.trim())
      navigate(`/room/${newRoomId}`)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
      }}
      // 이 부분의 onClick 핸들러를 완전히 제거했습니다!
    >
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#242424',
          borderRadius: '12px',
          border: '1px solid #555',
          minWidth: '400px',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>새로운 방 만들기</h2>

        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="방 제목을 입력하세요"
          style={{
            width: '100%',
            padding: '0.8rem',
            fontSize: '1rem',
            borderRadius: '6px',
            border: '1px solid #666',
            backgroundColor: '#333',
            color: 'white',
            marginBottom: '1.5rem',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.2rem' }}>
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{ padding: '0.6rem 1.2rem', backgroundColor: '#535bf2' }}
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  )
}