import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import api from '@/lib/axios';

export class UsersServerService {
  private static async getAuthenticatedRequest() {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.access_token) {
      throw new Error('Not authenticated');
    }

    return {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    };
  }

  static async getUsers(filters: {
    page?: number;
    limit?: number;
    roles?: string;
    actives?: string;
    search?: string;
    sort?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/users', {
        params: filters,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch users',
        data: {
          users: [],
          total_users: 0
        }
      };
    }
  }

  static async getUserById(id: string) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get(`/users/${id}`, authConfig);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch user',
        data: null
      };
    }
  }

  static async createUser(userData: any) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.post('/users', userData, authConfig);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error.message || 'Failed to create user',
        data: null
      };
    }
  }

  static async updateUser(id: string, userData: any) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.put(`/users/${id}`, userData, authConfig);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user',
        data: null
      };
    }
  }

  static async deleteUser(id: string) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.delete(`/users/${id}`, authConfig);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete user',
        data: null
      };
    }
  }
}
