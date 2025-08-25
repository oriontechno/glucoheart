import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  gte,
  lte,
  not,
  isNull,
  lt,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  chatSessionParticipants,
  chatSessions,
  messages,
  users,
} from '../db/schema';
import {
  CreateSessionDto,
  CreateSessionByRoleDto,
  ChatTargetRole,
} from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-messages.dto';
import { AssignNurseDto } from './dto/assign-nurse.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Inject } from '@nestjs/common';

type Acting = { id: number; role?: string };

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
type SessionType = 'one_to_one' | 'group';

@Injectable()
export class ChatService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly events: EventEmitter2,
  ) {}

  private normalizePair(a: number, b: number): { a: number; b: number } {
    return a < b ? { a, b } : { a: b, b: a };
  }

  private assertAdmin(role?: string) {
    if (role !== 'ADMIN' && role !== 'SUPPORT') {
      throw new ForbiddenException('Admin only');
    }
  }

  private async ensureUserIsParticipant(sessionId: number, userId: number) {
    const [p] = await this.db
      .select()
      .from(chatSessionParticipants)
      .where(
        and(
          eq(chatSessionParticipants.sessionId, sessionId),
          eq(chatSessionParticipants.userId, userId),
        ),
      );
    if (!p) throw new ForbiddenException('Not a participant of this session.');
  }

  /** helper untuk melengkapi message + info user */
  private mapMessageRow(row: {
    id: number;
    sessionId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    firstName?: string | null;
    lastName?: string | null;
    profilePicture?: string | null;
    role?: string | null;
  }) {
    const first = (row.firstName ?? '').trim();
    const last = (row.lastName ?? '').trim();
    const fullName = `${first} ${last}`.trim();

    return {
      id: row.id,
      sessionId: row.sessionId,
      senderId: row.senderId,
      content: row.content,
      createdAt: row.createdAt,
      senderName: fullName || undefined,
      senderAvatar: row.profilePicture || undefined,
      senderRole: row.role || undefined, // <— penting: role pengirim
    };
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

  private parseType(raw?: string): SessionType | null {
    if (!raw || raw.toLowerCase() === 'all') return null;
    const v = raw.toLowerCase();
    if (v === 'one_to_one' || v === 'group') return v as SessionType;
    throw new BadRequestException('Invalid type. Use one_to_one|group|all');
  }

  private parseAssigned(raw?: string): boolean | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const v = String(raw).toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    throw new BadRequestException('Invalid assigned. Use true|false');
  }

  // ===== Helpers period/range (copy sama seperti di Articles) =====
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
        break; // 30 hari terakhir
      case 'week':
        from.setDate(to.getDate() - 7 * 11);
        break; // 12 minggu terakhir
      case 'month':
        from.setMonth(to.getMonth() - 11);
        break; // 12 bulan terakhir
      case 'year':
        from.setFullYear(to.getFullYear() - 4);
        break; // 5 tahun terakhir
    }
    return { from, to };
  }

  // floor FROM ke awal bucket; TO → toExclusive (awal bucket berikutnya)
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
      const delta = (dow + 6) % 7; // mundur ke Senin
      x.setDate(x.getDate() - delta);
      return x;
    }
    if (period === 'month') {
      x.setDate(1);
      return x;
    }
    // year
    x.setMonth(0, 1);
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

  // ==================================== END HELPER ==================================== //

  // ====== SERVICE: growth chat sessions ======
  async growthChatSessions(params: {
    period?: string;
    from?: string;
    to?: string;
  }) {
    const period = this.parseChartPeriod(params.period);
    const { fromAligned, toExclusive, originalFrom, originalTo } =
      this.normalizeRangeForChart(period, params.from, params.to);

    const bucketExpr = sql<Date>`date_trunc(${sql.raw(`'${period}'`)}, ${chatSessions.createdAt})`;

    // agregasi per bucket (yang ada datanya)
    const rows = await this.db
      .select({
        bucketStart: bucketExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(chatSessions as any)
      .where(
        and(
          gte(chatSessions.createdAt as any, fromAligned),
          lt(chatSessions.createdAt as any, toExclusive),
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

    // bangun deret bucket lengkap (isi yang kosong = 0)
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
   * Hitung jumlah chatSessions dengan opsi range/period/type/assigned.
   * Query:
   * - period: 'day'|'week'|'month'|'year'|'all'
   * - from, to: ISO date (opsional)
   * - type: 'one_to_one'|'group'|'all' (default: all)
   * - assigned: 'true'|'false' (opsional) -> cek assignedNurseId null / non-null
   */
  async countSessions(params: {
    period?: string;
    from?: string;
    to?: string;
    type?: string;
    assigned?: string;
  }) {
    const period = this.parsePeriod(params.period);
    const { from, to } = this.normalizeRange(period, params.from, params.to);
    const type = this.parseType(params.type);
    const assigned = this.parseAssigned(params.assigned);

    // WHERE
    const whereParts: any[] = [];
    if (from) whereParts.push(gte(chatSessions.createdAt as any, from));
    if (to) whereParts.push(lte(chatSessions.createdAt as any, to));
    if (type) whereParts.push(eq(chatSessions.type as any, type));
    if (assigned === true)
      whereParts.push(not(isNull(chatSessions.assignedNurseId as any)));
    if (assigned === false)
      whereParts.push(isNull(chatSessions.assignedNurseId as any));
    const where = whereParts.length ? and(...whereParts) : undefined;

    // ALL = total saja (atau total di dalam range jika from/to ada)
    if (period === 'all') {
      const [{ total }] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(chatSessions as any)
        .where(where);
      return {
        success: true,
        time: new Date().toISOString(),
        period,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        filters: { type: type ?? 'all', assigned: assigned ?? null },
        total,
        buckets: [],
      };
    }

    // bucket per period (pakai createdAt)
    const bucketExpr = sql<Date>`date_trunc(${sql.raw(`'${period}'`)}, ${chatSessions.createdAt})`;

    const rows = await this.db
      .select({
        bucketStart: bucketExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(chatSessions as any)
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
      filters: { type: type ?? 'all', assigned: assigned ?? null },
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

  // Create or return existing one-to-one session by role (ADMIN/SUPPORT)
  async getOrCreateOneToOneSessionByRole(
    currentUserId: number,
    role: 'ADMIN' | 'SUPPORT',
  ) {
    const [u] = await this.db
      .select({ id: users.id })
      .from(users as any)
      .where(
        (users as any).role
          ? eq((users as any).role, role as any)
          : eq(users.id, -1),
      )
      .limit(1);

    if (!u) throw new NotFoundException(`No available user with role ${role}.`);
    return this.getOrCreateOneToOneSession(currentUserId, {
      targetUserId: u.id,
    });
  }

  // Create or return existing one-to-one session
  async getOrCreateOneToOneSession(
    currentUserId: number,
    dto: CreateSessionDto,
  ) {
    if (currentUserId === dto.targetUserId) {
      throw new BadRequestException(
        'Cannot create a one-to-one session with yourself.',
      );
    }
    const pair = this.normalizePair(currentUserId, dto.targetUserId);

    try {
      const existing = await this.db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.type, 'one_to_one'),
            eq(chatSessions.userAId, pair.a),
            eq(chatSessions.userBId, pair.b),
          ),
        );

      if (existing.length > 0) {
        const session = existing[0];
        await this.db
          .insert(chatSessionParticipants)
          .values([
            { sessionId: session.id, userId: currentUserId, role: 'member' },
            { sessionId: session.id, userId: dto.targetUserId, role: 'member' },
          ])
          .onConflictDoNothing();
        return session;
      }

      return await this.db.transaction(async (tx) => {
        const [session] = await tx
          .insert(chatSessions)
          .values({ type: 'one_to_one', userAId: pair.a, userBId: pair.b })
          .returning();

        await tx.insert(chatSessionParticipants).values([
          { sessionId: session.id, userId: currentUserId, role: 'member' },
          { sessionId: session.id, userId: dto.targetUserId, role: 'member' },
        ]);

        return session;
      });
    } catch (error) {
      console.error('Failed to create or retrieve one-to-one session:', error);
      throw new InternalServerErrorException(
        'Failed to create or retrieve one-to-one session',
      );
    }
  }

  // Send a message within a session
  async sendMessage(sessionId: number, senderId: number, dto: SendMessageDto) {
    try {
      await this.ensureUserIsParticipant(sessionId, senderId);

      const inserted = await this.db.transaction(async (tx) => {
        const [msg] = await tx
          .insert(messages)
          .values({ sessionId, senderId, content: dto.content })
          .returning();

        await tx
          .update(chatSessions)
          .set({
            lastMessageId: msg.id,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(chatSessions.id, sessionId));

        return msg;
      });

      // Lengkapi message dengan user info
      const [row] = await this.db
        .select({
          id: messages.id,
          sessionId: messages.sessionId,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          role: (users as any).role,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.id, inserted.id))
        .limit(1);

      const payload = this.mapMessageRow(row);

      // Emit event untuk gateway
      this.events.emit('chat.message.created', {
        sessionId,
        message: payload, // <— kirim payload lengkap (bukan hanya id)
      });

      return payload;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  // Fetch messages in ascending chronological order
  async fetchMessages(sessionId: number, userId: number) {
    try {
      await this.ensureUserIsParticipant(sessionId, userId);

      const rows = await this.db
        .select({
          id: messages.id,
          sessionId: messages.sessionId,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          role: (users as any).role,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.sessionId, sessionId))
        .orderBy(asc(messages.createdAt));

      return rows.map((r) => this.mapMessageRow(r));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw new InternalServerErrorException('Failed to fetch messages');
    }
  }

  // List sessions a user participates in, including last message info & assigned nurse
  async listSessions(userId: number) {
    const parts = await this.db
      .select({ sessionId: chatSessionParticipants.sessionId })
      .from(chatSessionParticipants)
      .where(eq(chatSessionParticipants.userId, userId));

    const sessionIds = parts.map((p) => p.sessionId);
    if (sessionIds.length === 0) return [];

    const sessions = await this.db
      .select()
      .from(chatSessions)
      .where(inArray(chatSessions.id, sessionIds))
      .orderBy(desc(chatSessions.updatedAt));

    const participants = await this.db
      .select()
      .from(chatSessionParticipants)
      .where(inArray(chatSessionParticipants.sessionId, sessionIds));

    // ambil last messages join users
    const lmIds = sessions
      .filter((s) => s.lastMessageId)
      .map((s) => s.lastMessageId!);
    const lmRows = lmIds.length
      ? await this.db
          .select({
            id: messages.id,
            sessionId: messages.sessionId,
            senderId: messages.senderId,
            content: messages.content,
            createdAt: messages.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture,
            role: (users as any).role,
          })
          .from(messages)
          .leftJoin(users, eq(users.id, messages.senderId))
          .where(inArray(messages.id, lmIds))
      : [];

    const lastMap = new Map(lmRows.map((r) => [r.id, this.mapMessageRow(r)]));

    const participantsBySession = new Map<number, typeof participants>();
    for (const p of participants) {
      const arr = participantsBySession.get(p.sessionId) ?? [];
      arr.push(p);
      participantsBySession.set(p.sessionId, arr);
    }

    return sessions.map((s) => ({
      ...s,
      participants: participantsBySession.get(s.id) ?? [],
      lastMessage: s.lastMessageId
        ? (lastMap.get(s.lastMessageId) ?? null)
        : null,
    }));
  }

  async listAllSessionsAdmin(
    acting: Acting,
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      type?: 'one_to_one' | 'group';
    },
  ) {
    this.assertAdmin(acting.role);

    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(opts.limit) || 20));
    const offset = (page - 1) * limit;

    // --- base where
    const whereParts: any[] = [];
    if (opts.type) {
      whereParts.push(eq(chatSessions.type, opts.type as any));
    }

    // --- search by participant's name/email via EXISTS
    if (opts.search && opts.search.trim()) {
      const q = `%${opts.search.trim()}%`;
      whereParts.push(
        sql`EXISTS (
          SELECT 1
          FROM ${chatSessionParticipants} p
          JOIN ${users} u ON u.id = p.user_id
          WHERE p.session_id = ${chatSessions.id}
            AND (
              u.first_name ILIKE ${q} OR
              u.last_name  ILIKE ${q} OR
              u.email      ILIKE ${q}
            )
        )`,
      );
    }

    const whereExpr = whereParts.length ? and(...whereParts) : undefined;

    // --- total
    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(chatSessions)
      .where(whereExpr);

    // --- sessions page (join nurse user untuk nama)
    const nurse = alias(users, 'nurse'); // ✅ benar
    const sessRows = await this.db
      .select({
        id: chatSessions.id,
        type: chatSessions.type,
        assignedNurseId: chatSessions.assignedNurseId,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        nurseId: nurse.id,
        nurseFirstName: nurse.firstName,
        nurseLastName: nurse.lastName,
        nurseEmail: nurse.email,
      })
      .from(chatSessions)
      .leftJoin(nurse, eq(nurse.id, chatSessions.assignedNurseId))
      .where(whereExpr)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit)
      .offset(offset);

    const sessionIds = sessRows.map((s: any) => s.id);
    if (sessionIds.length === 0) {
      return {
        success: true,
        time: new Date().toISOString(),
        total,
        offset,
        limit,
        sessions: [],
      };
    }

    // --- participants (semua user di session tsb)
    const parts = await this.db
      .select({
        sessionId: chatSessionParticipants.sessionId,
        userId: chatSessionParticipants.userId,
        role: chatSessionParticipants.role,
        joinedAt: chatSessionParticipants.joinedAt,
        uId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.role,
      })
      .from(chatSessionParticipants)
      .innerJoin(users, eq(users.id, chatSessionParticipants.userId))
      .where(inArray(chatSessionParticipants.sessionId, sessionIds));

    const participantsMap = new Map<number, any[]>();
    for (const p of parts) {
      if (!participantsMap.has(p.sessionId))
        participantsMap.set(p.sessionId, []);
      participantsMap.get(p.sessionId)!.push({
        userId: p.userId,
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role, // role di session (member/nurse/member-etc)
        userRole: p.userRole, // role global user (ADMIN/NURSE/USER/...)
        joinedAt: p.joinedAt,
      });
    }

    // --- last message (ambil 1 terakhir per sessionId)
    const msgs = await this.db
      .select({
        id: messages.id,
        sessionId: messages.sessionId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.sessionId, sessionIds))
      .orderBy(messages.sessionId, desc(messages.createdAt));

    const lastMap = new Map<
      number,
      { id: number; content: string; createdAt: Date }
    >();
    for (const m of msgs) {
      if (!lastMap.has(m.sessionId)) {
        lastMap.set(m.sessionId, {
          id: m.id,
          content: m.content,
          createdAt: m.createdAt as Date,
        });
      }
    }

    // --- susun payload
    const sessions = sessRows.map((s: any) => {
      const nurse =
        s.nurseId != null
          ? {
              id: s.nurseId,
              firstName: s.nurseFirstName,
              lastName: s.nurseLastName,
              email: s.nurseEmail,
            }
          : null;

      const last = lastMap.get(s.id);
      const lastPreview = last?.content?.length
        ? last.content.length > 200
          ? last.content.slice(0, 200) + '…'
          : last.content
        : null;

      return {
        id: s.id,
        type: s.type,
        assignedNurseId: s.assignedNurseId ?? null,
        nurse,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        lastMessageAt: last?.createdAt ?? null,
        lastMessage: lastPreview,
        participants: participantsMap.get(s.id) ?? [],
      };
    });

    return {
      success: true,
      time: new Date().toISOString(),
      total,
      offset,
      limit,
      sessions,
    };
  }

  // Assign or reassign a nurse to a 1:1 session
  async assignNurse(
    sessionId: number,
    actingUser: { id: number; role?: string },
    dto: AssignNurseDto,
  ) {
    const allowed =
      actingUser?.role === 'ADMIN' || actingUser?.role === 'SUPPORT';
    if (!allowed)
      throw new ForbiddenException('Only admin/support may assign a nurse.');

    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId));
    if (!session) throw new NotFoundException('Session not found.');
    if (session.type !== 'one_to_one')
      throw new BadRequestException(
        'Nurse assignment only allowed for one-to-one sessions.',
      );

    try {
      const updated = await this.db.transaction(async (tx) => {
        await tx
          .delete(chatSessionParticipants)
          .where(
            and(
              eq(chatSessionParticipants.sessionId, sessionId),
              eq(chatSessionParticipants.role, 'nurse'),
            ),
          );

        await tx
          .insert(chatSessionParticipants)
          .values({ sessionId, userId: dto.nurseId, role: 'nurse' });

        const [s] = await tx
          .update(chatSessions)
          .set({ assignedNurseId: dto.nurseId, updatedAt: new Date() })
          .where(eq(chatSessions.id, sessionId))
          .returning();

        return s;
      });

      this.events.emit('chat.nurse.assigned', {
        sessionId,
        nurseId: dto.nurseId,
      });
      return updated;
    } catch (error) {
      console.error('Failed to assign nurse:', error);
      throw new InternalServerErrorException('Failed to assign nurse');
    }
  }

  // ================================================================
  // =============   ADMIN/SUPPORT READ ALL MESSAGES   =============
  // ================================================================
  async adminFetchMessages(
    acting: Acting,
    sessionId: number,
    opts: { page?: number; limit?: number } = {},
  ) {
    this.assertAdmin(acting.role);

    // pastikan session ada
    const [sess] = await this.db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (!sess) throw new NotFoundException('Session not found');

    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
    const offset = (page - 1) * limit;

    // total
    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.sessionId, sessionId));

    // fetch messages + info pengirim
    const sender = users; // no alias needed
    const rows = await this.db
      .select({
        id: messages.id,
        sessionId: messages.sessionId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        firstName: sender.firstName,
        lastName: sender.lastName,
        email: sender.email,
        role: sender.role,
      })
      .from(messages)
      .innerJoin(sender, eq(sender.id, messages.senderId))
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt) // ASC (dari lama ke baru)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      sessionId,
      total,
      page,
      limit,
      messages: rows.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        content: m.content,
        created_at: m.createdAt,
        sender: {
          id: m.senderId,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          role: m.role, // global role user
        },
      })),
    };
  }

  // ================================================================
  // =============   ADMIN/SUPPORT SEND TO ANY SESSION   ============
  // ================================================================
  // async adminSendMessage(
  //   acting: Acting,
  //   sessionId: number,
  //   dto: { content: string },
  // ) {
  //   this.assertAdmin(acting.role);

  //   if (!dto?.content || !dto.content.trim()) {
  //     throw new BadRequestException('content is required');
  //   }

  //   // pastikan session ada
  //   const [sess] = await this.db
  //     .select()
  //     .from(chatSessions)
  //     .where(eq(chatSessions.id, sessionId))
  //     .limit(1);
  //   if (!sess) throw new NotFoundException('Session not found');

  //   // insert message atas nama admin/support (meskipun bukan participant)
  //   const now = new Date();
  //   const [msg] = await this.db
  //     .insert(messages)
  //     .values({
  //       sessionId,
  //       senderId: acting.id,
  //       content: dto.content.trim(),
  //       createdAt: now, // jika kolom ada default now() juga tidak masalah
  //     } as any)
  //     .returning();

  //   // update timestamp session untuk menggelembungkan ke atas di listing
  //   await this.db
  //     .update(chatSessions)
  //     .set({ updatedAt: new Date() } as any)
  //     .where(eq(chatSessions.id, sessionId));

  //   return {
  //     ok: true,
  //     message: {
  //       id: msg.id,
  //       sessionId,
  //       senderId: acting.id,
  //       content: msg.content,
  //       createdAt: msg.createdAt,
  //     },
  //   };
  // }

  async adminSendMessage(
    acting: { id: number; role?: string },
    sessionId: number,
    dto: { content: string },
  ) {
    // pastikan role admin/support (pakai assertAdmin milikmu kalau sudah ada)
    if (acting.role !== 'ADMIN' && acting.role !== 'SUPPORT') {
      throw new BadRequestException('Admin/Support only');
    }

    const content = dto?.content?.trim();
    if (!content) {
      throw new BadRequestException('content is required');
    }

    // pastikan session ada
    const [sess] = await this.db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (!sess) throw new NotFoundException('Session not found');

    try {
      // insert + update lastMessageId/At dalam transaksi
      const inserted = await this.db.transaction(async (tx) => {
        const [msg] = await tx
          .insert(messages)
          .values({
            sessionId,
            senderId: acting.id,
            content,
          } as any)
          .returning();

        const now = new Date();
        await tx
          .update(chatSessions)
          .set({
            lastMessageId: msg.id,
            lastMessageAt: now,
            updatedAt: now,
          } as any)
          .where(eq(chatSessions.id, sessionId));

        return msg;
      });

      // ambil message + info pengirim (mirror cara di sendMessage user)
      const [row] = await this.db
        .select({
          id: messages.id,
          sessionId: messages.sessionId,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          role: users.role as any,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.id, inserted.id))
        .limit(1);

      // gunakan helper kamu kalau ada
      const payload = this.mapMessageRow
        ? this.mapMessageRow(row)
        : {
            id: row.id,
            sessionId: row.sessionId,
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

      // Emit event untuk gateway (ikutkan senderRole agar gateway bisa flag senderIsStaff)
      this.events.emit('chat.message.created', {
        sessionId,
        message: payload,
        senderRole: acting.role ?? row?.role, // <— penting agar gateway bisa flag staff
      });

      return { ok: true, message: payload };
    } catch (error) {
      console.error('Failed to send admin message:', error);
      throw new InternalServerErrorException('Failed to send message');
    }
  }
}
