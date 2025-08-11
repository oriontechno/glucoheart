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
import {
  discussionParticipants,
  discussionRooms,
  discussionMessages,
} from '../db/schema';
import { DiscussionService } from './discussion.service';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; role?: string } };
}

@WebSocketGateway({ namespace: '/discussion', cors: true })
export class DiscussionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DiscussionGateway.name);

  @WebSocketServer() io!: Server;

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly svc: DiscussionService,
    private readonly jwt: JwtService,
  ) {}

  async handleConnection(socket: AuthedSocket) {
    try {
      const auth = socket.handshake.auth as any;
      const headers = socket.handshake.headers as any;
      const query = socket.handshake.query as any;
      const bearer =
        typeof headers?.authorization === 'string'
          ? headers.authorization.split(' ')[1]
          : undefined;
      const token = auth?.token || bearer || query?.token;
      if (!token) return socket.disconnect(true);

      const payload: any = await this.jwt.verifyAsync(token);
      const userId = Number(payload?.userId ?? payload?.id ?? payload?.sub);
      if (!userId || Number.isNaN(userId)) return socket.disconnect(true);
      socket.data.user = { id: userId, role: payload?.role };
    } catch (e) {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(_socket: AuthedSocket) {}

  @SubscribeMessage('room.join')
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) return { ok: false, error: 'unauthorized' };
    const roomId = Number(payload?.roomId);
    if (!roomId) return { ok: false, error: 'invalid roomId' };

    const [room] = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.id, roomId));
    if (!room) return { ok: false, error: 'not found' };

    if (room.isPublic) {
      await this.db
        .insert(discussionParticipants)
        .values({ roomId, userId, role: 'member' })
        .onConflictDoNothing();
      socket.join(`room:${roomId}`);
      return { ok: true };
    }

    const [p] = await this.db
      .select()
      .from(discussionParticipants)
      .where(
        and(
          eq(discussionParticipants.roomId, roomId),
          eq(discussionParticipants.userId, userId),
        ),
      );
    if (!p) return { ok: false, error: 'not a participant' };

    socket.join(`room:${roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('message.send')
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number; content: string },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) return { ok: false, error: 'unauthorized' };
    if (!payload?.roomId || !payload?.content)
      return { ok: false, error: 'invalid payload' };

    const msg = await this.svc.sendMessage(payload.roomId, userId, {
      content: payload.content,
    });
    return { ok: true, message: msg };
  }

  @OnEvent('discussion.message.created')
  async handleMessageCreated(payload: { roomId: number; messageId: number }) {
    const [m] = await this.db
      .select()
      .from(discussionMessages)
      .where(eq(discussionMessages.id, payload.messageId));
    if (m) this.io.to(`room:${payload.roomId}`).emit('message.new', m);
  }
}
