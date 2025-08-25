import { searchParamsCache } from '@/lib/searchparams';
import ChatSessionsLayout from './chat-sessions-layout';
import { ChatSession, ChatUser, ChatParticipantAPI } from '@/types/chat';
import { ChatSessionsServerService } from '@/lib/api/chat-sessions.server.service';

// Helper function to convert API data to expected format
const convertAPISessionToClientSession = (apiSession: any): ChatSession => {
  // Convert participants dari format API ke format yang diharapkan komponen
  const convertedParticipants =
    apiSession.participants?.map((participant: ChatParticipantAPI) => ({
      id: participant.userId, // Use userId as id for compatibility
      sessionId: apiSession.id,
      userId: participant.userId,
      role: participant.role,
      joinedAt: participant.joinedAt,
      user: {
        id: participant.userId,
        firstName: participant.firstName || 'Unknown',
        lastName: participant.lastName || '',
        email: participant.email || '',
        role: participant.userRole || 'USER',
        profilePicture: undefined // API doesn't provide profile picture
      }
    })) || [];

  // Handle lastMessage - API mengirim string, komponen expect Message object
  let lastMessageObj = undefined;
  if (
    typeof apiSession.lastMessage === 'string' &&
    apiSession.lastMessage.trim()
  ) {
    lastMessageObj = {
      id: 0, // API tidak memberikan ID untuk last message
      sessionId: apiSession.id,
      senderId: 0, // API tidak memberikan sender ID
      content: apiSession.lastMessage,
      createdAt: apiSession.lastMessageAt || new Date().toISOString(),
      sender: undefined // Akan di-resolve nanti jika diperlukan
    };
  }

  return {
    id: apiSession.id,
    type: apiSession.type || 'one_to_one',
    assignedNurseId: apiSession.assignedNurseId,
    lastMessageAt: apiSession.lastMessageAt || new Date().toISOString(),
    createdAt:
      apiSession.created_at || apiSession.createdAt || new Date().toISOString(),
    updatedAt:
      apiSession.updated_at || apiSession.updatedAt || new Date().toISOString(),
    nurse: apiSession.nurse || undefined,
    participants: convertedParticipants,
    lastMessage: lastMessageObj,
    messages: [] // Messages akan di-load terpisah ketika session dipilih
  };
};

export default async function ChatSessionsListing() {
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
  const chatSessionsResponse =
    await ChatSessionsServerService.getChatSessions(filters);

  let sessions: ChatSession[] = [];

  if (chatSessionsResponse.success && chatSessionsResponse.data.sessions) {
    // Convert API data ke format yang diharapkan komponen
    sessions = chatSessionsResponse.data.sessions.map(
      convertAPISessionToClientSession
    );
  }

  // Get current user from iron session
  const sessionUser = await ChatSessionsServerService.getCurrentUser();

  // Jika tidak ada user di session, redirect atau throw error
  if (!sessionUser) {
    throw new Error('User session not found. Please login again.');
  }

  const currentUser: ChatUser = {
    id: sessionUser.id,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName || '',
    email: sessionUser.email,
    role: sessionUser.role as 'USER' | 'NURSE' | 'ADMIN' | 'SUPPORT',
    profilePicture: sessionUser.profilePicture
  };

  return <ChatSessionsLayout sessions={sessions} currentUser={currentUser} />;
}
