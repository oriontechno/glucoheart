import { useState, useEffect } from 'react';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Replace with actual API call
        // const response = await api.get('/articles/categories/all');
        // setCategories(response.data);
        
        // Mock data for now
        const mockCategories: Category[] = [
          { id: 1, name: 'Health', slug: 'health', description: 'Health related articles' },
          { id: 2, name: 'Nutrition', slug: 'nutrition', description: 'Nutrition and diet articles' },
          { id: 3, name: 'Exercise', slug: 'exercise', description: 'Exercise and fitness articles' },
          { id: 4, name: 'Mental Health', slug: 'mental-health', description: 'Mental health and wellness' },
          { id: 5, name: 'Technology', slug: 'technology', description: 'Health technology articles' },
          { id: 6, name: 'Research', slug: 'research', description: 'Research and studies' },
        ];
        
        setCategories(mockCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Re-trigger useEffect
    }
  };
}
