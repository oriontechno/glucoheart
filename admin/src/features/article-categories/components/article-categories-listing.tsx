import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './article-categories-tables/columns';
import { ArticleCategoriesTable } from './article-categories-tables';
import { fakeArticleCategories } from '@/constants/mock-api';

import type { Article, ArticleCategory } from '@/constants/mock-api';

type ArticleCategoriesListingPageProps = {};

export default async function ArticleCategoriesListingPage({}: ArticleCategoriesListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(sort && { sort })
  };

  const data = await fakeArticleCategories.getArticleCategories(filters);
  const totalArticleCategories = data.totalArticleCategories;
  const ArticleCategories: ArticleCategory[] = data.ArticleCategories;

  return (
    <ArticleCategoriesTable
      data={ArticleCategories}
      totalItems={totalArticleCategories}
      columns={columns}
    />
  );
}
