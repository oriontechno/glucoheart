import { OverviewServerService } from '@/lib/api/overview.server.service';

export default async function OverviewPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Get search params for filtering
  const period = (searchParams.period as string) || 'all';
  const from = searchParams.from as string;
  const to = searchParams.to as string;

  // Fetch all counts data
  const overviewData = await OverviewServerService.getAllCounts({
    period,
    from,
    to
  });

  if (!overviewData.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error loading overview data</h3>
          <p className="text-sm text-muted-foreground">{overviewData.error}</p>
        </div>
      </div>
    );
  }

  const { users, articles, chatSessions, discussionRooms } = overviewData.data;

  // This is a parallel route layout, so we don't render content here
  // The actual content is rendered by the layout with parallel routes
  return null;
}
