import {
  ArticleCategory,
  fakeArticleCategories
} from '@/constants/mock-api/article-categories';
import { notFound } from 'next/navigation';
import ArticleCategoriesForm from './article-categories-form';

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
      const data = await fakeArticleCategories.getArticleCategoryById(
        Number(articleCategoryId)
      );

      if (data.success && data.articleCategory) {
        articleCategory = data.articleCategory as ArticleCategory;
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
