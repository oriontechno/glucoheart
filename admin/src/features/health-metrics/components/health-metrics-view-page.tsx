import { HealthMetric } from '@/types/entity';
import { notFound } from 'next/navigation';
import HealthMetricForm from './health-metrics-form';
import { HealthMetricsServerService } from '@/lib/api/health-metrics.server.service';

type THealthMetricViewPageProps = {
  healthMetricsId: number | string;
};

export default async function HealthMetricsViewPage({
  healthMetricsId
}: THealthMetricViewPageProps) {
  let healthMetrics = null;
  let pageTitle = 'Create New Health Metric';

  if (healthMetricsId !== 'new') {
    try {
      const data = await HealthMetricsServerService.getHealthMetricById(
        Number(healthMetricsId)
      );

      if (data.success && data.data) {
        healthMetrics = data.data as HealthMetric;
        pageTitle = `Edit Health Metric`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      notFound();
    }
  }

  return <HealthMetricForm initialData={healthMetrics} pageTitle={pageTitle} />;
}
