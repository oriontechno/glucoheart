import { searchParamsCache } from '@/lib/searchparams';
import ChatSessionsLayout from './chat-sessions-layout';
import { ChatSession, ChatUser } from '@/types/chat';
import { faker } from '@faker-js/faker';
import { ChatSessionsServerService } from '@/lib/api/chat-sessions.server.service';

type ChatSessionsListingProps = {};

// Helper function to generate mock user
const generateMockUser = (
  id: number,
  role: 'USER' | 'NURSE' | 'ADMIN' | 'SUPPORT'
): ChatUser => ({
  id,
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  role,
  profilePicture: faker.image.avatar()
});

// Mock current user
const mockCurrentUser: ChatUser = {
  id: 1,
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  role: 'ADMIN',
  profilePicture: faker.image.avatar()
};

// Generate mock sessions with faker
const generateMockSessions = (): ChatSession[] => {
  const sessions: ChatSession[] = [];
  const roles: ('USER' | 'NURSE' | 'SUPPORT')[] = ['USER', 'NURSE', 'SUPPORT'];

  for (let i = 1; i <= 15; i++) {
    const otherUserRole = faker.helpers.arrayElement(roles);
    const otherUser = generateMockUser(i + 100, otherUserRole);
    const nurseUser =
      otherUserRole === 'NURSE'
        ? otherUser
        : generateMockUser(i + 200, 'NURSE');

    // Generate messages for this session
    const messageCount = faker.number.int({ min: 1, max: 10 });
    const messages = [];

    for (let j = 1; j <= messageCount; j++) {
      const isFromOtherUser = faker.datatype.boolean();
      const sender = isFromOtherUser ? otherUser : mockCurrentUser;

      const healthTopics = [
        'Mohon untuk tetap menjaga profesionalitas dalam konsultasi',
        'Terima kasih atas bantuan dan sarannya',
        'Belum, hanya pakai tensimeter rumahan',
        'Bagus sekali! Diet rendah garam dan lemak jenuh sangat penting. Hindari makanan olahan dan perbanyak sayuran',
        'Selamat sore! Saya siap membantu. Usia kandungan berapa sekarang?',
        'Selamat siang! Obat apa yang dimaksud?',
        'Sudah coba minum air hangat dan istirahat yang cukup?',
        'Apakah ada gejala demam atau mual?',
        'Saya akan jadwalkan konsultasi lanjutan minggu depan',
        'Terima kasih sudah konsultasi. Jangan lupa kontrol rutin ya'
      ];

      messages.push({
        id: i * 100 + j,
        sessionId: i,
        senderId: sender.id,
        content: faker.helpers.arrayElement(healthTopics),
        createdAt: faker.date.recent({ days: 7 }).toISOString(),
        sender
      });
    }

    // Sort messages by creation time
    messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const session: ChatSession = {
      id: i,
      type: 'one_to_one',
      userAId: mockCurrentUser.id,
      userBId: otherUser.id,
      assignedNurseId: nurseUser.id,
      lastMessageAt:
        messages[messages.length - 1]?.createdAt ||
        faker.date.recent({ days: 1 }).toISOString(),
      createdAt: faker.date.recent({ days: 30 }).toISOString(),
      updatedAt: faker.date.recent({ days: 1 }).toISOString(),
      participants: [
        {
          id: i * 10 + 1,
          sessionId: i,
          userId: mockCurrentUser.id,
          role: 'member',
          joinedAt: faker.date.recent({ days: 30 }).toISOString(),
          user: mockCurrentUser
        },
        {
          id: i * 10 + 2,
          sessionId: i,
          userId: otherUser.id,
          role: 'member',
          joinedAt: faker.date.recent({ days: 30 }).toISOString(),
          user: otherUser
        },
        {
          id: i * 10 + 3,
          sessionId: i,
          userId: nurseUser.id,
          role: 'nurse',
          joinedAt: faker.date.recent({ days: 30 }).toISOString(),
          user: nurseUser
        }
      ],
      messages,
      lastMessage: messages[messages.length - 1] || null
    };

    sessions.push(session);
  }

  return sessions.sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
  );
};

const mockSessions = generateMockSessions();

export default async function ChatSessionsListing({}: ChatSessionsListingProps) {
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

  // TODO: Uncomment ketika API sudah siap
  const chatSessionsResponse =
    await ChatSessionsServerService.getChatSessions(filters);
  const sessionsFromAPI: ChatSession[] = chatSessionsResponse.success
    ? chatSessionsResponse.data.sessions || []
    : [];

  console.log({ sessionsFromAPI });
  console.log({ participants: sessionsFromAPI[0]?.participants });

  // TODO: Get current user from session
  // const currentUser = await authService.getCurrentUser();

  // Sementara menggunakan mock data
  const sessions = mockSessions;
  const currentUser = mockCurrentUser;

  return <ChatSessionsLayout sessions={sessions} currentUser={currentUser} />;
}
