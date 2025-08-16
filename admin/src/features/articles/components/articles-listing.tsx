import { searchParamsCache } from '@/lib/searchparams';
import { createArticleColumnsConfig } from '@/lib/columns/article-columns';
import { ArticlesTable } from './articles-tables';

import type { Article } from '@/constants/mock-api';
import { ArticlesServerService } from '@/lib/api/articles.server.service';
import { ArticleCategoriesServerService } from '@/lib/api/articles-categories.server.service';

type ArticlesListingPageProps = {};

export default async function ArticlesListingPage({}: ArticlesListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('title');
  const pageLimit = searchParamsCache.get('perPage');
  const categories = searchParamsCache.get('categories');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    scope: 'admin',
    ...(search && { search }),
    ...(categories && { categories: categories }),
    ...(sort && { sort })
  };

  const categoryResponse =
    await ArticleCategoriesServerService.getAdminArticleCategories({});

  // Format categories for column options
  let categoryOptions: Array<{ value: string; label: string }> = [];

  if (categoryResponse.success && categoryResponse.data) {
    // The backend returns categories array directly, not wrapped in { categories: [...] }
    const categories = Array.isArray(categoryResponse.data)
      ? categoryResponse.data
      : categoryResponse.data.categories || categoryResponse.data;

    if (Array.isArray(categories)) {
      categoryOptions = categories.map((category: any) => ({
        value:
          category.slug || category.name || category.id || String(category),
        label: category.name
          ? category.name.charAt(0).toUpperCase() + category.name.slice(1)
          : category.slug || category.id || String(category)
      }));
    }
  }

  // Create server-safe column config (no client components)
  const columnsConfig = createArticleColumnsConfig(categoryOptions);

  const data = await ArticlesServerService.getAdminArticles(filters);
  const totalArticles = data.data.total_articles;
  const articles: Article[] = data.data.articles;

  return (
    <ArticlesTable
      data={articles}
      totalItems={totalArticles}
      columnsConfig={columnsConfig}
    />
  );
}
