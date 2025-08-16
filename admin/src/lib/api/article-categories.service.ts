import { fakeArticleCategories } from '@/constants/mock-api';
import api from '../axios';
import { toast } from 'sonner';

export const articleCategoriesService = {
  getAll: async (filters?: { [key: string]: any }) => {
    try {
      const response = await api.get('/articles/categories', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('API call failed, falling back to mock data:', error);
      // Fallback to mock data if API fails
      const categories = await fakeArticleCategories.getAll({});
      return categories;
    }
  },

  create: async (data: { name: string; slug?: string }) => {
    try {
      const response = await api.post('/articles/categories', data);
      toast.success('Category created successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to create category.');
      throw new Error('Failed to create category.');
    }
  }
};
