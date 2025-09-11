import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../App.css'; // For .app-container

const backgroundImage = 'src/assets/login_backgound.jpeg';
const pinbleLogo = 'src/assets/pinble-logo.png';
const googleIcon = 'src/assets/google-logo.svg';
const kakaoIcon = 'src/assets/kakao-logo.png';

import NicknameModal from '../components/NicknameModal';
import './LoginPage.css';
import { useGoogleLogin } from '@react-oauth/google';
import apiClient from '../../../api/client';
import { getMyInfo } from '../../../api/user'; // getMyInfo 함수 import

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

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErrorMessage(null);
      try {
        const res = await apiClient.post('/auth/google-login', {
          idToken: tokenResponse.access_token,
        });
        await handleLoginSuccess(res.data.accessToken);
      } catch (error) {
        console.error('Backend login error:', error);
        setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
        setIsLoggingIn(false);
        setLoginProvider(null);
      }
    },
    onError: (errorResponse) => {
      console.error('Google Login Failed:', errorResponse);
      setIsLoggingIn(false);
      setLoginProvider(null);
      setErrorMessage('Google 로그인에 실패했습니다. 다시 시도해주세요.');
    },
    onNonOAuthError: (error) => {
      console.error('Google Non-OAuth Error:', error);
      setIsLoggingIn(false);
      setLoginProvider(null);
      if (error.type === 'popup_closed') {
        setErrorMessage('Google 로그인 창을 닫았습니다.');
      } else {
        setErrorMessage('Google 로그인 중 오류가 발생했습니다.');
      }
    },
  });

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('google');
    setErrorMessage(null);
    googleLogin();
  };

  const handleKakaoLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('kakao');
    setErrorMessage(null);

    window.Kakao.Auth.login({
      success: function (authObj: KakaoLoginResponse) {
        apiClient
          .post('/auth/kakao', { // 이 엔드포인트는 백엔드에 아직 없습니다.
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
        <button
          onClick={handleGoogleLogin}
          className="google-login-button"
          disabled={isLoggingIn}
        >
          {isLoggingIn && loginProvider === 'google' ? (
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
