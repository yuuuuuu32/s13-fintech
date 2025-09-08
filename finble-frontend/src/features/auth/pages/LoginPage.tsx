import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../../../assets/login_backgound.jpeg'; // 배경 이미지
import pinbleLogo from '../../../assets/pinble-logo.png'; // 게임 로고
import googleIcon from '../../../assets/google-logo.svg'; // Google 아이콘 (이 파일은 assets 폴더에 추가해야 합니다)
import NicknameModal from '../components/NicknameModal'; // 모달 컴포넌트 import
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 추가

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);

    // Simulate an API call for login
    setTimeout(() => {
      setIsLoggingIn(false);
      setIsModalOpen(true); // 로그인 후 로비 이동 대신 모달 열기
    }, 1500);
  };

  const handleNicknameComplete = () => {
    setIsModalOpen(false);
    navigate('/lobby'); // 닉네임 설정 완료 후 로비로 이동
  };

  return (
    <div
      className="login-container"
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div className="logo-container">
        <img src={pinbleLogo} alt="PinBle Logo" className="logo-image" />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="google-login-button"
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          '로그인 중...'
        ) : (
          <>
            <img src={googleIcon} alt="Google" className="google-icon" />
            <span className="google-text">Google로 로그인하기</span>
          </>
        )}
      </button>

      {/* 닉네임 모달 렌더링 */}
      <NicknameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleNicknameComplete}
      />
    </div>
  );
}
