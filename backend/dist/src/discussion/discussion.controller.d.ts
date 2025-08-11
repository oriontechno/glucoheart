import { DiscussionService } from './discussion.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { DiscussionSendMessageDto } from './dto/send-message.dto';
import { Request } from 'express';
import { RequestUser } from './types';
export declare class DiscussionController {
    private readonly svc;
    constructor(svc: DiscussionService);
    createRoom(req: Request & {
        user: RequestUser;
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
    joinRoom(req: Request & {
        user: RequestUser;
    }, roomId: number): Promise<{
        ok: boolean;
    }>;
    leaveRoom(req: Request & {
        user: RequestUser;
    }, roomId: number): Promise<{
        ok: boolean;
    }>;
    sendMessage(req: Request & {
        user: RequestUser;
    }, roomId: number, dto: DiscussionSendMessageDto): Promise<{
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
