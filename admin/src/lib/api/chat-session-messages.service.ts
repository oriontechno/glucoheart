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
  }
};
