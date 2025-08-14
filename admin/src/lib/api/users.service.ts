import api from '../axios';

export const usersService = {
  getUsers: async ({
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
  }) => {
    const response = await api.get('/users', {
      params: { page, limit, roles, actives, search, sort }
    });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
  }) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (
    id: string,
    userData: {
      firstName: string;
      lastName: string;
      email: string;
      password?: string;
      role: string;
    }
  ) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};
