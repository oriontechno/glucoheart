import { notFound } from 'next/navigation';
import DiscussionsForm from './discussions-form';
import { Discussion } from '@/types/chat';
import { DiscussionServerService } from '@/lib/api/discussion.server.service';

type TDiscussionViewPageProps = {
  discussionId: number | string;
};

export default async function DiscussionsViewPage({
  discussionId
}: TDiscussionViewPageProps) {
  let discussion = null;
  let pageTitle = 'Create New Discussion';

  if (discussionId !== 'new') {
    try {
      const data = await DiscussionServerService.getDiscussionById(
        Number(discussionId)
      );

      console.log({ data });

      if (data.success && data.data) {
        discussion = data.data as Discussion;
        pageTitle = `Edit Discussion`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching discussion:', error);
      notFound();
    }
  }

  return <DiscussionsForm initialData={discussion} pageTitle={pageTitle} />;
}
