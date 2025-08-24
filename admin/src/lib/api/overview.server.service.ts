import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import api from '@/lib/axios';
import {
  OverviewApiResponse,
  CountResponse,
  ArticlesCountResponse
} from '@/types/overview';

export class OverviewServerService {
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

  static async getCountUsers(params?: {
    period?: string;
    from?: string;
    to?: string;
    roles?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/users/count', {
        params,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch users count:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch users count',
        data: { total: 0 }
      };
    }
  }

  static async getCountArticles(params?: {
    period?: string;
    from?: string;
    to?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/articles/count', {
        params,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch articles count:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch articles count',
        data: { articles: { total: 0 }, categories: { total: 0 } }
      };
    }
  }

  static async getCountChatSessions(params?: {
    period?: string;
    from?: string;
    to?: string;
    type?: string;
    assigned?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/chat/sessions/count', {
        params,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch chat sessions count:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch chat sessions count',
        data: { total: 0 }
      };
    }
  }

  static async getCountDiscussionRooms(params?: {
    period?: string;
    from?: string;
    to?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/discussion/rooms/count', {
        params,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to fetch discussion rooms count:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch discussion rooms count',
        data: { total: 0 }
      };
    }
  }

  static async getAllCounts(params?: {
    period?: string;
    from?: string;
    to?: string;
  }): Promise<OverviewApiResponse> {
    try {
      // Fetch all counts in parallel
      const [
        usersCount,
        articlesCount,
        chatSessionsCount,
        discussionRoomsCount
      ] = await Promise.allSettled([
        this.getCountUsers(params),
        this.getCountArticles(params),
        this.getCountChatSessions(params),
        this.getCountDiscussionRooms(params)
      ]);

      return {
        success: true,
        data: {
          users:
            usersCount.status === 'fulfilled'
              ? usersCount.value.data
              : { total: 0 },
          articles:
            articlesCount.status === 'fulfilled'
              ? articlesCount.value.data
              : { articles: { total: 0 }, categories: { total: 0 } },
          chatSessions:
            chatSessionsCount.status === 'fulfilled'
              ? chatSessionsCount.value.data
              : { total: 0 },
          discussionRooms:
            discussionRoomsCount.status === 'fulfilled'
              ? discussionRoomsCount.value.data
              : { total: 0 }
        }
      };
    } catch (error: any) {
      console.error('Failed to fetch overview counts:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch overview counts',
        data: {
          users: { total: 0 },
          articles: { articles: { total: 0 }, categories: { total: 0 } },
          chatSessions: { total: 0 },
          discussionRooms: { total: 0 }
        }
      };
    }
  }
}
