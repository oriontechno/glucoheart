import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { chatSessionParticipants, messages } from '../db/schema';
import { ChatService } from './chat.service';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; role?: string } };
}

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() io!: Server;

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Primitive auth for dev: read userId from handshake.auth.userId or query.userId
   * Replace with proper JWT verify and attach to socket.data.user
   */
  async handleConnection(socket: AuthedSocket) {
    try {
      // Expect JWT from one of: auth.token, Authorization: Bearer <token>, or query.token
      const auth = socket.handshake.auth as any;
      const headers = socket.handshake.headers as any;
      const query = socket.handshake.query as any;
      const bearer =
        typeof headers?.authorization === 'string'
          ? headers.authorization.split(' ')[1]
          : undefined;
      const token = auth?.token || bearer || query?.token;

      if (!token) {
        this.logger.warn(`Disconnecting unauthenticated socket: ${socket.id}`);
        socket.emit('error', 'Unauthorized');
        socket.disconnect(true);
        return;
      }

      const payload: any = await this.jwt.verifyAsync(token);
      const userId = Number(payload?.userId ?? payload?.id ?? payload?.sub);
      if (!userId || Number.isNaN(userId)) {
        this.logger.warn(`Invalid JWT payload on socket ${socket.id}`);
        socket.emit('error', 'Unauthorized');
        socket.disconnect(true);
        return;
      }

      socket.data.user = { id: userId, role: payload?.role };
      this.logger.debug(`Socket connected: ${socket.id} (user ${userId})`);
    } catch (e) {
      this.logger.error(`handleConnection error: ${e}`);
      socket.emit('error', 'Unauthorized');
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: AuthedSocket) {
    this.logger.debug(`Socket disconnected: ${socket.id}`);
  }

  // Client asks to join a session room
  @SubscribeMessage('session.join')
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) return { ok: false, error: 'unauthorized' };
    if (!payload?.sessionId || Number.isNaN(Number(payload.sessionId)))
      return { ok: false, error: 'invalid sessionId' };

    // Ensure membership
    const [p] = await this.db
      .select()
      .from(chatSessionParticipants)
      .where(
        and(
          eq(chatSessionParticipants.sessionId, payload.sessionId),
          eq(chatSessionParticipants.userId, userId),
        ),
      );
    if (!p) return { ok: false, error: 'not a participant' };

    socket.join(`session:${payload.sessionId}`);
    return { ok: true };
  }

  // Optional: client leaves a session room
  @SubscribeMessage('session.leave')
  async onLeave(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number },
  ) {
    if (!payload?.sessionId) return { ok: false, error: 'invalid sessionId' };
    socket.leave(`session:${payload.sessionId}`);
    return { ok: true };
  }

  // Optional: send message through WebSocket (uses ChatService for single source of truth)
  @SubscribeMessage('message.send')
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number; content: string },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) return { ok: false, error: 'unauthorized' };
    if (!payload?.sessionId || !payload?.content)
      return { ok: false, error: 'invalid payload' };

    const msg = await this.chat.sendMessage(payload.sessionId, userId, {
      content: payload.content,
    });
    // ChatService emits 'chat.message.created' and Gateway will broadcast below
    return { ok: true, message: msg };
  }

  // Broadcast freshly created message to room subscribers
  @OnEvent('chat.message.created')
  async handleMessageCreated(payload: {
    sessionId: number;
    messageId: number;
  }) {
    try {
      const [m] = await this.db
        .select()
        .from(messages)
        .where(eq(messages.id, payload.messageId));
      if (!m) return;
      this.io.to(`session:${payload.sessionId}`).emit('message.new', m);
    } catch (e) {
      this.logger.error(`handleMessageCreated error: ${e}`);
    }
  }

  // Broadcast nurse assignment changes
  @OnEvent('chat.nurse.assigned')
  async handleNurseAssigned(payload: { sessionId: number; nurseId: number }) {
    try {
      this.io
        .to(`session:${payload.sessionId}`)
        .emit('session.nurseAssigned', payload);
    } catch (e) {
      this.logger.error(`handleNurseAssigned error: ${e}`);
    }
  }
}
