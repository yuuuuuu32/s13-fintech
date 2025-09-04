import React, { useState } from 'react'
import { useLobbyStore } from '../store/useLobbyStore.ts'

interface CreateRoomModalProps {
  onClose: () => void // 모달을 닫는 함수
}

export function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('')
  const addRoom = useLobbyStore((state) => state.addRoom)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim()) {
      addRoom(roomName.trim())
      onClose() // 방을 만든 후 모달을 닫습니다.
    }
  }

  return (
    // 모달 배경
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
      onClick={onClose} // 배경 클릭 시 모달 닫기
    >
      {/* 모달 컨텐츠 */}
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#242424',
          borderRadius: '12px',
          border: '1px solid #555',
          minWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()} // 컨텐츠 클릭 시 닫히지 않도록 이벤트 전파 방지
      >
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>새로운 방 만들기</h2>
        <form onSubmit={handleSubmit}>
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
            <button type="submit" style={{ padding: '0.6rem 1.2rem', backgroundColor: '#535bf2' }}>
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}