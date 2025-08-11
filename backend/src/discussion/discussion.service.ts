import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  discussionRooms,
  discussionParticipants,
  discussionMessages,
} from '../db/schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { DiscussionSendMessageDto } from './dto/send-message.dto';

@Injectable()
export class DiscussionService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly events: EventEmitter2,
  ) {}

  async createRoom(
    actingUser: { id: number; role?: string },
    dto: CreateRoomDto,
  ) {
    if (actingUser.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can create discussion rooms.');
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
  }

  async listRooms() {
    const rooms = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.isPublic, true))
      .orderBy(desc(discussionRooms.updatedAt));

    const ids = rooms.map((r) => r.id);
    const lastMessages = ids.length
      ? await this.db
          .select()
          .from(discussionMessages)
          .where(
            inArray(
              discussionMessages.id,
              rooms.filter((r) => r.lastMessageId).map((r) => r.lastMessageId!),
            ),
          )
      : [];
    const lastMap = new Map(lastMessages.map((m) => [m.id, m] as const));

    return rooms.map((r) => ({
      ...r,
      lastMessage: r.lastMessageId
        ? (lastMap.get(r.lastMessageId) ?? null)
        : null,
    }));
  }

  async joinRoom(roomId: number, userId: number) {
    const [room] = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.id, roomId));
    if (!room) throw new NotFoundException('Room not found.');
    if (!room.isPublic) throw new ForbiddenException('Room is not public.');

    await this.db
      .insert(discussionParticipants)
      .values({ roomId, userId, role: 'member' })
      .onConflictDoNothing();
    return { ok: true };
  }

  async leaveRoom(roomId: number, userId: number) {
    const [room] = await this.db
      .select()
      .from(discussionRooms)
      .where(eq(discussionRooms.id, roomId));
    if (!room) throw new NotFoundException('Room not found.');

    await this.db
      .delete(discussionParticipants)
      .where(
        and(
          eq(discussionParticipants.roomId, roomId),
          eq(discussionParticipants.userId, userId),
        ),
      );
    return { ok: true };
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

    this.events.emit('discussion.message.created', {
      roomId,
      messageId: inserted.id,
    });
    return inserted;
  }

  async fetchMessages(roomId: number) {
    const rows = await this.db
      .select()
      .from(discussionMessages)
      .where(eq(discussionMessages.roomId, roomId))
      .orderBy(asc(discussionMessages.createdAt));
    return rows;
  }
}
