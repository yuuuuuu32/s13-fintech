import { create } from 'zustand';

// 백엔드의 UserInfoResponse 와 유사한 타입을 정의합니다.
interface UserInfo {
  email: string;
  name: string;
  nickname: string;
  // 필요에 따라 level, rank 등 다른 정보 추가
}

interface UserState {
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
}));
