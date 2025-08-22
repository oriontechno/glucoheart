// src/chat/chat.gateway.ts
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
import { chatSessionParticipants, chatSessions } from '../db/schema';
import { ChatService } from './chat.service';
import { ConfigService } from '@nestjs/config';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; role?: string } };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() io!: Server;

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private isStaff(role?: string) {
    return role === 'ADMIN' || role === 'SUPPORT';
  }

  /** Ambil token dari handshake header/auth/query */
  private getTokenFromHandshake(socket: AuthedSocket): string | undefined {
    const headers = socket.handshake.headers as any;
    const authHeader: string | undefined = headers?.authorization;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const authPayload = (socket.handshake as any)?.auth;
    const query = socket.handshake.query as any;
    return authPayload?.token || bearer || query?.token;
  }

  /** Pastikan socket.data.user terisi; kalau kosong, verify JWT dari handshake */
  private ensureSocketUser(socket: AuthedSocket) {
    if (socket.data?.user?.id) return;
    const token = this.getTokenFromHandshake(socket);
    if (!token) return;

    try {
      const secret = this.config.get<string>('JWT_SECRET');
      const payload = secret
        ? this.jwt.verify(token, { secret })
        : (this.jwt.decode(token) as any);

      if (payload?.sub) {
        socket.data.user = {
          id: Number(payload.sub),
          role: payload.role,
        };
      }
    } catch (e) {
      this.logger.warn(`JWT verify failed in handleConnection: ${e}`);
    }
  }
  /**
   * Primitive auth for dev: read userId from handshake.auth.userId or query.userId
   * Replace with proper JWT verify and attach to socket.data.user
   */
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
      this.ensureSocketUser(socket);
      const role = socket.data?.user?.role;
      if (this.isStaff(role)) {
        socket.join('staff');
        this.logger.log(
          `Socket ${socket.id} (role=${role}) joined room 'staff'`,
        );
      } else {
        this.logger.log(
          `Socket ${socket.id} connected (role=${role ?? 'unknown'})`,
        );
      }

      if (!token) {
        socket.emit('error', 'Unauthorized');
        socket.disconnect(true);
        return;
      }

      const payload: any = await this.jwt.verifyAsync(token);
      const userId = Number(payload?.userId ?? payload?.id ?? payload?.sub);
      if (!userId || Number.isNaN(userId)) {
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
  // @SubscribeMessage('session.join')
  // async onJoin(
  //   @ConnectedSocket() socket: AuthedSocket,
  //   @MessageBody() payload: { sessionId: number },
  // ) {
  //   const userId = socket.data.user?.id;
  //   if (!userId) return { ok: false, error: 'unauthorized' };
  //   if (!payload?.sessionId || Number.isNaN(Number(payload.sessionId)))
  //     return { ok: false, error: 'invalid sessionId' };

  //   const [p] = await this.db
  //     .select()
  //     .from(chatSessionParticipants)
  //     .where(
  //       and(
  //         eq(chatSessionParticipants.sessionId, payload.sessionId),
  //         eq(chatSessionParticipants.userId, userId),
  //       ),
  //     );
  //   if (!p) return { ok: false, error: 'not a participant' };

  //   socket.join(`session:${payload.sessionId}`);
  //   return { ok: true };
  // }

  // Client asks to join a session room
  @SubscribeMessage('session.join')
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const user = socket.data.user;
    if (!user?.id) return { ok: false, error: 'unauthorized' };

    const sessionId = Number(payload?.sessionId);
    if (!Number.isInteger(sessionId)) {
      return { ok: false, error: 'invalid sessionId' };
    }

    // pastikan session ada
    const [s] = await this.db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (!s) return { ok: false, error: 'session not found' };

    // Staff boleh join meski bukan participant
    if (this.isStaff(user.role)) {
      socket.join(`session:${sessionId}`);
      return { ok: true, staff: true };
    }

    // Non-staff harus participant
    const [p] = await this.db
      .select({ id: chatSessionParticipants.id })
      .from(chatSessionParticipants)
      .where(
        and(
          eq(chatSessionParticipants.sessionId, sessionId),
          eq(chatSessionParticipants.userId, user.id),
        ),
      )
      .limit(1);

    if (!p) return { ok: false, error: 'not a participant' };

    socket.join(`session:${sessionId}`);
    return { ok: true, staff: false };
  }

  // Optional: client leaves a session room
  // @SubscribeMessage('session.leave')
  // async onLeave(
  //   @ConnectedSocket() socket: AuthedSocket,
  //   @MessageBody() payload: { sessionId: number },
  // ) {
  //   if (!payload?.sessionId) return { ok: false, error: 'invalid sessionId' };
  //   socket.leave(`session:${payload.sessionId}`);
  //   return { ok: true };
  // }

  @SubscribeMessage('session.leave')
  async onLeave(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const user = socket.data.user;
    if (!user?.id) return { ok: false, error: 'unauthorized' };

    const sessionId = Number(payload?.sessionId);
    if (!Number.isInteger(sessionId)) {
      return { ok: false, error: 'invalid sessionId' };
    }

    socket.leave(`session:${sessionId}`);
    return { ok: true };
  }

  // Optional: send message through WebSocket (uses ChatService for single source of truth)
  // @SubscribeMessage('message.send')
  // async onSend(
  //   @ConnectedSocket() socket: AuthedSocket,
  //   @MessageBody() payload: { sessionId: number; content: string },
  // ) {
  //   const userId = socket.data.user?.id;
  //   if (!userId) return { ok: false, error: 'unauthorized' };
  //   if (!payload?.sessionId || !payload?.content)
  //     return { ok: false, error: 'invalid payload' };

  //   const msg = await this.chat.sendMessage(payload.sessionId, userId, {
  //     content: payload.content,
  //   });

  //   // ChatService sudah emit event, tapi boleh juga balas langsung ke pengirim
  //   return { ok: true, message: msg };
  // }

  @SubscribeMessage('message.send')
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { sessionId: number; content: string },
  ) {
    const user = socket.data.user;
    if (!user?.id) return { ok: false, error: 'unauthorized' };

    const sessionId = Number(payload?.sessionId);
    const content = (payload?.content ?? '').trim();
    if (!Number.isInteger(sessionId) || !content) {
      return { ok: false, error: 'invalid payload' };
    }

    try {
      // STAFF (ADMIN/SUPPORT) boleh kirim ke sesi mana pun meski bukan participant
      if (user.role === 'ADMIN' || user.role === 'SUPPORT') {
        const res = await this.chat.adminSendMessage(
          { id: user.id, role: user.role },
          sessionId,
          { content },
        );
        // ChatService sudah emit event (message.created) → gateway akan broadcast ke room session & staff
        return { ok: true, message: res.message ?? res };
      }

      // NON-STAFF: harus participant (service akan validasi)
      const res = await this.chat.sendMessage(payload.sessionId, user.id, {
        content: payload.content,
      });

      // Normalisasi bentuk respons agar konsisten
      if ((res as any)?.message)
        return { ok: true, message: (res as any).message };
      if ((res as any)?.ok && (res as any).id) {
        return {
          ok: true,
          message: {
            id: (res as any).id,
            sessionId,
            senderId: user.id,
            content,
          },
        };
      }
      return { ok: true, message: res };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'failed to send message' };
    }
  }

  /** TANGKAP EVENT DAN BROADCAST payload lengkap */
  @OnEvent('chat.message.created')
  async handleMessageCreated(payload: {
    sessionId: number;
    message: any;
    senderRole?: string; // optional, tapi bagus ada
  }) {
    try {
      // tetap emit ke peserta sesi
      this.io.to(`session:${payload.sessionId}`).emit('message.new', {
        ...payload.message,
        senderIsStaff:
          payload.senderRole === 'ADMIN' ||
          payload.senderRole === 'SUPPORT' ||
          undefined,
      });

      // >>> INI YANG BELUM ADA: broadcast ke semua staff <<<
      const content = String(payload?.message?.content ?? '');
      const preview =
        content.length > 200 ? content.slice(0, 200) + '…' : content;

      this.io.to('staff').emit('staff.message.new', {
        sessionId: payload.sessionId,
        id: payload?.message?.id,
        senderId: payload?.message?.sender?.id ?? payload?.message?.senderId,
        contentPreview: preview,
        createdAt: payload?.message?.createdAt,
        senderIsStaff:
          payload.senderRole === 'ADMIN' ||
          payload.senderRole === 'SUPPORT' ||
          undefined,
      });

      // (opsional) bump list sesi di dashboard staff
      this.io.to('staff').emit('staff.session.bumped', {
        sessionId: payload.sessionId,
        lastMessageAt: payload?.message?.createdAt ?? new Date(),
      });
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
