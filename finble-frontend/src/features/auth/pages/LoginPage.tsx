import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../App.css'; // For .app-container

const backgroundImage = 'src/assets/login_backgound.jpeg';
const pinbleLogo = 'src/assets/pinble-logo.png';
const kakaoIcon = 'src/assets/kakao-logo.png';

import NicknameModal from '../components/NicknameModal';
import './LoginPage.css';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'; // GoogleLogin 컴포넌트 import
import apiClient from '../../../api/client';
import { getMyInfo } from '../../../api/user';

interface KakaoLoginResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  scope: string;
}

interface KakaoError {
  error: string;
  error_description: string;
  error_code?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginProvider, setLoginProvider] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 로그인 성공 후 공통 처리 로직
  const handleLoginSuccess = async (accessToken: string) => {
    try {
      localStorage.setItem('jwt', accessToken);
      const userInfo = await getMyInfo();

      if (userInfo && userInfo.nickname) {
        navigate('/lobby');
      } else {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
      setErrorMessage('사용자 정보를 가져오는 데 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
      setLoginProvider(null);
    }
  };

  // Google 로그인 성공 핸들러
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setErrorMessage(null);
    setIsLoggingIn(true);
    setLoginProvider('google');

    try {
      if (!credentialResponse.credential) {
        throw new Error('Google ID token not found');
      }

      const res = await apiClient.post('/auth/google-login', {
        idToken: credentialResponse.credential, // ID 토큰 전송
      });
      await handleLoginSuccess(res.data.accessToken);
    } catch (error) {
      console.error('Backend login error:', error);
      setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoggingIn(false);
      setLoginProvider(null);
    }
  };

  // Google 로그인 실패 핸들러
  const handleGoogleError = () => {
    console.error('Google Login Failed');
    setErrorMessage('Google 로그인에 실패했습니다. 다시 시도해주세요.');
  };

  const handleKakaoLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('kakao');
    setErrorMessage(null);

    window.Kakao.Auth.login({
      success: function (authObj: KakaoLoginResponse) {
        apiClient
          .post('/auth/kakao', {
            accessToken: authObj.access_token,
          })
          .then(async (res) => {
            await handleLoginSuccess(res.data.accessToken);
          })
          .catch((error) => {
            console.error('Backend login error:', error);
            setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
            setIsLoggingIn(false);
            setLoginProvider(null);
          });
      },
      fail: function (err: KakaoError) {
        console.error('Kakao Login Failed:', err);
        setIsLoggingIn(false);
        setLoginProvider(null);
        setErrorMessage('Kakao 로그인에 실패했습니다. 다시 시도해주세요.');
      },
    });
  };

  const handleNicknameComplete = () => {
    setIsModalOpen(false);
    navigate('/lobby');
  };

  return (
    <main
      className="login-container app-container"
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div className="logo-container">
        <img src={pinbleLogo} alt="PinBle Logo" className="logo-image" />
      </div>

      <div className="login-actions">
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <button
          onClick={handleKakaoLogin}
          className="kakao-login-button"
          disabled={isLoggingIn}
        >
          {isLoggingIn && loginProvider === 'kakao' ? (
            '카카오로 로그인 중...'
          ) : (
            <>
              <img src={kakaoIcon} alt="Kakao" className="kakao-icon" />
              <span className="kakao-text">카카오로 로그인하기</span>
            </>
          )}
        </button>
      </div>

      <NicknameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleNicknameComplete}
      />
    </main>
  );
}