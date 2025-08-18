import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '../session';
import api from '../axios';

export class ArticlesServerService {
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

  static async getById(id: number) {
    try {
      const authConfig = await this.getAuthenticatedRequest();
      const response = await api.get(`/articles/${id}`, authConfig);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching article:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch article category'
      };
    }
  }

  static async getAdminArticles(filters: {
    page?: number;
    limit?: number;
    scope?: string;
    search?: string;
    categories?: string;
    sort?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/articles/search', {
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
}
