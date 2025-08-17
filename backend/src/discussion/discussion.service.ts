import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
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
    const lastIds = rooms.filter(r => r.lastMessageId).map(r => r.lastMessageId!);
    const lastRows = lastIds.length ? await this.db
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

    const lastMap = new Map(lastRows.map(r => [r.id, this.mapMessageRow(r)]));

    return rooms.map((r) => ({
      ...r,
      lastMessage: r.lastMessageId ? (lastMap.get(r.lastMessageId) ?? null) : null,
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
    await this.ensureCanPost(roomId, senderId);

    const inserted = await this.db.transaction(async (tx) => {
      const [msg] = await tx
        .insert(discussionMessages)
        .values({ roomId, senderId, content: dto.content })
        .returning();

      await tx
        .update(discussionRooms)
        .set({
          lastMessageId: msg.id,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(discussionRooms.id, roomId));

      return msg;
    });

    // ambil lagi lengkap dengan user untuk response + broadcast
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
      })
      .from(discussionMessages)
      .leftJoin(users, eq(users.id, discussionMessages.senderId))
      .where(eq(discussionMessages.id, inserted.id))
      .limit(1);

    const payload = this.mapMessageRow(row);

    // event untuk websocket/gateway (kalau ada)
    this.events.emit('discussion.message.created', payload);

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
    const last  = (row.lastName ?? '').trim();
    const fullName = `${first} ${last}`.trim();

    return {
      id: row.id,
      roomId: row.roomId,
      senderId: row.senderId,
      content: row.content,
      createdAt: row.createdAt,
      senderName: fullName || undefined,         // biar frontend kebaca
      senderAvatar: row.profilePicture || undefined,
    };
  }
  
}
