import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '../session';
import api from '../axios';

export class ArticleCategoriesServerService {
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

  static async getAdminArticleCategories(filters: {
    page?: number;
    limit?: number;
    roles?: string;
    actives?: string;
    search?: string;
    sort?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();
      const response = await api.get('/articles/categories', {
        params: filters,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch article categories',
        data: {
          categories: [],
          total_categories: 0
        }
      };
    }
  }
}
