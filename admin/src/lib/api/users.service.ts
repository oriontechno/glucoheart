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
    const response = await api.get('/users');
    return response.data;
  }
};
