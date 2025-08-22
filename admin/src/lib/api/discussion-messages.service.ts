import api from '../axios';

export class DiscussionMessagesService {
  static async getDiscussionMessages(discussionId: number) {
    try {
      const response = await api.get(
        `/discussion/rooms/${discussionId}/messages`
      );

      return {
        success: true,
        messages: response.data.messages || response.data.response || [],
        total: response.data.total || response.data.messages?.length || 0
      };
    } catch (error: any) {
      console.error('Error fetching discussion messages:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch discussion messages',
        messages: [],
        total: 0
      };
    }
  }

  static async sendDiscussionMessage(discussionId: number, content: string) {
    try {
      const response = await api.post(
        `/discussion/rooms/${discussionId}/message`,
        {
          content
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending discussion message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }
}

export const discussionMessagesService = new DiscussionMessagesService();
