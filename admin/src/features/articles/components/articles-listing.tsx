import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './articles-tables/columns';
import { ArticlesTable } from './articles-tables';
import { fakeArticles } from '@/constants/mock-api';

import type { Article } from '@/constants/mock-api';
import { ArticlesServerService } from '@/lib/api/articles.server.service';

type ArticlesListingPageProps = {};

export default async function ArticlesListingPage({}: ArticlesListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('title');
  const pageLimit = searchParamsCache.get('perPage');
  const categories = searchParamsCache.get('category');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(categories && { category: categories }),
    ...(sort && { sort })
  };

  const data = await fakeArticles.getArticles(filters);
  const data2 = await ArticlesServerService.getAdminArticles(filters);
  console.log({ data2 });
  const totalArticles = data.total_articles;
  const articles: Article[] = data.articles;

  return (
    <ArticlesTable
      data={articles}
      totalItems={totalArticles}
      columns={columns}
    />
  );
}
