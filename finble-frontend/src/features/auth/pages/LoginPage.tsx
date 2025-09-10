import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../../../assets/login_backgound.jpeg'; // 배경 이미지
import pinbleLogo from '../../../assets/pinble-logo.png'; // 게임 로고
import googleIcon from '../../../assets/google-logo.svg'; // Google 아이콘
import kakaoIcon from '../../../assets/kakao-logo.png'; // Kakao 아이콘
import NicknameModal from '../components/NicknameModal'; // 모달 컴포넌트 import
import './LoginPage.css';
import { useGoogleLogin } from '@react-oauth/google';
import apiClient from '../../../api/client'; // apiClient 임포트

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
  const [loginProvider, setLoginProvider] = useState<string | null>(null); // 'google', 'kakao', or null
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 추가
  const [isLoggingIn, setIsLoggingIn] = useState(false); // 로그인 중 상태 추가
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 에러 메시지 상태 추가

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // No need to set isLoggingIn here, it's already true
      setErrorMessage(null); // Clear previous errors
      console.log('Google Login Success:', tokenResponse);
      try {
        // 백엔드로 ID 토큰 전송
        const res = await apiClient.post('/auth/google', {
          idToken: tokenResponse.access_token,
        });
        console.log('Backend Response:', res.data);
        // 백엔드로부터 받은 JWT 등을 처리 (예: localStorage에 저장)
        // localStorage.setItem('jwt', res.data.jwt);
        setIsLoggingIn(false);
        setLoginProvider(null);
        setIsModalOpen(true); // 로그인 후 로비 이동 대신 모달 열기
      } catch (error) {
        console.error('Backend login error:', error);
        setIsLoggingIn(false);
        setLoginProvider(null);
        setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.'); // Set user-friendly error message
      }
    },
    onError: (errorResponse) => {
      console.error('Google Login Failed:', errorResponse);
      setIsLoggingIn(false);
      setLoginProvider(null);
      setErrorMessage('Google 로그인에 실패했습니다. 다시 시도해주세요.'); // Set user-friendly error message
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
    }
  });

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('google');
    setErrorMessage(null); // Clear previous errors
    googleLogin(); // Google 로그인 흐름 시작
  };

  const handleKakaoLogin = () => {
    setIsLoggingIn(true);
    setLoginProvider('kakao');
    setErrorMessage(null);

    const timeoutId = setTimeout(() => {
      setIsLoggingIn(false);
      setLoginProvider(null);
      setErrorMessage('로그인 창이 닫혔거나 로그인에 실패했습니다. 다시 시도해주세요.');
    }, 10000); // 10 seconds timeout for user action

    window.Kakao.Auth.login({
      success: function(authObj: KakaoLoginResponse) {
        clearTimeout(timeoutId);
        console.log('Kakao Login Success:', authObj);
        apiClient.post('/auth/kakao', {
          accessToken: authObj.access_token,
        })
        .then(res => {
          console.log('Backend Response:', res.data);
          setIsLoggingIn(false);
          setLoginProvider(null);
          setIsModalOpen(true);
        })
        .catch(error => {
          console.error('Backend login error:', error);
          setIsLoggingIn(false);
          setLoginProvider(null);
          setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
        });
      },
      fail: function(err: KakaoError) {
        clearTimeout(timeoutId);
        console.error('Kakao Login Failed:', err);
        setIsLoggingIn(false);
        setLoginProvider(null);
        setErrorMessage('Kakao 로그인에 실패했습니다. 다시 시도해주세요.');
      },
    });
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

      <div className="login-actions">
        {errorMessage && <p className="error-message">{errorMessage}</p>} {/* 에러 메시지 표시 */}
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


      {/* 닉네임 모달 렌더링 */}
      <NicknameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleNicknameComplete}
      />
    </div>
  );
}