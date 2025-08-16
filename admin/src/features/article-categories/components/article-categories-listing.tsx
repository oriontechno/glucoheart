import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './article-categories-tables/columns';
import { ArticleCategoriesTable } from './article-categories-tables';
import { fakeArticleCategories } from '@/constants/mock-api';

import { ArticleCategoriesServerService } from '@/lib/api/articles-categories.server.service';
import { ArticleCategory } from '@/types/entity';

type ArticleCategoriesListingPageProps = {};

export default async function ArticleCategoriesListingPage({}: ArticleCategoriesListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('title');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(sort && { sort })
  };

  const data =
    await ArticleCategoriesServerService.getAdminArticleCategories(filters);
  const totalArticleCategories = data.data.total_article_categories;
  const ArticleCategories: ArticleCategory[] = data.data;

  return (
    <ArticleCategoriesTable
      data={ArticleCategories}
      totalItems={totalArticleCategories}
      columns={columns}
    />
  );
}
