import axios from 'axios';
import { tokenService } from './api/token.service';

// 1. TENTUKAN BASE URL SECARA DINAMIS
// Jika di Server (Window undefined) -> Pakai BACKEND_URL (IP VPS)
// Jika di Client (Browser) -> Pakai API_URL (/api/proxy)
const baseURL = typeof window === 'undefined'
  ? process.env.NEXT_PUBLIC_BACKEND_URL 
  : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Skip token for auth endpoints
    if (
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register')
    ) {
      return config;
    }

    // Only try to get token on client-side
    if (typeof window !== 'undefined') {
      const token = await tokenService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Logic refresh token hanya jalan di client side
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