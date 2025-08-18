import {
  ArticleCategory,
  fakeArticleCategories
} from '@/constants/mock-api/article-categories';
import { notFound } from 'next/navigation';
import ArticleCategoriesForm from './article-categories-form';
import { articleCategoriesService } from '@/lib/api/article-categories.service';
import { ArticleCategoriesServerService } from '@/lib/api/articles-categories.server.service';

type TArticleCategoryViewPageProps = {
  articleCategoryId: number | string;
};

export default async function ArticleCategoriesViewPage({
  articleCategoryId
}: TArticleCategoryViewPageProps) {
  let articleCategory = null;
  let pageTitle = 'Create New Article';

  if (articleCategoryId !== 'new') {
    try {
      const data = await ArticleCategoriesServerService.getArticleCategoryById(
        Number(articleCategoryId)
      );

      if (data.success && data.data) {
        articleCategory = data.data as ArticleCategory;
        pageTitle = `Edit Article`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      notFound();
    }
  }

  return (
    <ArticleCategoriesForm
      initialData={articleCategory}
      pageTitle={pageTitle}
    />
  );
}
