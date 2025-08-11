import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import UsersViewPage from '@/features/users/components/users-view-page';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard : User View'
};

type PageProps = { params: Promise<{ userId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <UsersViewPage userId={params.userId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
