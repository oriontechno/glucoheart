import { toast } from 'sonner';
import api from '../axios';

export const articlesService = {
  getArticles: async ({
    page = 1,
    limit = 10,
    roles,
    actives,
    search,
    sort
  }: {
    page?: number;
    limit?: number;
    roles?: string;
    actives?: string;
    search?: string;
    sort?: string;
  }) => {
    const response = await api.get('/articles/search', {
      params: {
        page,
        limit,
        roles,
        actives,
        search,
        sort
      }
    });
    return response.data;
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/articles/${id}`);
      response.data;
      toast.success('Article deleted successfully');
    } catch (error) {
      toast.error('Failed to delete article');
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post('/articles', data);
      toast.success('Article created successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to create article');
      throw error;
    }
  }
};
