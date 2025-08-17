import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
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
    const last  = (row.lastName ?? '').trim();
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

  // Create or return existing one-to-one session by role (ADMIN/SUPPORT)
  async getOrCreateOneToOneSessionByRole(currentUserId: number, role: 'ADMIN' | 'SUPPORT') {
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
    return this.getOrCreateOneToOneSession(currentUserId, { targetUserId: u.id });
  }

  // Create or return existing one-to-one session
  async getOrCreateOneToOneSession(currentUserId: number, dto: CreateSessionDto) {
    if (currentUserId === dto.targetUserId) {
      throw new BadRequestException('Cannot create a one-to-one session with yourself.');
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
      throw new InternalServerErrorException('Failed to create or retrieve one-to-one session');
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
    const lmIds = sessions.filter((s) => s.lastMessageId).map((s) => s.lastMessageId!);
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
      lastMessage: s.lastMessageId ? (lastMap.get(s.lastMessageId) ?? null) : null,
    }));
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
}
