import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Define the shape of Article data
export type Article = {
  id: number; // UUID (PK)
  title: string;
  content: string;
  category: 'kardiovaskular' | 'hipertensi';
  image_url: string;
  created_at: string;
  updated_at: string;
};

// Mock article data store
export const fakeArticles = {
  records: [] as Article[], // Holds the list of article objects

  // Initialize with sample data
  initialize() {
    const sampleArticles: Article[] = [];
    function generateRandomArticleData(id: number): Article {
      const categories: ('kardiovaskular' | 'hipertensi')[] = [
        'kardiovaskular',
        'hipertensi'
      ];

      // Use deterministic seed for consistent data
      faker.seed(id * 100);

      return {
        id: id, // Use number type for id
        title: faker.lorem.sentence({ min: 4, max: 8 }),
        content: faker.lorem.paragraphs(3, '\n\n'),
        category: faker.helpers.arrayElement(categories),
        image_url: `https://api.slingacademy.com/public/sample-products/${id}.png`,
        created_at: faker.date
          .between({ from: '2022-01-01', to: '2023-12-31' })
          .toISOString(),
        updated_at: faker.date
          .between({ from: '2023-01-01', to: '2024-12-31' })
          .toISOString()
      };
    }

    // Generate sample records
    for (let i = 1; i <= 15; i++) {
      sampleArticles.push(generateRandomArticleData(i));
    }

    this.records = sampleArticles;

    // Reset faker seed to ensure other parts aren't affected
    faker.seed();
  },

  // Get all articles with optional category filtering and search
  async getAll({
    category = [],
    search
  }: {
    category?: string[];
    search?: string;
  }) {
    let articles = [...this.records];

    // Filter articles based on selected categories
    if (category.length > 0) {
      articles = articles.filter((article) =>
        category.includes(article.category)
      );
    }

    // Search functionality across multiple fields
    if (search) {
      articles = matchSorter(articles, search, {
        keys: ['title', 'content', 'category']
      });
    }

    return articles;
  },

  // Get paginated results with optional role filtering and search
  async getArticles({
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
    let allArticles = await this.getAll({
      category: categoryArray,
      search
    });

    // Handle sorting
    if (sort) {
      try {
        const sortingParams = JSON.parse(sort);
        if (Array.isArray(sortingParams) && sortingParams.length > 0) {
          allArticles.sort((a, b) => {
            for (const sortParam of sortingParams) {
              const { id, desc } = sortParam;
              const aValue = a[id as keyof Article];
              const bValue = b[id as keyof Article];

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

    const totalArticles = allArticles.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedArticles = allArticles.slice(offset, offset + limit);

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message: 'Sample article data for testing and learning purposes',
      total_articles: totalArticles,
      offset,
      limit,
      articles: paginatedArticles
    };
  },

  // Get a specific article by ID
  async getArticleById(id: number) {
    await delay(1000); // Simulate a delay

    // Find the article by ID
    const article = this.records.find((article) => article.id === id);

    if (!article) {
      return {
        success: false,
        message: `Article with ID ${id} not found`
      };
    }

    // Mock current time
    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `Article with ID ${id} found`,
      article
    };
  }
};

// Initialize sample articles
fakeArticles.initialize();
