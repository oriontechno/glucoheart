import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './discussions-tables/columns';
import { DiscussionsTable } from './discussions-tables';

import { DiscussionServerService } from '@/lib/api/discussion.server.service';
import { Discussion } from '@/types/chat';

type DiscussionsListingPageProps = {};

export default async function DiscussionsListingPage({}: DiscussionsListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('search');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(sort && { sort })
  };

  const data = await DiscussionServerService.getDiscussions(filters);
  const totalDiscussions = data.data.total_discussions;
  const discussions: Discussion[] = data.data.discussions;

  return (
    <DiscussionsTable
      data={discussions}
      totalItems={totalDiscussions}
      columns={columns}
    />
  );
}
