////////////////////////////////////////////////////////////////////////////////
// 🛑 Nothing in here has anything to do with Nextjs, it's just a fake database
////////////////////////////////////////////////////////////////////////////////

import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter'; // For filtering

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Define the shape of Product data
export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

// Mock product data store
export const fakeProducts = {
  records: [] as Product[], // Holds the list of product objects

  // Initialize with sample data
  initialize() {
    const sampleProducts: Product[] = [];
    function generateRandomProductData(id: number): Product {
      const categories = [
        'Electronics',
        'Furniture',
        'Clothing',
        'Toys',
        'Groceries',
        'Books',
        'Jewelry',
        'Beauty Products'
      ];

      return {
        id,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        created_at: faker.date
          .between({ from: '2022-01-01', to: '2023-12-31' })
          .toISOString(),
        price: parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 })),
        photo_url: `https://api.slingacademy.com/public/sample-products/${id}.png`,
        category: faker.helpers.arrayElement(categories),
        updated_at: faker.date.recent().toISOString()
      };
    }

    // Generate remaining records
    for (let i = 1; i <= 20; i++) {
      sampleProducts.push(generateRandomProductData(i));
    }

    this.records = sampleProducts;
  },

  // Get all products with optional category filtering and search
  async getAll({
    categories = [],
    search
  }: {
    categories?: string[];
    search?: string;
  }) {
    let products = [...this.records];

    // Filter products based on selected categories
    if (categories.length > 0) {
      products = products.filter((product) =>
        categories.includes(product.category)
      );
    }

    // Search functionality across multiple fields
    if (search) {
      products = matchSorter(products, search, {
        keys: ['name', 'description', 'category']
      });
    }

    return products;
  },

  // Get paginated results with optional category filtering and search
  async getProducts({
    page = 1,
    limit = 10,
    categories,
    search
  }: {
    page?: number;
    limit?: number;
    categories?: string;
    search?: string;
  }) {
    await delay(1000);
    const categoriesArray = categories ? categories.split('.') : [];
    const allProducts = await this.getAll({
      categories: categoriesArray,
      search
    });
    const totalProducts = allProducts.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message: 'Sample data for testing and learning purposes',
      total_products: totalProducts,
      offset,
      limit,
      products: paginatedProducts
    };
  },

  // Get a specific product by its ID
  async getProductById(id: number) {
    await delay(1000); // Simulate a delay

    // Find the product by its ID
    const product = this.records.find((product) => product.id === id);

    if (!product) {
      return {
        success: false,
        message: `Product with ID ${id} not found`
      };
    }

    // Mock current time
    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `Product with ID ${id} found`,
      product
    };
  }
};

// Define the shape of User data
export type User = {
  id: string; // UUID (PK)
  name: string;
  email: string;
  role: 'user' | 'super_admin';
  is_active: boolean;
  created_at: string;
};

// Mock user data store
export const fakeUsers = {
  records: [] as User[], // Holds the list of user objects

  // Initialize with sample data
  initialize() {
    const sampleUsers: User[] = [];
    function generateRandomUserData(id: number): User {
      const roles: ('user' | 'super_admin')[] = ['user', 'super_admin'];
      
      // Use deterministic seed for consistent IDs
      faker.seed(id * 100);
      
      return {
        id: `user-${id.toString().padStart(3, '0')}`, // Consistent ID format
        name: faker.person.fullName(),
        email: faker.internet.email(),
        role: faker.helpers.arrayElement(roles),
        is_active: faker.datatype.boolean(),
        created_at: faker.date
          .between({ from: '2022-01-01', to: '2023-12-31' })
          .toISOString()
      };
    }

    // Generate sample records
    for (let i = 1; i <= 15; i++) {
      sampleUsers.push(generateRandomUserData(i));
    }

    this.records = sampleUsers;
    
    // Reset faker seed to ensure other parts aren't affected
    faker.seed();
  },

  // Get all users with optional role filtering and search
  async getAll({
    roles = [],
    search
  }: {
    roles?: string[];
    search?: string;
  }) {
    let users = [...this.records];

    // Filter users based on selected roles
    if (roles.length > 0) {
      users = users.filter((user) =>
        roles.includes(user.role)
      );
    }

    // Search functionality across multiple fields
    if (search) {
      users = matchSorter(users, search, {
        keys: ['name', 'email', 'role']
      });
    }

    return users;
  },

  // Get paginated results with optional role filtering and search
  async getUsers({
    page = 1,
    limit = 10,
    roles,
    search,
    sort
  }: {
    page?: number;
    limit?: number;
    roles?: string;
    search?: string;
    sort?: string;
  }) {
    await delay(1000);
    const rolesArray = roles ? roles.split('.') : [];
    let allUsers = await this.getAll({
      roles: rolesArray,
      search
    });

    // Handle sorting
    if (sort) {
      try {
        const sortingParams = JSON.parse(sort);
        if (Array.isArray(sortingParams) && sortingParams.length > 0) {
          allUsers.sort((a, b) => {
            for (const sortParam of sortingParams) {
              const { id, desc } = sortParam;
              const aValue = a[id as keyof User];
              const bValue = b[id as keyof User];

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
              } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
              } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
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

    const totalUsers = allUsers.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message: 'Sample user data for testing and learning purposes',
      total_users: totalUsers,
      offset,
      limit,
      users: paginatedUsers
    };
  },

  // Get a specific user by ID
  async getUserById(id: string) {
    await delay(1000); // Simulate a delay

    // Find the user by ID
    const user = this.records.find((user) => user.id === id);

    if (!user) {
      return {
        success: false,
        message: `User with ID ${id} not found`
      };
    }

    // Mock current time
    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `User with ID ${id} found`,
      user
    };
  }
};

// Initialize sample products
fakeProducts.initialize();
// Initialize sample users
fakeUsers.initialize();

