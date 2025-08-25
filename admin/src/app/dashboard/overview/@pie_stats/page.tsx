import { delay } from '@/constants/mock-api';
import { PieGraph } from '@/features/overview/components/pie-graph';
import { OverviewServerService } from '@/lib/api/overview.server.service';

export default async function Stats() {
  await delay(1000);

  try {
    const pieData = await OverviewServerService.getArticlesPieByCategory({
      includeUncategorized: 'true'
    });

    return <PieGraph pieData={pieData.success ? pieData.data : null} />;
  } catch (error) {
    console.error('Error in pie stats page:', error);
    return <PieGraph pieData={null} />;
  }
}
