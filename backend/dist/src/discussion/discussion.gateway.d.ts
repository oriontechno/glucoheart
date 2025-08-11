import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DiscussionService } from './discussion.service';
interface AuthedSocket extends Socket {
    data: {
        user?: {
            id: number;
            role?: string;
        };
    };
}
export declare class DiscussionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly db;
    private readonly svc;
    private readonly jwt;
    private readonly logger;
    io: Server;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, svc: DiscussionService, jwt: JwtService);
    handleConnection(socket: AuthedSocket): Promise<AuthedSocket | undefined>;
    handleDisconnect(_socket: AuthedSocket): Promise<void>;
    onJoin(socket: AuthedSocket, payload: {
        roomId: number;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    onSend(socket: AuthedSocket, payload: {
        roomId: number;
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
            senderId: number;
            content: string;
            roomId: number;
        };
        error?: undefined;
    }>;
    handleMessageCreated(payload: {
        roomId: number;
        messageId: number;
    }): Promise<void>;
}
export {};
