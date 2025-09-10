import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../../App.css'; // For .app-container

export default function LandingPage() {
  const navigate = useNavigate()

  const goToLoginPage = () => {
    navigate('/login')
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      goToLoginPage()
    }

    // 키보드 이벤트 리스너 추가
    window.addEventListener('keydown', handleKeyPress)

    // 컴포넌트가 언마운트될 때 이벤트 리스너 제거
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [navigate])

  return (
    <main className="app-container">
      <div
        onClick={goToLoginPage}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: '#1a1a1a',
          color: 'white',
        }}
      >
        <h1>금융 브루마블 (Finble)</h1>
        <p style={{ marginTop: '2rem' }}>화면을 클릭하거나 아무 키나 눌러 시작하세요.</p>
      </div>
    </main>
  )
}