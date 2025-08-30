import { User } from './entity';

export interface Discussion {
  id: number;
  topic: string;
  description?: string;
  is_public?: boolean;
  isPublic?: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message: string;
  last_message_sender_id: number;
}

export interface DiscussionMessage {
  id: number;
  discussion_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    role: string;
    profilePicture?: string;
  };
}

export interface ChatSession {
  id: number;
  type: 'one_to_one' | 'group';
  userAId?: number;
  userBId?: number;
  assignedNurseId?: number;
  lastMessageId?: number;
  lastMessageAt?: string;
  lastMessage?: Message | string; // API bisa mengirim string atau object Message
  nurse?: {
    id: number;
    firstName: string;
    lastName?: string | null;
    email: string;
  };
  created_at?: string; // API menggunakan snake_case
  updated_at?: string; // API menggunakan snake_case
  createdAt?: string; // Tetap support camelCase untuk compatibility
  updatedAt?: string; // Tetap support camelCase untuk compatibility
  participants?: (ChatParticipantAPI | ChatParticipant)[];
  messages?: Message[];
}

export interface ChatParticipantAPI {
  userId: number;
  email: string;
  firstName: string;
  lastName?: string | null;
  role: 'member' | 'nurse';
  userRole: 'USER' | 'NURSE' | 'ADMIN' | 'SUPPORT';
  joinedAt: string;
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
