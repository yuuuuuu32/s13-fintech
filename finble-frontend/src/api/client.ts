import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// 향후 토큰, 에러 처리 등 공통 로직을 위한 인터셉터를 추가할 수 있습니다.

export default apiClient;
