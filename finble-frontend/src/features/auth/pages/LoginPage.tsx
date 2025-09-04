import googleLogo from '../../../assets/google-logo.svg' // 구글 로고 이미지가 필요합니다.

export default function LoginPage() {
  const handleGoogleLogin = () => {
    // TODO: 실제 구글 로그인 로직을 여기에 구현합니다.
    console.log('구글 로그인 시도')
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