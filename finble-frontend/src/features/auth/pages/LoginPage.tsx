import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../App.css'; // For .app-container

const backgroundImage = 'src/assets/login_backgound.jpeg';
const pinbleLogo = 'src/assets/pinble-logo.png';
const googleIcon = 'src/assets/google-logo.svg';
const kakaoIcon = 'src/assets/kakao-logo.png';

import NicknameModal from '../components/NicknameModal'; // 모달 컴포넌트 import
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginProvider, setLoginProvider] = useState<string | null>(null); // 'google', 'kakao', or null
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 추가

  const handleGoogleLogin = () => {
    setLoginProvider('google');

    // Simulate an API call for login
    setTimeout(() => {
      setLoginProvider(null);
      setIsModalOpen(true); // 로그인 후 로비 이동 대신 모달 열기
    }, 1500);
  };

  const handleKakaoLogin = () => {
    setLoginProvider('kakao');

    // Simulate an API call for login
    setTimeout(() => {
      setLoginProvider(null);
      setIsModalOpen(true);
    }, 1500);
  };


  const handleNicknameComplete = () => {
    setIsModalOpen(false);
    navigate('/lobby'); // 닉네임 설정 완료 후 로비로 이동
  };

  return (
    <main className="app-container">
      <div
        className="login-container"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div className="logo-container">
          <img src={pinbleLogo} alt="PinBle Logo" className="logo-image" />
        </div>

        <div className="login-actions">
          <button
            onClick={handleGoogleLogin}
            className="google-login-button"
            disabled={!!loginProvider}
          >
            {loginProvider === 'google' ? (
              '구글로 로그인 중...'
            ) : (
              <>
                <img src={googleIcon} alt="Google" className="google-icon" />
                <span className="google-text">Google로 로그인하기</span>
              </>
            )}
          </button>
          <button
            onClick={handleKakaoLogin}
            className="kakao-login-button"
            disabled={!!loginProvider}
          >
            {loginProvider === 'kakao' ? (
              '카카오로 로그인 중...'
            ) : (
              <>
                <img src={kakaoIcon} alt="Kakao" className="kakao-icon" />
                <span className="kakao-text">카카오로 로그인하기</span>
              </>
            )}
          </button>
        </div>


        {/* 닉네임 모달 렌더링 */}
        <NicknameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onComplete={handleNicknameComplete}
        />
      </div>
    </main>
  );
}