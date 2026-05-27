import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  accessToken: string | null;
  nickname: string | null;
  email: string | null; // 추가
  isLoggedIn: boolean;

  setAuth: (token: string, nickname: string, email: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  nickname: null,
  email: null, // 추가
  isLoggedIn: false,

  setAuth: async (token, nickname, email) => {
    await SecureStore.setItemAsync("access_token", token);
    await SecureStore.setItemAsync("nickname", nickname);
    await SecureStore.setItemAsync("email", email); // 추가
    set({ accessToken: token, nickname, email, isLoggedIn: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("nickname");
    await SecureStore.deleteItemAsync("email"); // 추가
    set({ accessToken: null, nickname: null, email: null, isLoggedIn: false });
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    const nickname = await SecureStore.getItemAsync("nickname");
    const email = await SecureStore.getItemAsync("email"); // 추가
    if (token && nickname) {
      set({ accessToken: token, nickname, email, isLoggedIn: true });
    }
  },
}));
