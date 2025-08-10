import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import ArticleCategoriesViewPage from '@/features/article-categories/components/article-categories-view-page';
import ArticlesViewPage from '@/features/articles/components/articles-view-page';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard : Article View'
};

type PageProps = { params: Promise<{ articleCategoryId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <ArticleCategoriesViewPage
            articleCategoryId={params.articleCategoryId}
          />
        </Suspense>
      </div>
    </PageContainer>
  );
}
