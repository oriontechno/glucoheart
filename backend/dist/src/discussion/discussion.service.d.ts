import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRoomDto } from './dto/create-room.dto';
import { DiscussionSendMessageDto } from './dto/send-message.dto';
export declare class DiscussionService {
    private readonly db;
    private readonly events;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, events: EventEmitter2);
    createRoom(actingUser: {
        id: number;
        role?: string;
    }, dto: CreateRoomDto): Promise<{
        isPublic: boolean;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
        createdBy: number | null;
        topic: string;
    }>;
    listRooms(): Promise<{
        lastMessage: {
            id: number;
            roomId: number;
            senderId: number;
            content: string;
            createdAt: Date;
        } | null;
        id: number;
        topic: string;
        description: string | null;
        isPublic: boolean;
        createdBy: number | null;
        lastMessageId: number | null;
        lastMessageAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    joinRoom(roomId: number, userId: number): Promise<{
        ok: boolean;
    }>;
    leaveRoom(roomId: number, userId: number): Promise<{
        ok: boolean;
    }>;
    private ensureCanPost;
    sendMessage(roomId: number, senderId: number, dto: DiscussionSendMessageDto): Promise<{
        id: number;
        createdAt: Date;
        senderId: number;
        content: string;
        roomId: number;
    }>;
    fetchMessages(roomId: number): Promise<{
        id: number;
        roomId: number;
        senderId: number;
        content: string;
        createdAt: Date;
    }[]>;
}
