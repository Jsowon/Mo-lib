import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 환경변수 로드 (여러 방법 시도)
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'http://43.200.172.193:8000'; // fallback

// 디버깅: 환경변수 로드 확인
console.log('🌐 [API Client Init] BASE_URL:', BASE_URL);
console.log('🌐 [API Client Init] process.env.EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
console.log('🌐 [API Client Init] Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

// Platform-aware storage helpers
const getToken = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const deleteToken = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 검색용 별도 axios 인스턴스 (baseURL: 루트 / - /api/v1 없음)
export const searchClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰 자동 주입 + 디버깅
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 디버깅 로그
  console.log('🚀 [API Request]', config.method?.toUpperCase(), config.url);
  console.log('📍 Full URL:', `${config.baseURL}${config.url}`);
  console.log('📦 Request data:', config.data);
  console.log('🔑 Has token:', !!token);

  return config;
});

// searchClient 요청 인터셉터 (토큰 자동 주입 + 디버깅)
searchClient.interceptors.request.use(async (config) => {
  const token = await getToken('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log('🔍 [Search Request]', config.method?.toUpperCase(), config.url);
  console.log('📍 Full URL:', `${config.baseURL}${config.url}`);
  console.log('🔑 Has token:', !!token);

  return config;
});

// 응답 인터셉터: 401 처리 + 에러 파싱 + 디버깅
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ [API Response]', response.config.method?.toUpperCase(), response.config.url);
    console.log('📥 Status:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ [API Error]', error.config?.method?.toUpperCase(), error.config?.url);
    console.error('📥 Status:', error.response?.status);
    console.error('📄 Error data:', error.response?.data);
    console.error('🔧 Error code:', error.code);
    console.error('🔧 Error message:', error.message);

    if (error.response?.status === 401) {
      await deleteToken('access_token');
      // navigate는 authStore에서 처리 (아래 참고)
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().clearAuth();
    }

    // 422 유효성 에러 메시지 파싱
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((d: { msg: string }) => d.msg).join(', ');
        return Promise.reject(new Error(messages));
      }
    }

    return Promise.reject(error);
  }
);

// searchClient 응답 인터셉터 (401 처리 + 에러 파싱)
searchClient.interceptors.response.use(
  (response) => {
    console.log('✅ [Search Response]', response.config.method?.toUpperCase(), response.config.url);
    console.log('📥 Status:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ [Search Error]', error.config?.method?.toUpperCase(), error.config?.url);
    console.error('📥 Status:', error.response?.status);
    console.error('📄 Error data:', error.response?.data);

    if (error.response?.status === 401) {
      await deleteToken('access_token');
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().clearAuth();
    }

    if (error.response?.status === 422) {
      const detail = error.response.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((d: { msg: string }) => d.msg).join(', ');
        return Promise.reject(new Error(messages));
      }
    }

    return Promise.reject(error);
  }
);
