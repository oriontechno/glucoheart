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
} from '../db/schema';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; role?: string } };
}

@WebSocketGateway({
  namespace: '/discussion',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'], // match dengan client
})
export class DiscussionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DiscussionGateway.name);

  @WebSocketServer() io!: Server;

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
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
    } catch {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(_socket: AuthedSocket) {}

  // ✅ SELARASKAN DENGAN CLIENT: 'discussion.join'
  @SubscribeMessage('discussion.join')
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
      socket.join(this.room(roomId));
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

    socket.join(this.room(roomId));
    return { ok: true };
  }

  // ✅ Tambahkan ('discussion.leave') agar simetris
  @SubscribeMessage('discussion.leave')
  async onLeave(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number },
  ) {
    const roomId = Number(payload?.roomId);
    if (!roomId) return;
    socket.leave(this.room(roomId));
  }

  private room(id: number) {
    return `room:${id}`;
  }

  /**
   * ✅ DENGARKAN event internal dari service.
   * Service kamu mengirim payload = objek pesan lengkap:
   * {
   *   id, roomId, senderId, content, createdAt,
   *   senderName, senderAvatar
   * }
   * Jadi broadcast langsung TANPA fetch DB lagi.
   */
  @OnEvent('discussion.message.created', { async: true })
  handleMessageCreated(payload: {
    id: number;
    roomId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    senderName?: string;
    senderAvatar?: string;
  }) {
    this.io.to(this.room(payload.roomId))
      // ✅ SELARASKAN NAMA EVENT DENGAN CLIENT
      .emit('discussion.message.created', payload);
  }
}
