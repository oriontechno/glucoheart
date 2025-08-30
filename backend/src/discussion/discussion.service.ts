import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql, gte, lte, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  users,
  discussionRooms,
  discussionParticipants,
  discussionMessages,
} from '../db/schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { DiscussionSendMessageDto } from './dto/send-message.dto';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

@Injectable()
export class DiscussionService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly events: EventEmitter2,
  ) {}

  // --- helpers ---
  private toBool(v?: string) {
    if (v == null) return null;
    const s = String(v).toLowerCase();
    if (['1', 'true', 't', 'yes', 'y'].includes(s)) return true;
    if (['0', 'false', 'f', 'no', 'n'].includes(s)) return false;
    return null;
  }

  private buildWhere(params: {
    search?: string;
    isPublic?: string;
    createdBy?: string;
  }) {
    const conds: any[] = [];

    const b = this.toBool(params.isPublic);
    if (b !== null) conds.push(eq(discussionRooms.isPublic, b));

    const createdBy = params.createdBy ? Number(params.createdBy) : NaN;
    if (!Number.isNaN(createdBy))
      conds.push(eq(discussionRooms.createdBy, createdBy));

    if (params.search) {
      const q = `%${params.search}%`;
      conds.push(
        sql`(${discussionRooms.topic} ILIKE ${q} OR ${discussionRooms.description} ILIKE ${q})`,
      );
    }

    return conds.length ? and(...conds) : sql`true`;
  }

  private parseSort(sort?: string) {
    // kolom sort yang didukung
    const allowed: Record<string, any> = {
      id: discussionRooms.id,
      topic: discussionRooms.topic,
      created_at: discussionRooms.createdAt,
      updated_at: discussionRooms.updatedAt,
      last_message_at: discussionRooms.lastMessageAt,
      is_public: discussionRooms.isPublic,
    };
    const def = desc(
      discussionRooms.lastMessageAt ??
        discussionRooms.updatedAt ??
        discussionRooms.createdAt,
    );

    if (!sort) return [def];
    try {
      const arr = JSON.parse(sort);
      if (!Array.isArray(arr) || !arr.length) return [def];
      const res: any[] = [];
      for (const it of arr) {
        const col = allowed[it?.id as string];
        if (!col) continue;
        res.push(it?.desc ? desc(col) : asc(col));
      }
      return res.length ? res : [def];
    } catch {
      return [def];
    }
  }

  private parsePeriod(raw?: string): Period {
    const v = String(raw ?? 'all').toLowerCase();
    if (
      v === 'day' ||
      v === 'week' ||
      v === 'month' ||
      v === 'year' ||
      v === 'all'
    )
      return v;
    throw new BadRequestException(
      'Invalid period. Use day|week|month|year|all',
    );
  }

  private computeDefaultRange(period: Period): { from?: Date; to?: Date } {
    if (period === 'all') return {};
    const to = new Date();
    const from = new Date(to);
    switch (period) {
      case 'day':
        from.setDate(to.getDate() - 1); // 1 hari terakhir
        break;
      case 'week':
        from.setDate(to.getDate() - 7);
        break;
      case 'month':
        from.setMonth(to.getMonth() - 1); // 1 bulan terakhir
        break;
      case 'year':
        from.setFullYear(to.getFullYear() - 1); // 1 tahun terakhir
        break;
    }
    return { from, to };
  }

  private normalizeRange(period: Period, from?: string, to?: string) {
    const def = this.computeDefaultRange(period);
    const f = from ? new Date(from) : def.from;
    const t = to ? new Date(to) : def.to;
    if (f && isNaN(+f)) throw new BadRequestException('Invalid from date');
    if (t && isNaN(+t)) throw new BadRequestException('Invalid to date');
    return { from: f, to: t };
  }

  // ===== Helpers (sama seperti di articles/chats) =====
  private parseChartPeriod(raw?: string): Period {
    const v = String(raw ?? 'month').toLowerCase();
    if (v === 'day' || v === 'week' || v === 'month' || v === 'year')
      return v as Period;
    throw new BadRequestException('period must be one of: day|week|month|year');
  }

  private defaultRange(period: Period): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date(to);
    switch (period) {
      case 'day':
        from.setDate(to.getDate() - 29);
        break; // 30 hari
      case 'week':
        from.setDate(to.getDate() - 7 * 11);
        break; // 12 minggu
      case 'month':
        from.setMonth(to.getMonth() - 11);
        break; // 12 bulan
      case 'year':
        from.setFullYear(to.getFullYear() - 4);
        break; // 5 tahun
    }
    return { from, to };
  }

  // floor FROM ke awal bucket; TO → toExclusive = awal bucket berikutnya
  private normalizeRangeForChart(period: Period, from?: string, to?: string) {
    const def = this.defaultRange(period);
    const rawFrom = from ? new Date(from) : def.from;
    const rawTo = to ? new Date(to) : def.to;
    if (isNaN(+rawFrom) || isNaN(+rawTo))
      throw new BadRequestException('Invalid from/to date');

    const fromAligned = this.floorToPeriodStart(period, rawFrom);
    const toAlignedStart = this.floorToPeriodStart(period, rawTo);
    const toExclusive = this.addOneStep(period, toAlignedStart);

    if (fromAligned.getTime() >= toExclusive.getTime()) {
      throw new BadRequestException('from must be before to');
    }
    return {
      fromAligned,
      toExclusive,
      originalFrom: rawFrom,
      originalTo: rawTo,
    };
  }

  private floorToPeriodStart(period: Period, d: Date): Date {
    const x = new Date(d);
    x.setMilliseconds(0);
    x.setSeconds(0);
    x.setMinutes(0);
    x.setHours(0);
    if (period === 'day') return x;
    if (period === 'week') {
      // date_trunc('week') → Senin 00:00
      const dow = x.getDay(); // 0=Min..6=Sab
      const delta = (dow + 6) % 7;
      x.setDate(x.getDate() - delta);
      return x;
    }
    if (period === 'month') {
      x.setDate(1);
      return x;
    }
    x.setMonth(0, 1); // year
    return x;
  }

  private addOneStep(period: Period, d: Date): Date {
    const x = new Date(d);
    if (period === 'day') {
      x.setDate(x.getDate() + 1);
      return x;
    }
    if (period === 'week') {
      x.setDate(x.getDate() + 7);
      return x;
    }
    if (period === 'month') {
      x.setMonth(x.getMonth() + 1);
      return x;
    }
    x.setFullYear(x.getFullYear() + 1);
    return x; // year
  }

  // ================================== END HELPER ============================================== //

  // ====== SERVICE: growth discussion rooms ======
  async growthDiscussionRooms(params: {
    period?: string;
    from?: string;
    to?: string;
  }) {
    const period = this.parseChartPeriod(params.period);
    const { fromAligned, toExclusive, originalFrom, originalTo } =
      this.normalizeRangeForChart(period, params.from, params.to);

    const bucketExpr = sql<Date>`date_trunc(${sql.raw(`'${period}'`)}, ${discussionRooms.createdAt})`;

    // agregasi per bucket (yang ada datanya)
    const rows = await this.db
      .select({
        bucketStart: bucketExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(discussionRooms as any)
      .where(
        and(
          gte(discussionRooms.createdAt as any, fromAligned),
          lt(discussionRooms.createdAt as any, toExclusive),
        ),
      )
      .groupBy(bucketExpr)
      .orderBy(asc(bucketExpr));

    // map bucket → count
    const map = new Map<number, number>();
    for (const r of rows) {
      const d =
        r.bucketStart instanceof Date
          ? r.bucketStart
          : new Date(r.bucketStart as any);
      map.set(d.getTime(), r.count ?? 0);
    }

    // bangun deret bucket lengkap (bucket kosong = 0)
    const buckets: { start: string; count: number }[] = [];
    for (
      let cur = new Date(fromAligned);
      cur.getTime() < toExclusive.getTime();
      cur = this.addOneStep(period, cur)
    ) {
      const ts = cur.getTime();
      buckets.push({
        start: new Date(ts).toISOString(),
        count: map.get(ts) ?? 0,
      });
    }

    const total = buckets.reduce((a, b) => a + b.count, 0);

    return {
      success: true,
      time: new Date().toISOString(),
      period,
      from: originalFrom.toISOString(),
      to: originalTo.toISOString(),
      total,
      buckets,
    };
  }

  /**
   * Hitung jumlah discussion rooms (grup) dengan opsi range & period.
   * Query:
   * - period: 'day'|'week'|'month'|'year'|'all' (default: 'all')
   * - from, to: ISO date (opsional; bila period ≠ 'all' & tidak diisi -> default)
   */
  async countRooms(params: { period?: string; from?: string; to?: string }) {
    const period = this.parsePeriod(params.period);
    const { from, to } = this.normalizeRange(period, params.from, params.to);

    // WHERE dasar
    const whereParts: any[] = [];
    if (from) whereParts.push(gte(discussionRooms.createdAt as any, from));
    if (to) whereParts.push(lte(discussionRooms.createdAt as any, to));
    const where = whereParts.length ? and(...whereParts) : undefined;

    // ALL = total (atau total dalam range jika from/to ada)
    if (period === 'all') {
      const [{ total }] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(discussionRooms as any)
        .where(where);

      return {
        success: true,
        time: new Date().toISOString(),
        period,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        total,
        buckets: [],
      };
    }

    // Time-series per bucket (day/week/month/year) berdasarkan createdAt
    const bucketExpr = sql<Date>`
    date_trunc(${sql.raw(`'${period}'`)}, ${discussionRooms.createdAt})
  `;

    const rows = await this.db
      .select({
        bucketStart: bucketExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(discussionRooms as any)
      .where(where)
      .groupBy(bucketExpr)
      .orderBy(asc(bucketExpr));

    const total = rows.reduce((acc, r) => acc + (r.count ?? 0), 0);

    return {
      success: true,
      time: new Date().toISOString(),
      period,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      total,
      buckets: rows.map((r) => ({
        start:
          r.bucketStart instanceof Date
            ? r.bucketStart.toISOString()
            : String(r.bucketStart),
        count: r.count,
      })),
    };
  }

  // === GET /discussions/all ===
  async findAllSimple(params: {
    search?: string;
    isPublic?: string;
    createdBy?: string;
    limit?: number;
  }) {
    const where = this.buildWhere(params);
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 200);

    const rows = await this.db
      .select({
        id: discussionRooms.id,
        topic: discussionRooms.topic,
        description: discussionRooms.description,
        isPublic: discussionRooms.isPublic,
        createdBy: discussionRooms.createdBy,
        createdAt: discussionRooms.createdAt,
        updatedAt: discussionRooms.updatedAt,
        lastMessageAt: discussionRooms.lastMessageAt,
        lastMessageId: discussionRooms.lastMessageId,
        lastMessageContent: discussionMessages.content,
        lastMessageSenderId: discussionMessages.senderId,
      })
      .from(discussionRooms)
      .leftJoin(
        discussionMessages,
        eq(discussionMessages.id, discussionRooms.lastMessageId),
      )
      .where(where)
      .orderBy(
        desc(
          discussionRooms.lastMessageAt ??
            discussionRooms.updatedAt ??
            discussionRooms.createdAt,
        ),
      )
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      description: r.description ?? null,
      is_public: r.isPublic,
      created_by: r.createdBy ?? null,
      created_at: r.createdAt ?? null,
      updated_at: r.updatedAt ?? null,
      last_message_at: r.lastMessageAt ?? null,
      last_message: r.lastMessageContent ?? null,
      last_message_sender_id: r.lastMessageSenderId ?? null,
    }));
  }

  // === GET /discussions/search ===
  async findPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
    isPublic?: string;
    createdBy?: string;
    sort?: string; // JSON string: [{"id":"last_message_at","desc":true}]
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 100);
    const offset = (page - 1) * limit;

    const where = this.buildWhere(params);
    const orderBys = this.parseSort(params.sort);

    const totalRows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(discussionRooms)
      .where(where);

    const rows = await this.db
      .select({
        id: discussionRooms.id,
        topic: discussionRooms.topic,
        description: discussionRooms.description,
        isPublic: discussionRooms.isPublic,
        createdBy: discussionRooms.createdBy,
        createdAt: discussionRooms.createdAt,
        updatedAt: discussionRooms.updatedAt,
        lastMessageAt: discussionRooms.lastMessageAt,
        lastMessageId: discussionRooms.lastMessageId,
        lastMessageContent: discussionMessages.content,
        lastMessageSenderId: discussionMessages.senderId,
      })
      .from(discussionRooms)
      .leftJoin(
        discussionMessages,
        eq(discussionMessages.id, discussionRooms.lastMessageId),
      )
      .where(where)
      .orderBy(...orderBys)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'Discussion search results',
      total_discussions: totalRows[0]?.c ?? 0,
      offset,
      limit,
      discussions: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        description: r.description ?? null,
        is_public: r.isPublic,
        created_by: r.createdBy ?? null,
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null,
        last_message_at: r.lastMessageAt ?? null,
        last_message: r.lastMessageContent ?? null,
        last_message_sender_id: r.lastMessageSenderId ?? null,
      })),
    };
  }

  async createRoom(
    actingUser: { id: number; role?: string },
    dto: CreateRoomDto,
  ) {
    if (actingUser.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can create discussion rooms.');

    try {
      const [room] = await this.db
        .insert(discussionRooms)
        .values({
          topic: dto.topic,
          description: dto.description,
          isPublic: dto.isPublic ?? true,
          createdBy: actingUser.id,
        })
        .returning();

      // Optionally add creator as participant
      await this.db
        .insert(discussionParticipants)
        .values({ roomId: room.id, userId: actingUser.id, role: 'member' })
        .onConflictDoNothing();

      return room;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to create discussion room',
      );
    }
  }

  async updateRoom(
    actingUser: { id: number; role?: string },
    roomId: number,
    dto: UpdateRoomDto,
  ) {
    if (actingUser.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can update discussion rooms.');

    try {
      await this.db
        .update(discussionRooms)
        .set({
          topic: dto.topic,
          description: dto.description,
          isPublic: dto.isPublic,
        })
        .where(eq(discussionRooms.id, roomId));

      return this.getRoomById(roomId);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to update discussion room',
      );
    }
  }

  async deleteRoom(actingUser: { id: number; role?: string }, roomId: number) {
    if (actingUser.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can delete discussion rooms.');

    try {
      await this.db
        .delete(discussionRooms)
        .where(eq(discussionRooms.id, roomId));
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete discussion room',
      );
    }
  }

  async listRooms() {
    const rooms = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.isPublic, true))
      .orderBy(desc(discussionRooms.updatedAt));

    if (!rooms.length) return rooms.map((r) => ({ ...r, lastMessage: null }));

    // ambil lastMessage lengkap dengan user
    const lastIds = rooms
      .filter((r) => r.lastMessageId)
      .map((r) => r.lastMessageId!);
    const lastRows = lastIds.length
      ? await this.db
          .select({
            id: discussionMessages.id,
            roomId: discussionMessages.roomId,
            senderId: discussionMessages.senderId,
            content: discussionMessages.content,
            createdAt: discussionMessages.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture,
          })
          .from(discussionMessages)
          .leftJoin(users, eq(users.id, discussionMessages.senderId))
          .where(inArray(discussionMessages.id, lastIds))
      : [];

    const lastMap = new Map(lastRows.map((r) => [r.id, this.mapMessageRow(r)]));

    return rooms.map((r) => ({
      ...r,
      lastMessage: r.lastMessageId
        ? (lastMap.get(r.lastMessageId) ?? null)
        : null,
    }));
  }

  private async ensureCanPost(roomId: number, userId: number) {
    const [room] = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.id, roomId));
    if (!room) throw new NotFoundException('Room not found.');

    if (room.isPublic) {
      // auto-join on first post to keep participant table in sync
      await this.db
        .insert(discussionParticipants)
        .values({ roomId, userId, role: 'member' })
        .onConflictDoNothing();
      return;
    }

    // if later you support private rooms, enforce membership here
    const [p] = await this.db
      .select()
      .from(discussionParticipants)
      .where(
        and(
          eq(discussionParticipants.roomId, roomId),
          eq(discussionParticipants.userId, userId),
        ),
      );
    if (!p) throw new ForbiddenException('Not a participant of this room.');
  }

  async sendMessage(
    roomId: number,
    senderId: number,
    dto: DiscussionSendMessageDto,
  ) {
    // 1) Validasi & normalisasi konten
    let content = (dto?.content ?? '').trim();
    if (!content) throw new BadRequestException('content is required');

    // 2) Hormati aturan (room publik, ban/mute, dsb)
    await this.ensureCanPost(roomId, senderId);

    // 3) Insert message + bump room (pakai createdAt dari insert)
    const inserted = await this.db.transaction(async (tx) => {
      const [msg] = await tx
        .insert(discussionMessages)
        .values({ roomId, senderId, content })
        .returning();

      const ts = msg.createdAt ?? new Date();
      await tx
        .update(discussionRooms)
        .set({
          lastMessageId: msg.id,
          lastMessageAt: ts,
          updatedAt: ts,
        })
        .where(eq(discussionRooms.id, roomId));

      return msg;
    });

    // 4) Ambil lagi lengkap dengan info user (TERMASUK role) untuk payload & broadcast
    const [row] = await this.db
      .select({
        id: discussionMessages.id,
        roomId: discussionMessages.roomId,
        senderId: discussionMessages.senderId,
        content: discussionMessages.content,
        createdAt: discussionMessages.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
        role: users.role as any,
      })
      .from(discussionMessages)
      .leftJoin(users, eq(users.id, discussionMessages.senderId))
      .where(eq(discussionMessages.id, inserted.id))
      .limit(1);

    if (!row) {
      throw new InternalServerErrorException(
        'Message persisted but could not be reloaded',
      );
    }

    // 5) Bentuk payload final (pakai helper jika ada)
    const payload =
      typeof this.mapMessageRow === 'function'
        ? this.mapMessageRow(row)
        : {
            id: row.id,
            roomId: row.roomId,
            sender: {
              id: row.senderId,
              firstName: row.firstName,
              lastName: row.lastName,
              profilePicture: row.profilePicture,
              role: row.role,
            },
            content: row.content,
            createdAt: row.createdAt,
          };

    // 6) Emit event dengan senderRole dari DB (bukan dari payload) → menghindari error TS
    const senderRole = row.role as string | undefined;

    this.events.emit('discussion.message.created', {
      roomId,
      message: payload,
      senderRole,
    });

    return payload;
  }

  async fetchMessages(roomId: number) {
    const rows = await this.db
      .select({
        id: discussionMessages.id,
        roomId: discussionMessages.roomId,
        senderId: discussionMessages.senderId,
        content: discussionMessages.content,
        createdAt: discussionMessages.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
      })
      .from(discussionMessages)
      .leftJoin(users, eq(users.id, discussionMessages.senderId))
      .where(eq(discussionMessages.roomId, roomId))
      .orderBy(asc(discussionMessages.createdAt));

    return rows.map((r) => this.mapMessageRow(r));
  }

  private mapMessageRow(row: {
    id: number;
    roomId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    firstName?: string | null;
    lastName?: string | null;
    profilePicture?: string | null;
  }) {
    const first = (row.firstName ?? '').trim();
    const last = (row.lastName ?? '').trim();
    const fullName = `${first} ${last}`.trim();

    return {
      id: row.id,
      roomId: row.roomId,
      senderId: row.senderId,
      content: row.content,
      createdAt: row.createdAt,
      senderName: fullName || undefined, // biar frontend kebaca
      senderAvatar: row.profilePicture || undefined,
    };
  }

  /** Ambil detail 1 room publik berdasarkan ID. */
  async getRoomById(roomId: number) {
    if (!Number.isInteger(roomId)) {
      throw new BadRequestException('Invalid room id');
    }

    // 1) data room + info pembuat (bisa null jika user terhapus)
    const [roomRow] = await this.db
      .select({
        id: discussionRooms.id,
        topic: discussionRooms.topic,
        description: discussionRooms.description,
        isPublic: discussionRooms.isPublic,
        createdAt: discussionRooms.createdAt,
        updatedAt: discussionRooms.updatedAt,
        lastMessageId: discussionRooms.lastMessageId,
        lastMessageAt: discussionRooms.lastMessageAt,
        createdBy: discussionRooms.createdBy,

        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorAvatar: users.profilePicture,
        creatorId: users.id, // bisa null kalau createdBy null
      })
      .from(discussionRooms)
      .leftJoin(users, eq(users.id, discussionRooms.createdBy))
      .where(eq(discussionRooms.id, roomId))
      .limit(1);

    if (!roomRow) {
      throw new NotFoundException('Discussion room not found');
    }

    // 2) statistik: jumlah pesan & peserta
    const [{ c: messageCount }] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(discussionMessages)
      .where(eq(discussionMessages.roomId, roomId));

    const [{ c: participantCount }] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(discussionParticipants)
      .where(eq(discussionParticipants.roomId, roomId));

    // 3) ringkas last message (jika ada)
    let lastMessage: {
      id: number;
      content: string;
      createdAt: Date;
      sender: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        profilePicture: string | null;
        role: string | null;
      };
    } | null = null;

    if (roomRow.lastMessageId) {
      const [m] = await this.db
        .select({
          id: discussionMessages.id,
          content: discussionMessages.content,
          createdAt: discussionMessages.createdAt,

          senderId: discussionMessages.senderId,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          role: users.role as any,
        })
        .from(discussionMessages)
        .leftJoin(users, eq(users.id, discussionMessages.senderId))
        .where(eq(discussionMessages.id, roomRow.lastMessageId))
        .limit(1);

      if (m) {
        lastMessage = {
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          sender: {
            id: m.senderId,
            firstName: m.firstName ?? null,
            lastName: m.lastName ?? null,
            profilePicture: m.profilePicture ?? null,
            role: (m.role as any) ?? null,
          },
        };
      }
    }

    // 4) bentuk respons final
    return {
      id: roomRow.id,
      topic: roomRow.topic,
      description: roomRow.description,
      isPublic: !!roomRow.isPublic,

      createdAt: roomRow.createdAt,
      updatedAt: roomRow.updatedAt,

      lastMessageId: roomRow.lastMessageId ?? null,
      lastMessageAt: roomRow.lastMessageAt ?? null,
      lastMessage,

      createdBy: roomRow.createdBy ?? null,
      creator: roomRow.creatorId
        ? {
            id: roomRow.creatorId,
            firstName: roomRow.creatorFirstName ?? null,
            lastName: roomRow.creatorLastName ?? null,
            profilePicture: roomRow.creatorAvatar ?? null,
          }
        : null,

      stats: {
        messageCount,
        participantCount,
      },
    };
  }
}
