/**
 * Example usage of users service
 * This demonstrates how the client-side API calls work with automatic token handling
 */

import { usersService } from '@/lib/api/users.service';

// Example: Create a new user
export async function exampleCreateUser() {
  try {
    const newUser = await usersService.createUser({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: 'user'
    });

    return newUser;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

// Example: Update a user
export async function exampleUpdateUser(userId: string) {
  try {
    const updatedUser = await usersService.updateUser(userId, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: 'admin'
      // password is optional for updates
    });

    return updatedUser;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

// Example: Get user by ID
export async function exampleGetUser(userId: string) {
  try {
    const user = await usersService.getUserById(userId);
    return user;
  } catch (error) {
    console.error('Failed to get user:', error);
    throw error;
  }
}

// Example: Get users with filters
export async function exampleGetUsers() {
  try {
    const users = await usersService.getUsers({
      page: 1,
      limit: 10,
      search: 'john',
      roles: 'admin',
      sort: 'firstName'
    });

    return users;
  } catch (error) {
    console.error('Failed to get users:', error);
    throw error;
  }
}

// Example: Delete user
export async function exampleDeleteUser(userId: string) {
  try {
    const result = await usersService.deleteUser(userId);
    return result;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}
