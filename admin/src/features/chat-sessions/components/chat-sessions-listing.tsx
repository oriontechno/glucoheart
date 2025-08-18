import { searchParamsCache } from '@/lib/searchparams';
import { ChatSessionsServerService } from '@/lib/api/chat-sessions.server.service';
import { authService } from '@/lib/api/auth.service';
import ChatSessionsLayout from './chat-sessions-layout';
import { ChatSession, ChatUser } from '@/types/chat';

type ChatSessionsListingProps = {};

// Mock data untuk development - nanti bisa dihapus ketika API sudah siap
const mockCurrentUser: ChatUser = {
  id: 1,
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  role: 'ADMIN',
  profilePicture: undefined
};

const mockSessions: ChatSession[] = [
  {
    id: 1,
    type: 'one_to_one',
    userAId: 1,
    userBId: 2,
    assignedNurseId: 3,
    lastMessageAt: '2024-08-16T10:30:00Z',
    createdAt: '2024-08-15T09:00:00Z',
    updatedAt: '2024-08-16T10:30:00Z',
    participants: [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: 'member',
        joinedAt: '2024-08-15T09:00:00Z',
        user: mockCurrentUser
      },
      {
        id: 2,
        sessionId: 1,
        userId: 2,
        role: 'member',
        joinedAt: '2024-08-15T09:00:00Z',
        user: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 3,
        sessionId: 1,
        userId: 3,
        role: 'nurse',
        joinedAt: '2024-08-15T09:00:00Z',
        user: {
          id: 3,
          firstName: 'Nakes',
          lastName: 'Professional',
          email: 'nurse@example.com',
          role: 'NURSE'
        }
      }
    ],
    messages: [
      {
        id: 1,
        sessionId: 1,
        senderId: 2,
        content: 'Halo, saya ingin konsultasi tentang diabetes',
        createdAt: '2024-08-16T09:00:00Z',
        sender: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 2,
        sessionId: 1,
        senderId: 3,
        content:
          'Selamat pagi! Saya senang bisa membantu Anda. Bisa ceritakan keluhan yang Anda rasakan?',
        createdAt: '2024-08-16T09:05:00Z',
        sender: {
          id: 3,
          firstName: 'Nakes',
          lastName: 'Professional',
          email: 'nurse@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 3,
        sessionId: 1,
        senderId: 2,
        content:
          'Akhir-akhir ini saya sering merasa haus dan sering buang air kecil',
        createdAt: '2024-08-16T09:10:00Z',
        sender: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 4,
        sessionId: 1,
        senderId: 3,
        content:
          'Gejala yang Anda sebutkan memang perlu diwaspadai. Sudah berapa lama Anda merasakan gejala ini?',
        createdAt: '2024-08-16T09:15:00Z',
        sender: {
          id: 3,
          firstName: 'Nakes',
          lastName: 'Professional',
          email: 'nurse@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 5,
        sessionId: 1,
        senderId: 2,
        content: 'Sekitar 2 minggu terakhir',
        createdAt: '2024-08-16T09:20:00Z',
        sender: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 6,
        sessionId: 1,
        senderId: 3,
        content: 'Apakah ada riwayat diabetes dalam keluarga?',
        createdAt: '2024-08-16T09:25:00Z',
        sender: {
          id: 3,
          firstName: 'Nakes',
          lastName: 'Professional',
          email: 'nurse@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 7,
        sessionId: 1,
        senderId: 2,
        content: 'Ya, ibu saya menderita diabetes tipe 2',
        createdAt: '2024-08-16T09:30:00Z',
        sender: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 8,
        sessionId: 1,
        senderId: 3,
        content:
          'Saya sangat menyarankan Anda untuk segera memeriksakan gula darah. Silakan datang ke fasilitas kesehatan terdekat untuk pemeriksaan lebih lanjut.',
        createdAt: '2024-08-16T09:35:00Z',
        sender: {
          id: 3,
          firstName: 'Nakes',
          lastName: 'Professional',
          email: 'nurse@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 9,
        sessionId: 1,
        senderId: 2,
        content:
          'Baik, terima kasih atas sarannya. Saya akan segera memeriksakan diri',
        createdAt: '2024-08-16T09:40:00Z',
        sender: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'USER'
        }
      },
      {
        id: 10,
        sessionId: 1,
        senderId: 1,
        content: 'Mohon untuk tetap menjaga profesionalitas dalam konsultasi',
        createdAt: '2024-08-16T10:30:00Z',
        sender: mockCurrentUser
      }
    ],
    lastMessage: {
      id: 10,
      sessionId: 1,
      senderId: 1,
      content: 'Mohon untuk tetap menjaga profesionalitas dalam konsultasi',
      createdAt: '2024-08-16T10:30:00Z',
      sender: mockCurrentUser
    }
  },
  {
    id: 2,
    type: 'one_to_one',
    userAId: 1,
    userBId: 4,
    assignedNurseId: 5,
    lastMessageAt: '2024-08-16T08:15:00Z',
    createdAt: '2024-08-16T08:00:00Z',
    updatedAt: '2024-08-16T08:15:00Z',
    participants: [
      {
        id: 4,
        sessionId: 2,
        userId: 1,
        role: 'member',
        joinedAt: '2024-08-16T08:00:00Z',
        user: mockCurrentUser
      },
      {
        id: 5,
        sessionId: 2,
        userId: 4,
        role: 'member',
        joinedAt: '2024-08-16T08:00:00Z',
        user: {
          id: 4,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'USER'
        }
      },
      {
        id: 6,
        sessionId: 2,
        userId: 5,
        role: 'nurse',
        joinedAt: '2024-08-16T08:00:00Z',
        user: {
          id: 5,
          firstName: 'Nakes',
          lastName: 'Two',
          email: 'nurse2@example.com',
          role: 'NURSE'
        }
      }
    ],
    messages: [
      {
        id: 11,
        sessionId: 2,
        senderId: 4,
        content: 'Selamat pagi, saya ingin berkonsultasi tentang hipertensi',
        createdAt: '2024-08-16T08:05:00Z',
        sender: {
          id: 4,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'USER'
        }
      },
      {
        id: 12,
        sessionId: 2,
        senderId: 5,
        content:
          'Selamat pagi! Tentu, saya siap membantu. Apa keluhan Anda terkait hipertensi?',
        createdAt: '2024-08-16T08:08:00Z',
        sender: {
          id: 5,
          firstName: 'Nakes',
          lastName: 'Two',
          email: 'nurse2@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 13,
        sessionId: 2,
        senderId: 4,
        content: 'Saya sering merasa pusing dan tekanan darah tinggi',
        createdAt: '2024-08-16T08:10:00Z',
        sender: {
          id: 4,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'USER'
        }
      },
      {
        id: 14,
        sessionId: 2,
        senderId: 5,
        content:
          'Apakah Anda sudah pernah cek tekanan darah di fasilitas kesehatan?',
        createdAt: '2024-08-16T08:12:00Z',
        sender: {
          id: 5,
          firstName: 'Nakes',
          lastName: 'Two',
          email: 'nurse2@example.com',
          role: 'NURSE'
        }
      },
      {
        id: 15,
        sessionId: 2,
        senderId: 4,
        content: 'Belum, hanya pakai tensimeter rumahan',
        createdAt: '2024-08-16T08:15:00Z',
        sender: {
          id: 4,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'USER'
        }
      }
    ],
    lastMessage: {
      id: 15,
      sessionId: 2,
      senderId: 4,
      content: 'Belum, hanya pakai tensimeter rumahan',
      createdAt: '2024-08-16T08:15:00Z',
      sender: {
        id: 4,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'USER'
      }
    }
  },
  {
    id: 3,
    type: 'one_to_one',
    userAId: 1,
    userBId: 6,
    assignedNurseId: 7,
    lastMessageAt: '2024-08-16T07:45:00Z',
    createdAt: '2024-08-16T07:00:00Z',
    updatedAt: '2024-08-16T07:45:00Z',
    participants: [
      {
        id: 7,
        sessionId: 3,
        userId: 1,
        role: 'member',
        joinedAt: '2024-08-16T07:00:00Z',
        user: mockCurrentUser
      },
      {
        id: 8,
        sessionId: 3,
        userId: 6,
        role: 'member',
        joinedAt: '2024-08-16T07:00:00Z',
        user: {
          id: 6,
          firstName: 'Robert',
          lastName: 'Brown',
          email: 'robert@example.com',
          role: 'USER'
        }
      },
      {
        id: 9,
        sessionId: 3,
        userId: 7,
        role: 'nurse',
        joinedAt: '2024-08-16T07:00:00Z',
        user: {
          id: 7,
          firstName: 'Dr. Sarah',
          lastName: 'Wilson',
          email: 'sarah@example.com',
          role: 'NURSE'
        }
      }
    ],
    messages: [
      {
        id: 16,
        sessionId: 3,
        senderId: 6,
        content: 'Halo dok, saya mau tanya tentang diet untuk jantung',
        createdAt: '2024-08-16T07:05:00Z',
        sender: {
          id: 6,
          firstName: 'Robert',
          lastName: 'Brown',
          email: 'robert@example.com',
          role: 'USER'
        }
      },
      {
        id: 17,
        sessionId: 3,
        senderId: 7,
        content: 'Selamat pagi! Tentu saja. Apa kondisi jantung Anda saat ini?',
        createdAt: '2024-08-16T07:10:00Z',
        sender: {
          id: 7,
          firstName: 'Dr. Sarah',
          lastName: 'Wilson',
          email: 'sarah@example.com',
          role: 'ADMIN'
        }
      },
      {
        id: 18,
        sessionId: 3,
        senderId: 6,
        content:
          'Saya punya riwayat jantung koroner dan ingin menjaga pola makan',
        createdAt: '2024-08-16T07:15:00Z',
        sender: {
          id: 6,
          firstName: 'Robert',
          lastName: 'Brown',
          email: 'robert@example.com',
          role: 'USER'
        }
      },
      {
        id: 19,
        sessionId: 3,
        senderId: 7,
        content:
          'Bagus sekali! Diet rendah garam dan lemak jenuh sangat penting. Hindari makanan olahan dan perbanyak sayuran.',
        createdAt: '2024-08-16T07:20:00Z',
        sender: {
          id: 7,
          firstName: 'Dr. Sarah',
          lastName: 'Wilson',
          email: 'sarah@example.com',
          role: 'NURSE'
        }
      }
    ],
    lastMessage: {
      id: 19,
      sessionId: 3,
      senderId: 7,
      content:
        'Bagus sekali! Diet rendah garam dan lemak jenuh sangat penting. Hindari makanan olahan dan perbanyak sayuran.',
      createdAt: '2024-08-16T07:20:00Z',
      sender: {
        id: 7,
        firstName: 'Dr. Sarah',
        lastName: 'Wilson',
        email: 'sarah@example.com',
        role: 'NURSE'
      }
    }
  },
  {
    id: 4,
    type: 'one_to_one',
    userAId: 1,
    userBId: 8,
    assignedNurseId: 9,
    lastMessageAt: '2024-08-15T16:30:00Z',
    createdAt: '2024-08-15T16:00:00Z',
    updatedAt: '2024-08-15T16:30:00Z',
    participants: [
      {
        id: 10,
        sessionId: 4,
        userId: 1,
        role: 'member',
        joinedAt: '2024-08-15T16:00:00Z',
        user: mockCurrentUser
      },
      {
        id: 11,
        sessionId: 4,
        userId: 8,
        role: 'member',
        joinedAt: '2024-08-15T16:00:00Z',
        user: {
          id: 8,
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria@example.com',
          role: 'USER'
        }
      },
      {
        id: 12,
        sessionId: 4,
        userId: 9,
        role: 'nurse',
        joinedAt: '2024-08-15T16:00:00Z',
        user: {
          id: 9,
          firstName: 'Nurse',
          lastName: 'Johnson',
          email: 'johnson@example.com',
          role: 'NURSE'
        }
      }
    ],
    messages: [
      {
        id: 20,
        sessionId: 4,
        senderId: 8,
        content: 'Permisi, saya mau konsultasi tentang kehamilan',
        createdAt: '2024-08-15T16:05:00Z',
        sender: {
          id: 8,
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria@example.com',
          role: 'USER'
        }
      },
      {
        id: 21,
        sessionId: 4,
        senderId: 9,
        content:
          'Selamat sore! Saya siap membantu. Usia kandungan berapa sekarang?',
        createdAt: '2024-08-15T16:10:00Z',
        sender: {
          id: 9,
          firstName: 'Nurse',
          lastName: 'Johnson',
          email: 'johnson@example.com',
          role: 'NURSE'
        }
      }
    ],
    lastMessage: {
      id: 21,
      sessionId: 4,
      senderId: 9,
      content:
        'Selamat sore! Saya siap membantu. Usia kandungan berapa sekarang?',
      createdAt: '2024-08-15T16:10:00Z',
      sender: {
        id: 9,
        firstName: 'Nurse',
        lastName: 'Johnson',
        email: 'johnson@example.com',
        role: 'NURSE'
      }
    }
  },
  {
    id: 5,
    type: 'one_to_one',
    userAId: 1,
    userBId: 10,
    assignedNurseId: 11,
    lastMessageAt: '2024-08-15T14:20:00Z',
    createdAt: '2024-08-15T14:00:00Z',
    updatedAt: '2024-08-15T14:20:00Z',
    participants: [
      {
        id: 13,
        sessionId: 5,
        userId: 1,
        role: 'member',
        joinedAt: '2024-08-15T14:00:00Z',
        user: mockCurrentUser
      },
      {
        id: 14,
        sessionId: 5,
        userId: 10,
        role: 'member',
        joinedAt: '2024-08-15T14:00:00Z',
        user: {
          id: 10,
          firstName: 'David',
          lastName: 'Kim',
          email: 'david@example.com',
          role: 'USER'
        }
      },
      {
        id: 15,
        sessionId: 5,
        userId: 11,
        role: 'nurse',
        joinedAt: '2024-08-15T14:00:00Z',
        user: {
          id: 11,
          firstName: 'Pharmacist',
          lastName: 'Lee',
          email: 'pharmacist@example.com',
          role: 'SUPPORT'
        }
      }
    ],
    messages: [
      {
        id: 22,
        sessionId: 5,
        senderId: 10,
        content: 'Halo, saya ingin tanya tentang efek samping obat',
        createdAt: '2024-08-15T14:05:00Z',
        sender: {
          id: 10,
          firstName: 'David',
          lastName: 'Kim',
          email: 'david@example.com',
          role: 'USER'
        }
      },
      {
        id: 23,
        sessionId: 5,
        senderId: 11,
        content: 'Selamat siang! Obat apa yang dimaksud?',
        createdAt: '2024-08-15T14:10:00Z',
        sender: {
          id: 11,
          firstName: 'Pharmacist',
          lastName: 'Lee',
          email: 'pharmacist@example.com',
          role: 'SUPPORT'
        }
      }
    ],
    lastMessage: {
      id: 23,
      sessionId: 5,
      senderId: 11,
      content: 'Selamat siang! Obat apa yang dimaksud?',
      createdAt: '2024-08-15T14:10:00Z',
      sender: {
        id: 11,
        firstName: 'Pharmacist',
        lastName: 'Lee',
        email: 'pharmacist@example.com',
        role: 'SUPPORT'
      }
    }
  }
];

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
  // const chatSessionsResponse = await ChatSessionsServerService.getChatSessions(filters);
  // const sessions: ChatSession[] = chatSessionsResponse.success
  //   ? chatSessionsResponse.data.sessions || []
  //   : [];

  // TODO: Get current user from session
  // const currentUser = await authService.getCurrentUser();

  // Sementara menggunakan mock data
  const sessions = mockSessions;
  const currentUser = mockCurrentUser;

  return <ChatSessionsLayout sessions={sessions} currentUser={currentUser} />;
}
