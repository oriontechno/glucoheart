import api from '../axios';

export class DiscussionMessagesService {
  static async create(data: any) {
    try {
      const response = await api.post(`/discussion/rooms`, data);
    } catch (error) {}
  }

  static async getDiscussionMessages(discussionId: number) {
    try {
      const response = await api.get(
        `/discussion/rooms/${discussionId}/messages`
      );

      // Convert API response format to DiscussionMessage format
      const apiMessages = response.data || [];
      const convertedMessages = apiMessages.map((apiMessage: any) => ({
        id: apiMessage.id,
        discussion_id: apiMessage.roomId,
        user_id: apiMessage.senderId,
        content: apiMessage.content,
        created_at: apiMessage.createdAt,
        updated_at: apiMessage.createdAt, // API doesn't provide updated_at, use createdAt
        user: {
          id: apiMessage.senderId,
          firstName: apiMessage.senderName || 'Unknown',
          lastName: '',
          email: '',
          role: 'USER', // Default role, could be improved if API provides role info
          profilePicture: undefined
        }
      }));

      return {
        success: true,
        messages: convertedMessages,
        total: convertedMessages.length
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
