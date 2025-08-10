import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Define the shape of ArticleCategory data
export type ArticleCategory = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

// Mock article data store
export const fakeArticleCategories = {
  records: [] as ArticleCategory[], // Holds the list of article objects

  // Initialize with sample data
  initialize() {
    const sampleArticleCategories: ArticleCategory[] = [];
    function generateRandomArticleData(id: number): ArticleCategory {
      // Use deterministic seed for consistent data
      faker.seed(id * 100);

      return {
        id: id, // Use number type for id
        name: faker.vehicle.model(),
        created_at: faker.date
          .between({ from: '2022-01-01', to: '2023-12-31' })
          .toISOString(),
        updated_at: faker.date
          .between({ from: '2023-01-01', to: '2024-12-31' })
          .toISOString()
      };
    }

    // Generate sample records
    for (let i = 1; i <= 5; i++) {
      sampleArticleCategories.push(generateRandomArticleData(i));
    }

    this.records = sampleArticleCategories;

    // Reset faker seed to ensure other parts aren't affected
    faker.seed();
  },

  // Get all ArticleCategories with optional category filtering and search
  async getAll({
    category = [],
    search
  }: {
    category?: string[];
    search?: string;
  }) {
    let ArticleCategories = [...this.records];

    // Filter ArticleCategories based on selected categories
    if (category.length > 0) {
      ArticleCategories = ArticleCategories.filter((article) =>
        category.includes(article.name)
      );
    }

    // Search functionality across multiple fields
    if (search) {
      ArticleCategories = matchSorter(ArticleCategories, search, {
        keys: ['name']
      });
    }

    return ArticleCategories;
  },

  // Get paginated results with optional role filtering and search
  async getArticleCategories({
    page = 1,
    limit = 10,
    category,
    search,
    sort
  }: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
  }) {
    await delay(1000);

    const categoryArray = category ? category.split('.') : [];
    let allArticleCategories = await this.getAll({
      category: categoryArray,
      search
    });

    // Handle sorting
    if (sort) {
      try {
        const sortingParams = JSON.parse(sort);
        if (Array.isArray(sortingParams) && sortingParams.length > 0) {
          allArticleCategories.sort((a, b) => {
            for (const sortParam of sortingParams) {
              const { id, desc } = sortParam;
              const aValue = a[id as keyof ArticleCategory];
              const bValue = b[id as keyof ArticleCategory];

              if (aValue === null || aValue === undefined) return desc ? -1 : 1;
              if (bValue === null || bValue === undefined) return desc ? 1 : -1;

              let comparison = 0;
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                // Special handling for date strings
                if (id === 'created_at') {
                  const aDate = new Date(aValue);
                  const bDate = new Date(bValue);
                  comparison = aDate.getTime() - bDate.getTime();
                } else {
                  comparison = aValue.localeCompare(bValue);
                }
              } else if (
                typeof aValue === 'number' &&
                typeof bValue === 'number'
              ) {
                comparison = aValue - bValue;
              } else if (
                typeof aValue === 'boolean' &&
                typeof bValue === 'boolean'
              ) {
                comparison = Number(aValue) - Number(bValue);
              } else {
                comparison = String(aValue).localeCompare(String(bValue));
              }

              if (comparison !== 0) {
                return desc ? -comparison : comparison;
              }
            }
            return 0;
          });
        }
      } catch (error) {
        console.warn('Invalid sort parameter:', sort);
      }
    }

    const totalArticleCategories = allArticleCategories.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedArticleCategories = allArticleCategories.slice(
      offset,
      offset + limit
    );

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message: 'Sample article data for testing and learning purposes',
      totalArticleCategories: totalArticleCategories,
      offset,
      limit,
      ArticleCategories: paginatedArticleCategories
    };
  },

  // Get a specific article category by ID
  async getArticleCategoryById(id: number) {
    await delay(1000); // Simulate a delay

    // Find the article category by ID
    const articleCategory = this.records.find((category) => category.id === id);

    if (!articleCategory) {
      return {
        success: false,
        message: `ArticleCategory with ID ${id} not found`
      };
    }

    // Mock current time
    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `ArticleCategory with ID ${id} found`,
      articleCategory
    };
  }
};

// Initialize sample ArticleCategories
fakeArticleCategories.initialize();
