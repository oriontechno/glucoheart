import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '../session';
import api from '../axios';

export class DiscussionServerService {
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

  static async getCurrentUser() {
    try {
      const session = await getIronSession<SessionData>(
        await cookies(),
        sessionOptions
      );

      if (!session.isLoggedIn || !session.user) {
        return null;
      }

      return session.user;
    } catch (error) {
      console.error('Error getting current user from session:', error);
      return null;
    }
  }

  static async getAccessToken() {
    try {
      const session = await getIronSession<SessionData>(
        await cookies(),
        sessionOptions
      );

      if (!session.isLoggedIn || !session.access_token) {
        return '';
      }

      return session.access_token;
    } catch (error) {
      console.error('Error getting access token from session:', error);
      return '';
    }
  }

  static async getDiscussions(
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
    } = {}
  ) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/discussion/search', {
        params: filters,
        ...authConfig
      });

      return {
        success: true,
        data: {
          discussions:
            response.data.response || response.data.discussions || [],
          total_discussions:
            response.data.total_discussions ||
            response.data.response?.length ||
            0
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch discussions',
        data: {
          discussions: [],
          total_discussions: 0
        }
      };
    }
  }

  static async getDiscussionMessages(discussionId: number) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get(
        `/discussion/rooms/${discussionId}/messages`,
        {
          ...authConfig
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch discussion messages',
        data: {
          messages: []
        }
      };
    }
  }

  static async sendDiscussionMessage(discussionId: number, content: string) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.post(
        `/discussion/rooms/${discussionId}/message`,
        { content },
        authConfig
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send discussion message',
        data: null
      };
    }
  }

  static async getChatSessionMessages(sessionId: number) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get(`/chat-sessions/${sessionId}/messages`, {
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch messages',
        data: {
          messages: []
        }
      };
    }
  }

  static async sendMessage(sessionId: number, content: string) {
    try {
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.post(
        `/chat-sessions/${sessionId}/messages`,
        { content },
        authConfig
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send message',
        data: null
      };
    }
  }
}
