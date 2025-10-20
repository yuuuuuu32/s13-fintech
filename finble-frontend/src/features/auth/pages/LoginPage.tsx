import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../App.css';

const backgroundImage = 'src/assets/login_backgound.jpeg';
const pinbleLogo = 'src/assets/pinble-logo.png';
const kakaoIcon = 'src/assets/kakao-logo.png';

import NicknameModal from '../components/NicknameModal';
import './LoginPage.css';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import apiClient from '../../../api/client';
import { getMyInfo } from '../../../api/user';
import { useUserStore } from '../../../stores/useUserStore'; // Import user store

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
  const setUserInfo = useUserStore((state) => state.setUserInfo); // Get action from store

  const handleLoginSuccess = async (accessToken: string) => {
    try {
      localStorage.setItem('jwt', accessToken);
      const userInfo = await getMyInfo();
      console.log('Fetched userInfo:', userInfo); // 디버깅을 위해 추가
      
      // Set the user info in the global store
      setUserInfo(userInfo);

      // 'player'로 시작하고 숫자가 뒤따르는 닉네임 패턴을 정의합니다.
      const defaultNicknamePattern = /^player\d+$|^Player\d+$/; // 'player' 또는 'Player'로 시작하는 숫자 패턴

      if (userInfo && userInfo.nickname && !defaultNicknamePattern.test(userInfo.nickname)) {
        navigate('/lobby');
      } else {
        // 닉네임이 없거나, 'player숫자' 패턴인 경우 닉네임 변경 모달을 띄웁니다.
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
      // This is where the 403 error is likely still happening
      // For now, assume it will be fixed and show modal as a fallback
      setErrorMessage('사용자 정보를 가져오는 데 실패했습니다. 닉네임을 설정해주세요.');
      setIsModalOpen(true); 
    } finally {
      setIsLoggingIn(false);
      setLoginProvider(null);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setErrorMessage(null);
    setIsLoggingIn(true);
    setLoginProvider('google');

    try {
      if (!credentialResponse.credential) {
        throw new Error('Google ID token not found');
      }

      const res = await apiClient.post('/auth/google-login', {
        idToken: credentialResponse.credential,
      });
      await handleLoginSuccess(res.data.accessToken);
    } catch (error: unknown) {
      console.error('Backend login error:', error);
      setIsLoggingIn(false);
      setLoginProvider(null);
      
      // 500 에러를 닉네임 문제로 단정하지 않고, 일반적인 로그인 실패로 처리합니다.
      setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    setErrorMessage('Google 로그인에 실패했습니다. 다시 시도해주세요.');
  };

  const handleKakaoLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('kakao');
    setErrorMessage(null);

    // Legacy: Kakao SDK access token -> POST /auth/kakao (활성화)
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

    /*
    // 백엔드에서 인가 URL을 받아 리다이렉트하는 플로우 (비활성화)
    apiClient
      .post('/auth/kakao-login')
      .then((res) => {
        const { authorizationUrl } = res.data as { authorizationUrl: string };
        if (authorizationUrl) {
          window.location.href = authorizationUrl;
        } else {
          throw new Error('authorizationUrl not found');
        }
      })
      .catch((error) => {
        console.error('Kakao login init error:', error);
        setErrorMessage('카카오 로그인 시작에 실패했습니다. 다시 시도해주세요.');
        setIsLoggingIn(false);
        setLoginProvider(null);
      });
    */
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
            width={320}  
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