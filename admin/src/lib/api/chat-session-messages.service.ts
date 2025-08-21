import { config } from '@/config/env';
import api from '../axios';

export const chatSessionMessagesService = {
  getAdminSessionMessages: async (sessionId: number) => {
    try {
      const response = await api.get(
        `${config.API_URL}/chat/admin/sessions/${sessionId}/messages`
      );
      return response.data;
    } catch (error) {
      console.error({ error });
      throw error;
    }
  },

  // Client-side method to send message (will use axios interceptor for auth)
  sendAdminMessage: async (sessionId: number, content: string) => {
    try {
      const response = await api.post(
        `${config.API_URL}/chat/admin/sessions/${sessionId}/message`,
        { content }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          'Failed to send message'
      };
    }
  },

  // Assign nurse to chat session
  assignNurse: async (sessionId: number, nurseId: number) => {
    try {
      const response = await api.post(
        `${config.API_URL}/chat/session/${sessionId}/assign-nurse`,
        { nurseId }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error assigning nurse:', error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          'Failed to assign nurse'
      };
    }
  }
};
