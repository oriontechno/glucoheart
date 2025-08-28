import { articleCategoriesService } from '@/lib/api/article-categories.service';
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

        const response = await articleCategoriesService.getAll();
        setCategories(response.categories);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch categories'
        );
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
