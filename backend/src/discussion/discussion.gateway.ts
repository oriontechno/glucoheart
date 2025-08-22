import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard'; // sesuaikan path
import { DiscussionService } from './discussion.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

type AuthedSocket = Socket & {
  data: { user?: { id: number; role?: string; email?: string } };
};

@WebSocketGateway({ namespace: 'discussion', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class DiscussionGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger(DiscussionGateway.name);

  // === room global publik ===
  private readonly PUBLIC_ROOM = 'discussion:public';

  constructor(
    private readonly discussion: DiscussionService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
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

  // === OTOMATIS JOIN ROOM GLOBAL PUBLIK + STAFF ===
  handleConnection(socket: AuthedSocket) {
    this.ensureSocketUser(socket);
    const role = socket.data?.user?.role;
    const uid = socket.data?.user?.id;

    // semua user login masuk feed publik
    if (uid) {
      socket.join(this.PUBLIC_ROOM);
      this.logger.log(
        `Socket ${socket.id} user=${uid} joined '${this.PUBLIC_ROOM}'`,
      );
    }

    // staff juga join room staff untuk monitoring global
    if (this.isStaff(role)) {
      socket.join('staff');
      this.logger.log(`Socket ${socket.id} (role=${role}) joined room 'staff'`);
    } else {
      this.logger.log(`Socket ${socket.id} connected (role=${role})`);
    }
  }

  // ========= (opsional) SUBSCRIBE PER ROOM — now NOT REQUIRED =========
  // @SubscribeMessage('discussion.subscribe')
  // async onSubscribe(
  //   @ConnectedSocket() socket: AuthedSocket,
  //   @MessageBody() payload: { roomId: number },
  // ) {
  //   const userId = socket.data.user?.id;
  //   if (!userId) return { ok: false, error: 'unauthorized' };
  //   const roomId = Number(payload?.roomId);
  //   if (!Number.isInteger(roomId))
  //     return { ok: false, error: 'invalid roomId' };

  //   socket.join(`discussion:${roomId}`);
  //   return { ok: true };
  // }

  // @SubscribeMessage('discussion.unsubscribe')
  // async onUnsubscribe(
  //   @ConnectedSocket() socket: AuthedSocket,
  //   @MessageBody() payload: { roomId: number },
  // ) {
  //   const userId = socket.data.user?.id;
  //   if (!userId) return { ok: false, error: 'unauthorized' };
  //   const roomId = Number(payload?.roomId);
  //   if (!Number.isInteger(roomId))
  //     return { ok: false, error: 'invalid roomId' };

  //   socket.leave(`discussion:${roomId}`);
  //   return { ok: true };
  // }

  // ========= KIRIM PESAN TANPA SUBSCRIBE =========
  @SubscribeMessage('discussion.message.send')
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: { roomId: number; content: string },
  ) {
    const user = socket.data.user;
    if (!user?.id) return { ok: false, error: 'unauthorized' };

    const roomId = Number(payload?.roomId);
    const content = (payload?.content ?? '').trim();
    if (!Number.isInteger(roomId) || roomId <= 0 || !content) {
      return { ok: false, error: 'invalid payload' };
    }

    try {
      // sesuai signature service: (roomId, senderId, dto)
      const msg = await this.discussion.sendMessage(roomId, user.id, {
        content,
      });
      // Ack ke pengirim; broadcast realtime terjadi via @OnEvent di bawah
      return { ok: true, message: msg };
    } catch (e: any) {
      this.logger.error('discussion.message.send error: ' + (e?.message ?? e));
      return { ok: false, error: e?.message ?? 'failed to send message' };
    }
  }

  // ========= RE-BROADCAST EVENT KE FEED PUBLIK (tanpa subscribe) =========
  /**
   * Pastikan service meng-emit:
   * this.events.emit('discussion.message.created', {
   *   roomId,
   *   message: { id, roomId, senderId, content, createdAt, sender?: {...} },
   *   senderRole: acting.role, // optional tapi bagus
   * });
   */
  @OnEvent('discussion.message.created')
  onDiscussionMessageCreated(evt: {
    roomId: number;
    message: any;
    senderRole?: string;
  }) {
    const senderIsStaff =
      evt.senderRole === 'ADMIN' || evt.senderRole === 'SUPPORT';

    // 1) FEED PUBLIK (semua user login yang terkoneksi) — TANPA SUBSCRIBE
    // Client cukup listen 'discussion.message.new' → akan menerima SEMUA pesan publik.
    // (UI bisa filter berdasarkan evt.message.roomId jika hanya menampilkan room tertentu.)
    this.server.to(this.PUBLIC_ROOM).emit('discussion.message.new', {
      ...evt.message,
      senderIsStaff: senderIsStaff || undefined,
    });

    // 2) (opsional) juga emit ke room spesifik, untuk klien lama yang masih subscribe per room
    this.server.to(`discussion:${evt.roomId}`).emit('discussion.message.new', {
      ...evt.message,
      senderIsStaff: senderIsStaff || undefined,
    });

    // 3) feed global staff (monitor)
    const raw =
      typeof evt.message?.content === 'string' ? evt.message.content : '';
    const preview = raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
    this.server.to('staff').emit('staff.discussion.message.new', {
      roomId: evt.roomId,
      id: evt.message?.id,
      senderId: evt.message?.sender?.id ?? evt.message?.senderId,
      contentPreview: preview,
      createdAt: evt.message?.createdAt,
      senderIsStaff: senderIsStaff || undefined,
    });
  }
}
