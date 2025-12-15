import axios from 'axios';
import { tokenService } from './api/token.service';

// LOGIC PENENTUAN BASE URL
const getBaseUrl = () => {
  // 1. Jika di Server (Server Side Rendering / API Routes)
  if (typeof window === 'undefined') {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    // Validasi: Server tidak boleh pakai Relative URL (/api/proxy)
    if (!backendUrl || backendUrl.startsWith('/')) {
      console.error('❌ FATAL: Server-side API call failed. NEXT_PUBLIC_BACKEND_URL must be an absolute URL (e.g. http://195...), but got:', backendUrl);
      // Fallback ke IP kalau ENV belum keload (Hardcoded safety net)
      return 'http://195.88.211.54';
    }
    return backendUrl;
  }

  // 2. Jika di Client (Browser)
  return process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return config;
    }
    if (typeof window !== 'undefined') {
      const token = await tokenService.getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      tokenService.clearToken();
      const newToken = await tokenService.refreshToken();
      if (newToken && error.config && !error.config._retry) {
        error.config._retry = true;
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }
      window.location.href = '/auth/sign-in';
    }
    return Promise.reject(error);
  }
);

export default api;