import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import DiscussionThreadsViewPage from '@/features/discussion-threads/components/discussion-threads-view-page';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard : Article View'
};

type PageProps = { params: Promise<{ discussionThreadId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <DiscussionThreadsViewPage
            discussionThreadId={params.discussionThreadId}
          />
        </Suspense>
      </div>
    </PageContainer>
  );
}
