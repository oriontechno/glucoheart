import { fakeArticleCategories } from '@/constants/mock-api';
import api from '../axios';

export const articleCategoriesService = {
  getAll: async () => {
    try {
      const response = await api.get('/articles/categories');
      return response.data;
    } catch (error) {
      console.error('API call failed, falling back to mock data:', error);
      // Fallback to mock data if API fails
      const categories = await fakeArticleCategories.getAll({});
      return categories;
    }
  }
};

// Helper function to ensure categories are available and convert to options format
const formatCategoriesAsOptions = (categories: any[]) => {
  return categories.map((category) => ({
    value: category.name,
    label: category.name.charAt(0).toUpperCase() + category.name.slice(1)
  }));
};

// Server-side function for async operations
export const getArticleCategoriesFromMockData = async () => {
  try {
    // Use the proper getAll method from mock API
    const categories = await fakeArticleCategories.getAll({});
    return formatCategoriesAsOptions(categories);
  } catch (error) {
    // Fallback: ensure initialization and try again
    fakeArticleCategories.initialize();
    const categories = await fakeArticleCategories.getAll({});
    return formatCategoriesAsOptions(categories);
  }
};

// Server-side function for synchronous access
export const getArticleCategoriesSync = () => {
  try {
    // Ensure categories are initialized
    if (fakeArticleCategories.records.length === 0) {
      fakeArticleCategories.initialize();
    }
    return formatCategoriesAsOptions(fakeArticleCategories.records);
  } catch (error) {
    console.warn('Failed to get categories:', error);
    // Return empty array as fallback
    return [];
  }
};
