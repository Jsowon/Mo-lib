import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  accessToken: string | null;
  nickname: string | null;
  isLoggedIn: boolean;

  setAuth: (token: string, nickname: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  nickname: null,
  isLoggedIn: false,

  // 로그인 성공 시 호출
  setAuth: async (token, nickname) => {
    await SecureStore.setItemAsync('access_token', token);
    await SecureStore.setItemAsync('nickname', nickname);
    set({ accessToken: token, nickname, isLoggedIn: true });
  },

  // 로그아웃 or 401 시 호출
  clearAuth: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('nickname');
    set({ accessToken: null, nickname: null, isLoggedIn: false });
  },

  // 앱 시작 시 토큰 복원
  hydrate: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    const nickname = await SecureStore.getItemAsync('nickname');
    if (token && nickname) {
      set({ accessToken: token, nickname, isLoggedIn: true });
    }
  },
}));
