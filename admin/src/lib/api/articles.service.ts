import api from '../axios';

export const articlesService = {
  getArticles: async ({
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
    const response = await api.get('/articles/search', {
      params: {
        page,
        limit,
        roles,
        actives,
        search,
        sort
      }
    });
    return response.data;
  }
};
