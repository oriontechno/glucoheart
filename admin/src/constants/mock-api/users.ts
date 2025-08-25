////////////////////////////////////////////////////////////////////////////////
// 🛑 User Mock API - Fake database for users
////////////////////////////////////////////////////////////////////////////////

import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
    search,
    actives
  }: {
    roles?: string[];
    search?: string;
    actives?: string[];
  }) {
    let users = [...this.records];

    // Filter users based on selected roles
    if (roles.length > 0) {
      users = users.filter((user) => roles.includes(user.role));
    }

    if (actives && actives.length > 0) {
      users = users.filter((user) => actives.includes(String(user.is_active)));
    }

    // Search functionality across multiple fields
    if (search) {
      users = matchSorter(users, search, {
        keys: ['name', 'email', 'roles']
      });
    }

    return users;
  },

  // Get paginated results with optional role filtering and search
  async getUsers({
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
  }) {
    await delay(1000);
    const rolesArray = roles ? roles.split('.') : [];
    const activesArray = actives ? actives.split('.') : [];
    let allUsers = await this.getAll({
      roles: rolesArray,
      actives: activesArray,
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

// Initialize sample users
fakeUsers.initialize();
