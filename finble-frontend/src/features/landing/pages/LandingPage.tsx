import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../../App.css'; // For .app-container
import LandingVideo from '../../../assets/Landing.mp4'; // Import the video
console.log('LandingVideo path:', LandingVideo);

export default function LandingPage() {
  const navigate = useNavigate()
  const pinbleLogo = 'src/assets/pinble-logo.png';

  const goToLoginPage = useCallback(() => {
    navigate('/login')
  }, [navigate])

  useEffect(() => {
    const handleKeyPress = () => {
      goToLoginPage()
    }

    // 키보드 이벤트 리스너 추가
    window.addEventListener('keydown', handleKeyPress)

    // 컴포넌트가 언마운트될 때 이벤트 리스너 제거
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [goToLoginPage])

  return (
    <main className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        onClick={goToLoginPage}
        style={{
          position: 'relative', // Ensure content is above video
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for readability
          color: 'white',
        }}
      >
        <video
          src={LandingVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1, // Send to back
          }}
        />
        <div className="logo-container">
          <img src={pinbleLogo} alt="PinBle Logo" className="logo-image" />
        </div>
        <p style={{ marginTop: '2rem' }}>화면을 클릭하거나 아무 키나 눌러 시작하세요.</p>
      </div>
    </main>
  )
}