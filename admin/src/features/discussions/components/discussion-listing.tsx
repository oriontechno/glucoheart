import { searchParamsCache } from '@/lib/searchparams';
import DiscussionsLayout from './discussion-layout';
import { ChatUser, Discussion } from '@/types/chat';
import { DiscussionServerService } from '@/lib/api/discussion.server.service';

export default async function DiscussionListing() {
  // Get search params
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

  // Fetch data dari API
  const discussionsResponse =
    await DiscussionServerService.getDiscussions(filters);

  let discussions: Discussion[] = [];

  if (discussionsResponse.success && discussionsResponse.data.discussions) {
    // Data API sudah sesuai dengan format Discussion interface
    discussions = discussionsResponse.data.discussions;
  }

  // Get current user from iron session
  const sessionUser = await DiscussionServerService.getCurrentUser();

  // Jika tidak ada user di session, redirect atau throw error
  if (!sessionUser) {
    throw new Error('User session not found. Please login again.');
  }

  // Get access token for websocket
  const accessToken = await DiscussionServerService.getAccessToken();

  const currentUser: ChatUser = {
    id: sessionUser.id,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName || '',
    email: sessionUser.email,
    role: sessionUser.role as 'USER' | 'NURSE' | 'ADMIN' | 'SUPPORT',
    profilePicture: sessionUser.profilePicture
  };

  return (
    <DiscussionsLayout
      sessions={discussions}
      currentUser={currentUser}
      token={accessToken}
    />
  );
}
