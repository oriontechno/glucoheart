"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscussionService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const common_2 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schema_1 = require("../db/schema");
let DiscussionService = class DiscussionService {
    db;
    events;
    constructor(db, events) {
        this.db = db;
        this.events = events;
    }
    async createRoom(actingUser, dto) {
        if (actingUser.role !== 'ADMIN')
            throw new common_1.ForbiddenException('Only admin can create discussion rooms.');
        const [room] = await this.db
            .insert(schema_1.discussionRooms)
            .values({
            topic: dto.topic,
            description: dto.description,
            isPublic: dto.isPublic ?? true,
            createdBy: actingUser.id,
        })
            .returning();
        await this.db
            .insert(schema_1.discussionParticipants)
            .values({ roomId: room.id, userId: actingUser.id, role: 'member' })
            .onConflictDoNothing();
        return room;
    }
    async listRooms() {
        const rooms = await this.db
            .select()
            .from(schema_1.discussionRooms)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.isPublic, true))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.discussionRooms.updatedAt));
        const ids = rooms.map((r) => r.id);
        const lastMessages = ids.length
            ? await this.db
                .select()
                .from(schema_1.discussionMessages)
                .where((0, drizzle_orm_1.inArray)(schema_1.discussionMessages.id, rooms.filter((r) => r.lastMessageId).map((r) => r.lastMessageId)))
            : [];
        const lastMap = new Map(lastMessages.map((m) => [m.id, m]));
        return rooms.map((r) => ({
            ...r,
            lastMessage: r.lastMessageId
                ? (lastMap.get(r.lastMessageId) ?? null)
                : null,
        }));
    }
    async joinRoom(roomId, userId) {
        const [room] = await this.db
            .select()
            .from(schema_1.discussionRooms)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.id, roomId));
        if (!room)
            throw new common_1.NotFoundException('Room not found.');
        if (!room.isPublic)
            throw new common_1.ForbiddenException('Room is not public.');
        await this.db
            .insert(schema_1.discussionParticipants)
            .values({ roomId, userId, role: 'member' })
            .onConflictDoNothing();
        return { ok: true };
    }
    async leaveRoom(roomId, userId) {
        const [room] = await this.db
            .select()
            .from(schema_1.discussionRooms)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.id, roomId));
        if (!room)
            throw new common_1.NotFoundException('Room not found.');
        await this.db
            .delete(schema_1.discussionParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.discussionParticipants.roomId, roomId), (0, drizzle_orm_1.eq)(schema_1.discussionParticipants.userId, userId)));
        return { ok: true };
    }
    async ensureCanPost(roomId, userId) {
        const [room] = await this.db
            .select()
            .from(schema_1.discussionRooms)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.id, roomId));
        if (!room)
            throw new common_1.NotFoundException('Room not found.');
        if (room.isPublic) {
            await this.db
                .insert(schema_1.discussionParticipants)
                .values({ roomId, userId, role: 'member' })
                .onConflictDoNothing();
            return;
        }
        const [p] = await this.db
            .select()
            .from(schema_1.discussionParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.discussionParticipants.roomId, roomId), (0, drizzle_orm_1.eq)(schema_1.discussionParticipants.userId, userId)));
        if (!p)
            throw new common_1.ForbiddenException('Not a participant of this room.');
    }
    async sendMessage(roomId, senderId, dto) {
        await this.ensureCanPost(roomId, senderId);
        const inserted = await this.db.transaction(async (tx) => {
            const [msg] = await tx
                .insert(schema_1.discussionMessages)
                .values({ roomId, senderId, content: dto.content })
                .returning();
            await tx
                .update(schema_1.discussionRooms)
                .set({
                lastMessageId: msg.id,
                lastMessageAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.id, roomId));
            return msg;
        });
        this.events.emit('discussion.message.created', {
            roomId,
            messageId: inserted.id,
        });
        return inserted;
    }
    async fetchMessages(roomId) {
        const rows = await this.db
            .select()
            .from(schema_1.discussionMessages)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionMessages.roomId, roomId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.discussionMessages.createdAt));
        return rows;
    }
};
exports.DiscussionService = DiscussionService;
exports.DiscussionService = DiscussionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        event_emitter_1.EventEmitter2])
], DiscussionService);
//# sourceMappingURL=discussion.service.js.map