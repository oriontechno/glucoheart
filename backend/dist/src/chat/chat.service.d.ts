import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-messages.dto';
import { AssignNurseDto } from './dto/assign-nurse.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
export declare class ChatService {
    private readonly db;
    private readonly events;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, events: EventEmitter2);
    private normalizePair;
    private ensureUserIsParticipant;
    getOrCreateOneToOneSessionByRole(currentUserId: number, role: 'ADMIN' | 'SUPPORT'): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: "one_to_one" | "group";
        userAId: number | null;
        userBId: number | null;
        assignedNurseId: number | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
    }>;
    getOrCreateOneToOneSession(currentUserId: number, dto: CreateSessionDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: "one_to_one" | "group";
        userAId: number | null;
        userBId: number | null;
        assignedNurseId: number | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
    }>;
    sendMessage(sessionId: number, senderId: number, dto: SendMessageDto): Promise<{
        id: number;
        createdAt: Date;
        sessionId: number;
        senderId: number;
        content: string;
    }>;
    fetchMessages(sessionId: number, userId: number): Promise<{
        id: number;
        sessionId: number;
        senderId: number;
        content: string;
        createdAt: Date;
    }[]>;
    listSessions(userId: number): Promise<{
        participants: {
            id: number;
            sessionId: number;
            userId: number;
            role: "member" | "nurse";
            joinedAt: Date;
        }[];
        lastMessage: {
            id: number;
            sessionId: number;
            senderId: number;
            content: string;
            createdAt: Date;
        } | null;
        id: number;
        type: "one_to_one" | "group";
        userAId: number | null;
        userBId: number | null;
        assignedNurseId: number | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    assignNurse(sessionId: number, actingUser: {
        id: number;
        role?: string;
    }, dto: AssignNurseDto): Promise<{
        id: number;
        type: "one_to_one" | "group";
        userAId: number | null;
        userBId: number | null;
        assignedNurseId: number | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
