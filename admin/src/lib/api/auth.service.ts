import api from '@/lib/axios';
import { AxiosError } from 'axios';

interface SignInRequest {
  email: string;
  password: string;
}

interface SignInResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string;
  };
}

interface ErrorResponse {
  message: string;
  statusCode: number;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export const authService = {
  signIn: async (email: string, password: string): Promise<SignInResponse> => {
    try {
      const response = await api.post<SignInResponse>('/auth/login', {
        email,
        password
      });

      // Store token and user data
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Set default authorization header for future requests
        api.defaults.headers.common['Authorization'] =
          `Bearer ${response.data.access_token}`;
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        // Handle API validation errors
        if (error.response?.data) {
          throw {
            message: error.response.data.message || 'Login failed',
            statusCode: error.response.status,
            errors: error.response.data.errors || []
          } as ErrorResponse;
        }

        // Handle network/connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          throw {
            message: 'Unable to connect to server. Please try again later.',
            statusCode: 0,
            errors: []
          } as ErrorResponse;
        }
      }

      // Handle unknown errors
      throw {
        message: 'An unexpected error occurred. Please try again.',
        statusCode: 500,
        errors: []
      } as ErrorResponse;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Set authorization header for logout request
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await api.post('/auth/logout');
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage and headers
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  getCurrentUser: async (): Promise<SignInResponse['user']> => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token found');
      }

      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await api.get<SignInResponse['user']>('/auth/me');
      return response.data;
    } catch (error) {
      // Clear auth data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];

      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.message || 'Failed to get user info'
        );
      }
      throw error;
    }
  },

  // Initialize auth state (call this on app startup)
  initializeAuth: (): SignInResponse['user'] | null => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return JSON.parse(userData);
      }

      return null;
    } catch (error) {
      // Clear corrupted data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return null;
    }
  }
};
