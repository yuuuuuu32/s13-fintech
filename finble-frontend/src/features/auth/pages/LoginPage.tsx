import { useNavigate } from 'react-router-dom'
import googleLogo from '../../../assets/google-logo.svg'

export default function LoginPage() {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    navigate('/lobby')
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
      }}
    >
      <button
        onClick={handleGoogleLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: '1px solid #ccc',
          borderRadius: '8px',
          backgroundColor: 'white',
          color: '#333',
        }}
      >
        <img
          src={googleLogo}
          alt="Google a"
          style={{ width: '24px', height: '24px', marginRight: '16px' }}
        />
        Google 계정으로 로그인
      </button>
    </div>
  )
}