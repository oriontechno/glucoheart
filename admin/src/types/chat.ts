import { User } from './entity';

export interface ChatSession {
  id: number;
  type: 'one_to_one' | 'group';
  userAId?: number;
  userBId?: number;
  assignedNurseId?: number;
  lastMessageId?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  participants?: ChatParticipant[];
  messages?: Message[];
  lastMessage?: Message;
}

export interface ChatParticipant {
  id: number;
  sessionId: number;
  userId: number;
  role: 'member' | 'nurse';
  joinedAt: string;
  user?: ChatUser;
}

export interface Message {
  id: number;
  sessionId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: ChatUser;
}

// Extended user interface for chat with additional fields
export interface ChatUser {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  role: 'USER' | 'NURSE' | 'ADMIN' | 'SUPPORT';
  profilePicture?: string;
}
