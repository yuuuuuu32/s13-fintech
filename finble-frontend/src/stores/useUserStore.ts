import { create } from 'zustand';
import { getMyInfo } from '../api/user'; // getMyInfo 함수를 import 합니다.

// 백엔드의 UserInfoResponse 와 유사한 타입을 정의합니다.
interface UserInfo {
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
}

export const useUserStore = create<UserState>((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
  // 사용자 정보를 가져오는 fetchUserInfo 함수를 구현합니다.
  fetchUserInfo: async () => {
    try {
      const userInfo = await getMyInfo();
      set({ userInfo });
    } catch (error) {
      console.error('사용자 정보를 가져오는데 실패했습니다.', error);
      // 필요하다면 에러 처리 로직을 추가할 수 있습니다.
      // 예: set({ userInfo: null }); 또는 특정 에러 상태를 관리
    }
  },
}));