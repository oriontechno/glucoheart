import { notFound } from 'next/navigation';
import DiscussionsForm from './discussions-form';
import { Discussion } from '@/types/chat';

type TDiscussionViewPageProps = {
  discussionId: number | string;
};

export default async function DiscussionsViewPage({
  discussionId
}: TDiscussionViewPageProps) {
  let discussion = null;
  let pageTitle = 'Create New Article';

  if (discussionId !== 'new') {
    try {
      // const data = await DiscussionsServerService.getDiscussionById(
      //   Number(discussionId)
      // );
      // if (data.success && data.data) {
      //   discussion = data.data as Discussion;
      //   pageTitle = `Edit Article`;
      // } else {
      //   notFound();
      // }
    } catch (error) {
      console.error('Error fetching article:', error);
      notFound();
    }
  }

  return <DiscussionsForm initialData={discussion} pageTitle={pageTitle} />;
}
