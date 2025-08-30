import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import DiscussionsViewPage from '@/features/discussions/components/discussions-view-page';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard : Article View'
};

type PageProps = { params: Promise<{ discussionId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <DiscussionsViewPage discussionId={params.discussionId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
