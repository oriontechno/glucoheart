import { DiscussionThread, fakeDiscussionThreads } from '@/constants/mock-api';
import { notFound } from 'next/navigation';
import DiscussionThreadsForm from './discussion-threads-form';

type TDiscussionThreadsViewPageProps = {
  discussionThreadId: string;
};

export default async function DiscussionThreadsViewPage({
  discussionThreadId
}: TDiscussionThreadsViewPageProps) {
  let discussionThread = null;
  let pageTitle = 'Create New Discussion Thread';

  if (discussionThreadId !== 'new') {
    try {
      const data =
        await fakeDiscussionThreads.getDiscussionThreadById(discussionThreadId);

      if (data.success && data.discussionThread) {
        discussionThread = data.discussionThread as DiscussionThread;
        pageTitle = `Edit Discussion Thread`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching discussion thread:', error);
      notFound();
    }
  }

  return (
    <DiscussionThreadsForm
      initialData={discussionThread}
      pageTitle={pageTitle}
    />
  );
}
