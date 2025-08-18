import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '../session';
import api from '../axios';

export class ChatSessionsServerService {
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

  static async getChatSessions(
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
    } = {}
  ) {
    try {
      console.log('🔄 Fetching chat sessions...');
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get('/chat-sessions', {
        params: filters,
        ...authConfig
      });

      console.log('✅ Chat sessions fetched successfully');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch chat sessions:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch chat sessions',
        data: {
          sessions: [],
          total_sessions: 0
        }
      };
    }
  }

  static async getChatSessionMessages(sessionId: number) {
    try {
      console.log('🔄 Fetching messages for session:', sessionId);
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.get(`/chat-sessions/${sessionId}/messages`, {
        ...authConfig
      });

      console.log('✅ Messages fetched successfully');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch messages:', error);
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
      console.log('🔄 Sending message to session:', sessionId);
      const authConfig = await this.getAuthenticatedRequest();

      const response = await api.post(
        `/chat-sessions/${sessionId}/messages`,
        { content },
        authConfig
      );

      console.log('✅ Message sent successfully');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
        data: null
      };
    }
  }
}
