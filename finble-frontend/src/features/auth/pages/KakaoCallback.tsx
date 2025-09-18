import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import { getMyInfo } from '../../../api/user';
import { useUserStore } from '../../../stores/useUserStore';

export default function KakaoCallback() {
  const navigate = useNavigate();
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          navigate('/login', { state: { error: '카카오 로그인에 실패했습니다.' } });
          return;
        }

        // 백엔드 콜백 엔드포인트 호출
        const response = await fetch(`/api/auth/kakao/callback?code=${code}&state=${state || ''}`);

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const tokenData = await response.json();
        const accessToken = tokenData.accessToken;

        if (accessToken) {
          // JWT 토큰을 localStorage에 저장
          localStorage.setItem('jwt', accessToken);

          // 사용자 정보 가져오기
          const userInfo = await getMyInfo();
          setUserInfo(userInfo);

          // 닉네임 패턴 확인
          const defaultNicknamePattern = /^player\d+$|^Player\d+$/;

          if (userInfo && userInfo.nickname && !defaultNicknamePattern.test(userInfo.nickname)) {
            navigate('/lobby');
          } else {
            navigate('/login', { state: { showNicknameModal: true } });
          }
        } else {
          throw new Error('No access token received');
        }
      } catch (error) {
        console.error('Kakao callback error:', error);
        navigate('/login', { state: { error: '로그인 처리 중 오류가 발생했습니다.' } });
      }
    };

    handleCallback();
  }, [navigate, setUserInfo]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ fontSize: '18px', marginBottom: '20px' }}>🔄 카카오 로그인 처리 중...</div>
      <div style={{ color: '#666' }}>잠시만 기다려주세요.</div>
    </div>
  );
}