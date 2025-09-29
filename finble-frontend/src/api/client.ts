import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// 요청 인터셉터 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    // 로그인 요청에는 토큰을 추가하지 않도록 URL 체크
    if (
      token &&
      config.url !== '/auth/google-login' &&
      config.url !== '/auth/kakao'
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request Headers:', config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
