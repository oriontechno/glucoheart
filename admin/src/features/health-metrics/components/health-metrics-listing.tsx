import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './health-metrics-tables/columns';
import { HealthMetric } from '@/types/entity';
import { HealthMetricsTable } from './health-metrics-tables';
import { HealthMetricsServerService } from '@/lib/api/health-metrics.server.service';

type HealthMetricsListingPageProps = {};

export default async function HealthMetricsListingPage({}: HealthMetricsListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const userId = searchParamsCache.get('userId');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(userId && { userId }),
    ...(sort && { sort })
  };

  const data = await HealthMetricsServerService.getAdminHealthMetrics(filters);
  const totalHealthMetrics = data.data.total;
  const healthMetrics: HealthMetric[] = data.data.items;

  return (
    <HealthMetricsTable
      data={healthMetrics}
      totalItems={totalHealthMetrics}
      columns={columns}
    />
  );
}
