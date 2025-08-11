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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const common_2 = require("@nestjs/common");
let ChatService = class ChatService {
    db;
    events;
    constructor(db, events) {
        this.db = db;
        this.events = events;
    }
    normalizePair(a, b) {
        return a < b ? { a, b } : { a: b, b: a };
    }
    async ensureUserIsParticipant(sessionId, userId) {
        const [p] = await this.db
            .select()
            .from(schema_1.chatSessionParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.userId, userId)));
        if (!p)
            throw new common_1.ForbiddenException('Not a participant of this session.');
    }
    async getOrCreateOneToOneSessionByRole(currentUserId, role) {
        const [u] = await this.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where(schema_1.users.role
            ? (0, drizzle_orm_1.eq)(schema_1.users.role, role)
            : (0, drizzle_orm_1.eq)(schema_1.users.id, -1))
            .limit(1);
        if (!u)
            throw new common_1.NotFoundException(`No available user with role ${role}.`);
        return this.getOrCreateOneToOneSession(currentUserId, {
            targetUserId: u.id,
        });
    }
    async getOrCreateOneToOneSession(currentUserId, dto) {
        if (currentUserId === dto.targetUserId) {
            throw new common_1.BadRequestException('Cannot create a one-to-one session with yourself.');
        }
        const pair = this.normalizePair(currentUserId, dto.targetUserId);
        const existing = await this.db
            .select()
            .from(schema_1.chatSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatSessions.type, 'one_to_one'), (0, drizzle_orm_1.eq)(schema_1.chatSessions.userAId, pair.a), (0, drizzle_orm_1.eq)(schema_1.chatSessions.userBId, pair.b)));
        if (existing.length > 0) {
            const session = existing[0];
            await this.db
                .insert(schema_1.chatSessionParticipants)
                .values([
                { sessionId: session.id, userId: currentUserId, role: 'member' },
                { sessionId: session.id, userId: dto.targetUserId, role: 'member' },
            ])
                .onConflictDoNothing();
            return session;
        }
        return await this.db.transaction(async (tx) => {
            const [session] = await tx
                .insert(schema_1.chatSessions)
                .values({ type: 'one_to_one', userAId: pair.a, userBId: pair.b })
                .returning();
            await tx.insert(schema_1.chatSessionParticipants).values([
                { sessionId: session.id, userId: currentUserId, role: 'member' },
                { sessionId: session.id, userId: dto.targetUserId, role: 'member' },
            ]);
            return session;
        });
    }
    async sendMessage(sessionId, senderId, dto) {
        await this.ensureUserIsParticipant(sessionId, senderId);
        const inserted = await this.db.transaction(async (tx) => {
            const [msg] = await tx
                .insert(schema_1.messages)
                .values({ sessionId, senderId, content: dto.content })
                .returning();
            await tx
                .update(schema_1.chatSessions)
                .set({
                lastMessageId: msg.id,
                lastMessageAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.chatSessions.id, sessionId));
            return msg;
        });
        this.events.emit('chat.message.created', {
            sessionId,
            messageId: inserted.id,
        });
        return inserted;
    }
    async fetchMessages(sessionId, userId) {
        await this.ensureUserIsParticipant(sessionId, userId);
        const rows = await this.db
            .select()
            .from(schema_1.messages)
            .where((0, drizzle_orm_1.eq)(schema_1.messages.sessionId, sessionId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.messages.createdAt));
        return rows;
    }
    async listSessions(userId) {
        const parts = await this.db
            .select({ sessionId: schema_1.chatSessionParticipants.sessionId })
            .from(schema_1.chatSessionParticipants)
            .where((0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.userId, userId));
        const sessionIds = parts.map((p) => p.sessionId);
        if (sessionIds.length === 0)
            return [];
        const sessions = await this.db
            .select()
            .from(schema_1.chatSessions)
            .where((0, drizzle_orm_1.inArray)(schema_1.chatSessions.id, sessionIds))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.chatSessions.updatedAt));
        const participants = await this.db
            .select()
            .from(schema_1.chatSessionParticipants)
            .where((0, drizzle_orm_1.inArray)(schema_1.chatSessionParticipants.sessionId, sessionIds));
        const lastMessages = await this.db
            .select()
            .from(schema_1.messages)
            .where((0, drizzle_orm_1.inArray)(schema_1.messages.id, sessions.filter((s) => s.lastMessageId).map((s) => s.lastMessageId)));
        const lastMessageById = new Map(lastMessages.map((m) => [m.id, m]));
        const participantsBySession = new Map();
        for (const p of participants) {
            const arr = participantsBySession.get(p.sessionId) ?? [];
            arr.push(p);
            participantsBySession.set(p.sessionId, arr);
        }
        return sessions.map((s) => ({
            ...s,
            participants: participantsBySession.get(s.id) ?? [],
            lastMessage: s.lastMessageId
                ? (lastMessageById.get(s.lastMessageId) ?? null)
                : null,
        }));
    }
    async assignNurse(sessionId, actingUser, dto) {
        const allowed = actingUser?.role === 'ADMIN' || actingUser?.role === 'SUPPORT';
        if (!allowed)
            throw new common_1.ForbiddenException('Only admin/support may assign a nurse.');
        const [session] = await this.db
            .select()
            .from(schema_1.chatSessions)
            .where((0, drizzle_orm_1.eq)(schema_1.chatSessions.id, sessionId));
        if (!session)
            throw new common_1.NotFoundException('Session not found.');
        if (session.type !== 'one_to_one')
            throw new common_1.BadRequestException('Nurse assignment only allowed for one-to-one sessions.');
        const updated = await this.db.transaction(async (tx) => {
            await tx
                .delete(schema_1.chatSessionParticipants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.role, 'nurse')));
            await tx
                .insert(schema_1.chatSessionParticipants)
                .values({ sessionId, userId: dto.nurseId, role: 'nurse' });
            const [s] = await tx
                .update(schema_1.chatSessions)
                .set({ assignedNurseId: dto.nurseId, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.chatSessions.id, sessionId))
                .returning();
            return s;
        });
        this.events.emit('chat.nurse.assigned', {
            sessionId,
            nurseId: dto.nurseId,
        });
        return updated;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        event_emitter_1.EventEmitter2])
], ChatService);
//# sourceMappingURL=chat.service.js.map