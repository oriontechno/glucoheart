import { ChatService } from './chat.service';
import { CreateSessionByRoleDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-messages.dto';
import { AssignNurseDto } from './dto/assign-nurse.dto';
import { Request } from 'express';
import { RequestUser } from './types';
export declare class ChatController {
    private readonly chat;
    constructor(chat: ChatService);
    createOrGetSessionByRole(req: Request & {
        user: RequestUser;
    }, dto: CreateSessionByRoleDto): Promise<{
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
    sendMessage(req: Request & {
        user: RequestUser;
    }, sessionId: number, dto: SendMessageDto): Promise<{
        id: number;
        createdAt: Date;
        sessionId: number;
        senderId: number;
        content: string;
    }>;
    fetchMessages(req: Request & {
        user: RequestUser;
    }, sessionId: number): Promise<{
        id: number;
        sessionId: number;
        senderId: number;
        content: string;
        createdAt: Date;
    }[]>;
    listSessions(req: Request & {
        user: RequestUser;
    }): Promise<{
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
    assignNurse(req: Request & {
        user: RequestUser;
    }, sessionId: number, dto: AssignNurseDto): Promise<{
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
