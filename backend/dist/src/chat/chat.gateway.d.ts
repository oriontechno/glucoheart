import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ChatService } from './chat.service';
interface AuthedSocket extends Socket {
    data: {
        user?: {
            id: number;
            role?: string;
        };
    };
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly db;
    private readonly chat;
    private readonly jwt;
    private readonly logger;
    io: Server;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, chat: ChatService, jwt: JwtService);
    handleConnection(socket: AuthedSocket): Promise<void>;
    handleDisconnect(socket: AuthedSocket): Promise<void>;
    onJoin(socket: AuthedSocket, payload: {
        sessionId: number;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    onLeave(socket: AuthedSocket, payload: {
        sessionId: number;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    onSend(socket: AuthedSocket, payload: {
        sessionId: number;
        content: string;
    }): Promise<{
        ok: boolean;
        error: string;
        message?: undefined;
    } | {
        ok: boolean;
        message: {
            id: number;
            createdAt: Date;
            sessionId: number;
            senderId: number;
            content: string;
        };
        error?: undefined;
    }>;
    handleMessageCreated(payload: {
        sessionId: number;
        messageId: number;
    }): Promise<void>;
    handleNurseAssigned(payload: {
        sessionId: number;
        nurseId: number;
    }): Promise<void>;
}
export {};
