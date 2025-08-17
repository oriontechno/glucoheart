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
  },

  getArticleCategoryById: async (id: number) => {
    try {
      const response = await api.get(`/articles/categories/${id}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch article category.');
      throw new Error('Failed to fetch article category.');
    }
  },

  delete: async (id: number) => {
    try {
      await api.delete(`/articles/categories/${id}`);
      toast.success('Category deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete category.');
      throw new Error('Failed to delete category.');
    }
  }
};
