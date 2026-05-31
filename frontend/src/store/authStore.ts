import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Platform-aware storage helpers
const getToken = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const setToken = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const deleteToken = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

interface AuthState {
  accessToken: string | null;
  nickname: string | null;
  email: string | null;
  isLoggedIn: boolean;

  setAuth: (token: string, nickname: string, email: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  nickname: null,
  email: null,
  isLoggedIn: false,

  setAuth: async (token, nickname, email) => {
    await setToken("access_token", token);
    await setToken("nickname", nickname);
    await setToken("email", email);
    set({ accessToken: token, nickname, email, isLoggedIn: true });
  },

  clearAuth: async () => {
    await deleteToken("access_token");
    await deleteToken("nickname");
    await deleteToken("email");
    set({ accessToken: null, nickname: null, email: null, isLoggedIn: false });
  },

  hydrate: async () => {
    const token = await getToken("access_token");
    const nickname = await getToken("nickname");
    const email = await getToken("email");
    if (token && nickname) {
      set({ accessToken: token, nickname, email, isLoggedIn: true });
    }
  },
}));
