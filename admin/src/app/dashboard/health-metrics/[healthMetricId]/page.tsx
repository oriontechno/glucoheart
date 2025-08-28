import FormCardSkeleton from '@/components/form-card-skeleton';
import PageContainer from '@/components/layout/page-container';
import HealthMetricsViewPage from '@/features/health-metrics/components/health-metrics-view-page';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard : Article View'
};

type PageProps = { params: Promise<{ healthMetricId: string }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  return (
    <PageContainer scrollable>
      <div className='flex-1 space-y-4'>
        <Suspense fallback={<FormCardSkeleton />}>
          <HealthMetricsViewPage healthMetricId={params.healthMetricId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
