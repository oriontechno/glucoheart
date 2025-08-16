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

  static async getAdminArticles(filters: {
    page?: number;
    limit?: number;
    roles?: string;
    actives?: string;
    search?: string;
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
