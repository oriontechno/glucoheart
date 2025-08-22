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
import { discussionParticipants, discussionRooms } from '../db/schema';

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
  transports: ['websocket'],
})
export class DiscussionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DiscussionGateway.name);
  private readonly LOBBY = 'lobby';

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

  // === JOIN/LEAVE ROOM (untuk layar room chat) ===
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

  @SubscribeMessage('discussion.leave')
  async onLeave(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number },
  ) {
    const roomId = Number(payload?.roomId);
    if (!roomId) return;
    socket.leave(this.room(roomId));
  }

  // === SEND MESSAGE ===
  @SubscribeMessage('discussion.send.message')
  async onSendMessage(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number; content: string },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) return { ok: false, error: 'unauthorized' };

    const roomId = Number(payload?.roomId);
    const content = payload?.content?.trim();

    if (!roomId || !content) {
      return { ok: false, error: 'invalid roomId or content' };
    }

    try {
      // Check if user can send message to this room
      const [room] = await this.db
        .select()
        .from(discussionRooms)
        .where(eq(discussionRooms.id, roomId));

      if (!room) {
        return { ok: false, error: 'room not found' };
      }

      if (!room.isPublic) {
        // For private rooms, check if user is a participant
        const [participant] = await this.db
          .select()
          .from(discussionParticipants)
          .where(
            and(
              eq(discussionParticipants.roomId, roomId),
              eq(discussionParticipants.userId, userId),
            ),
          );

        if (!participant) {
          return { ok: false, error: 'not a participant' };
        }
      }

      // For now, we'll emit the event and let the service handle database insertion
      // In a real implementation, you might want to save to DB here or call the service
      const messageData = {
        roomId,
        senderId: userId,
        content,
        createdAt: new Date().toISOString(),
        senderName: socket.data.user?.role || 'User',
      };

      // Emit to the room
      this.io.to(this.room(roomId)).emit('discussion.message.created', {
        id: Date.now(), // Temporary ID
        ...messageData,
      });

      // Emit to lobby for room list updates
      this.io.to(this.LOBBY).emit('discussion.room.updated', {
        roomId,
        lastMessage: messageData,
      });

      return { ok: true };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { ok: false, error: 'internal error' };
    }
  }

  // === LOBBY (untuk layar list room) ===
  @SubscribeMessage('discussion.lobby.join')
  async onLobbyJoin(@ConnectedSocket() socket: AuthedSocket) {
    // cukup join satu “ruangan” global
    socket.join(this.LOBBY);
    return { ok: true };
  }

  @SubscribeMessage('discussion.lobby.leave')
  async onLobbyLeave(@ConnectedSocket() socket: AuthedSocket) {
    socket.leave(this.LOBBY);
    return { ok: true };
  }

  private room(id: number) {
    return `room:${id}`;
  }

  /**
   * Service mem-publish payload pesan LENGKAP via event emitter.
   * Kita broadcast ke:
   * - room:<roomId>   => untuk layar room chat
   * - LOBBY           => untuk layar list room (agar bisa update preview & bump urutan)
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
    // broadcast ke room yang relevan
    this.io
      .to(this.room(payload.roomId))
      .emit('discussion.message.created', payload);

    // broadcast ringkas ke lobby untuk update list
    this.io.to(this.LOBBY).emit('discussion.room.updated', {
      roomId: payload.roomId,
      lastMessage: payload, // biar front-end bisa langsung tampilkan preview & waktu
    });
  }
}
