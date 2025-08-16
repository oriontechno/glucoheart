import axios from 'axios';
import { tokenService } from './api/token.service';
import { config } from '@/config/env';

const api = axios.create({
  baseURL: `${config.API_URL}`,
  headers: {}
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  async (config) => {
    // Skip token for auth endpoints to avoid circular calls
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

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      tokenService.clearToken();

      // Only try to refresh token on client-side
      if (typeof window !== 'undefined') {
        // Try to refresh token once
        const newToken = await tokenService.refreshToken();
        if (newToken && error.config && !error.config._retry) {
          error.config._retry = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }

        // If refresh failed, redirect to login
        window.location.href = '/auth/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

// Remove the getTokenFromSession function since we're using tokenService now

export default api;
