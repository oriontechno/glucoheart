import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './discussion-threads-tables/columns';
import { DiscussionThreadsTable } from './discussion-threads-tables';
import {
  DiscussionThread,
  fakeDiscussionThreads
} from '@/constants/mock-api/discussion-threads';

type DiscussionThreadsListingPageProps = {};

export default async function DiscussionThreadsListingPage({}: DiscussionThreadsListingPageProps) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('title');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(sort && { sort })
  };

  const data = await fakeDiscussionThreads.getDiscussionThreads(filters);
  const totalDiscussionThreads = data.totalDiscussionThreads;
  const discussionThreads: DiscussionThread[] = data.discussionThreads;

  return (
    <DiscussionThreadsTable
      data={discussionThreads}
      totalItems={totalDiscussionThreads}
      columns={columns}
    />
  );
}
