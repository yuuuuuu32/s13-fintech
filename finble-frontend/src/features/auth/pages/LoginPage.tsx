import { useNavigate } from 'react-router-dom';
import backgroundImage from '../../../assets/login_backgound.jpeg'; // 배경 이미지
import pinbleLogo from '../../../assets/pinble-logo.png'; // 게임 로고
import kakaoIcon from '../../../assets/Kakao_icon.png'; // 카카오 아이콘

export default function LoginPage() {
  const navigate = useNavigate();

  const handleKakaoLogin = () => {
    navigate('/lobby'); // 로그인 후 로비 이동
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: `url(${backgroundImage}) no-repeat center center fixed`,
        backgroundSize: 'cover',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Orbitron, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 텍스트 오버레이 (가독성 향상용) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 5,
        }}
      ></div>

      {/* 게임 로고 - 중앙 상단 */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          marginBottom: '60px',
        }}
      >
        <img
          src={pinbleLogo}
          alt="PinBle Logo"
          style={{
            width: '200px', // 크기 조절 가능
            height: 'auto',
            filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.7))',
            opacity: 1,
          }}
        />
      </div>

      {/* 카카오 로그인 버튼 - 중앙 하단 */}
      <button
        onClick={handleKakaoLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 32px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: '2px solid #fcb800',
          borderRadius: '8px',
          backgroundColor: '#fff',
          color: '#000',
          boxShadow: '0 0 15px rgba(252, 184, 0, 0.6)',
          transition: 'all 0.3s ease',
          margin: '0 auto',
          zIndex: 10,
          textShadow: '0 0 5px rgba(0,0,0,0.5)',
          maxWidth: '300px',
        }}
      >
        <img
          src={kakaoIcon}
          alt="Kakao"
          style={{ width: '28px', height: '28px', marginRight: '12px' }}
        />
        카카오로 로그인하기
      </button>
    </div>
  );
}