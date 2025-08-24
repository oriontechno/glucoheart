// BarStats.tsx (Server Component)
import { delay } from '@/constants/mock-api';
import { LineGraph } from '@/features/overview/components/line-graph';
import { OverviewServerService } from '@/lib/api/overview.server.service';

export default async function BarStats() {
  await delay(1000);
  const articlesGrowthResponse =
    await OverviewServerService.getArticlesGrowth();

  // Pass the data to LineGraph component
  return <LineGraph data={articlesGrowthResponse} />;
}
