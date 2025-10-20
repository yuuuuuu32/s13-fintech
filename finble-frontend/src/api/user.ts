import apiClient from './client';

/**
 * 서버에서 현재 로그인된 사용자의 정보를 가져옵니다.
 * API 요청 시 헤더에 Authorization으로 Bearer 토큰을 담아 보냅니다.
 * @returns 사용자 정보 객체 (e.g., { email: '...', nickname: '...' })
 */
export const getMyInfo = async () => {
  // localStorage에서 토큰을 가져옵니다.
  const token = localStorage.getItem('jwt');

  // 토큰이 없으면 에러를 발생시킵니다.
  if (!token) {
    throw new Error('인증 토큰을 찾을 수 없습니다.');
  }

  // apiClient를 사용하여 사용자 정보를 요청합니다.
  // '/users/me'는 사용자 정보를 반환하는 API 엔드포인트로 가정합니다.
  const response = await apiClient.get('/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

/**
 * 사용자의 닉네임을 업데이트합니다.
 * @param nickname - 새로운 닉네임
 * @returns 업데이트된 사용자 정보
 */
export const updateMyInfo = async (nickname: string) => {
  const token = localStorage.getItem('jwt');
  if (!token) {
    throw new Error('인증 토큰을 찾을 수 없습니다.');
  }

  const response = await apiClient.put(
    '/user',
    { nickname }, // 요청 본문에 닉네임 포함
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
