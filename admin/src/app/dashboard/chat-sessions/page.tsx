import { Heading } from '@/components/ui/heading';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs';
import { Suspense } from 'react';
import ChatSessionsListing from '@/features/chat-sessions/components/chat-sessions-listing';

export const metadata = {
  title: 'Dashboard: Chat Sessions'
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: pageProps) {
  const searchParams = await props.searchParams;
  // Allow nested RSCs to access the search params (in a type-safe way)
  searchParamsCache.parse(searchParams);

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Fixed Header */}
      <div className='bg-background shrink-0 border-b p-4 md:px-6'>
        <Heading
          title='Chat Sessions'
          description='Monitor and manage chat sessions between users and healthcare professionals.'
        />
      </div>

      {/* Chat Content Area - Flexible Height */}
      <div className='max-h-[82vh] flex-1 overflow-hidden p-4 md:px-6'>
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={3} rowCount={6} filterCount={1} />
          }
        >
          <ChatSessionsListing />
        </Suspense>
      </div>
    </div>
  );
}
