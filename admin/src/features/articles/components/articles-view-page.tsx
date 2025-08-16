import { notFound } from 'next/navigation';
import { Article, fakeArticles } from '@/constants/mock-api';
import ArticlesForm from './articles-form';

type TArticleViewPageProps = {
  articleId: string;
};

export default async function ArticlesViewPage({
  articleId
}: TArticleViewPageProps) {
  let article = null;
  let pageTitle = 'Create New Article';

  if (articleId !== 'new') {
    try {
      const data = await fakeArticles.getArticleById(Number(articleId));

      if (data.success && data.article) {
        article = data.article as Article;
        pageTitle = `Edit Article`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      notFound();
    }
  }

  return <ArticlesForm initialData={article} pageTitle={pageTitle} />;
}
