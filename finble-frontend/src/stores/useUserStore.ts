import { create } from 'zustand';
import { getMyInfo } from '../api/user'; // getMyInfo 함수를 import 합니다.

// Helper to decode JWT
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// 백엔드의 UserInfoResponse 와 유사한 타입을 정의합니다.
interface UserInfo {
  userId: string; // Add userId field
  email: string;
  name: string;
  nickname: string;
  icon: string | null; // Add icon field
  // 필요에 따라 level, rank 등 다른 정보 추가
}

interface UserState {
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
  fetchUserInfo: () => Promise<void>; // fetchUserInfo 함수 타입을 추가합니다.
  initializeUserFromLocalStorage: () => void; // 새로 추가된 액션
}

export const useUserStore = create<UserState>((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
  // localStorage에서 사용자 정보를 초기화하는 함수
  initializeUserFromLocalStorage: () => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      set({ userInfo: null });
      return;
    }

    try {
      const decodedToken = parseJwt(token);
      if (decodedToken && decodedToken.id) {
        // 토큰에서 얻을 수 있는 정보만으로 userInfo를 초기화
        // 실제 이름, 닉네임, 아이콘 등은 getMyInfo를 통해 가져와야 함
        // 여기서는 최소한의 정보만 복원하여 userInfo가 null이 아니도록 함
        set({ 
          userInfo: {
            userId: String(decodedToken.id),
            email: decodedToken.email || '',
            name: decodedToken.name || '',
            nickname: decodedToken.nickname || '',
            icon: decodedToken.icon || null,
          }
        });
      } else {
        localStorage.removeItem('jwt');
        set({ userInfo: null });
      }
    } catch (error) {
      console.error('Failed to initialize user from local storage:', error);
      localStorage.removeItem('jwt');
      set({ userInfo: null });
    }
  },
  // 사용자 정보를 가져오는 fetchUserInfo 함수를 구현합니다.
  fetchUserInfo: async () => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      set({ userInfo: null });
      return; // No token, no user
    }

    try {
      const decodedToken = parseJwt(token);
      const apiResponse = await getMyInfo();

      if (decodedToken && decodedToken.id && apiResponse) {
        const userInfo: UserInfo = {
          userId: String(decodedToken.id),
          email: apiResponse.email,
          name: apiResponse.name || apiResponse.nickname,
          nickname: apiResponse.nickname,
          icon: apiResponse.icon,
        };
        set({ userInfo });
      } else {
        console.error("Failed to get user info from token or API", { decodedToken, apiResponse });
        set({ userInfo: null });
      }
    } catch (error) {
      console.error('사용자 정보를 가져오는데 실패했습니다.', error);
      set({ userInfo: null });
    }
  },
}));