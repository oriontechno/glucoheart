import { notFound } from 'next/navigation';
import ArticlesForm from './articles-form';
import { Article } from '@/types/entity';
import { articlesService } from '@/lib/api/articles.service';
import { ArticlesServerService } from '@/lib/api/articles.server.service';

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
      const data = await ArticlesServerService.getById(Number(articleId));

      if (data.success && data.data) {
        article = data.data as Article;
        console.log({ article });
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
