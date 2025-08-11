"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRelations = exports.chatSessionParticipantRelations = exports.chatSessionRelations = exports.messages = exports.chatSessionParticipants = exports.chatSessions = exports.participantRole = exports.chatSessionType = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.chatSessionType = (0, pg_core_1.pgEnum)('chat_session_type', [
    'one_to_one',
    'group',
]);
exports.participantRole = (0, pg_core_1.pgEnum)('chat_participant_role', [
    'member',
    'nurse',
]);
exports.chatSessions = (0, pg_core_1.pgTable)('chat_sessions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    type: (0, exports.chatSessionType)('type').notNull().default('one_to_one'),
    userAId: (0, pg_core_1.integer)('user_a_id').references(() => users_1.users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
    userBId: (0, pg_core_1.integer)('user_b_id').references(() => users_1.users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
    assignedNurseId: (0, pg_core_1.integer)('assigned_nurse_id').references(() => users_1.users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
    lastMessageId: (0, pg_core_1.integer)('last_message_id'),
    lastMessageAt: (0, pg_core_1.timestamp)('last_message_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    oneToOnePairUnique: (0, pg_core_1.uniqueIndex)('idx_chat_sessions_one_to_one_pair_unique').on(t.type, t.userAId, t.userBId),
    idxUpdatedAt: (0, pg_core_1.index)('idx_chat_sessions_updated_at').on(t.updatedAt),
}));
exports.chatSessionParticipants = (0, pg_core_1.pgTable)('chat_session_participants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    sessionId: (0, pg_core_1.integer)('session_id')
        .notNull()
        .references(() => exports.chatSessions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => users_1.users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: (0, exports.participantRole)('role').notNull().default('member'),
    joinedAt: (0, pg_core_1.timestamp)('joined_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    uniqSessionUser: (0, pg_core_1.uniqueIndex)('idx_chat_session_participant_unique').on(t.sessionId, t.userId),
    idxSession: (0, pg_core_1.index)('idx_chat_session_participants_session').on(t.sessionId),
}));
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    sessionId: (0, pg_core_1.integer)('session_id')
        .notNull()
        .references(() => exports.chatSessions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    senderId: (0, pg_core_1.integer)('sender_id')
        .notNull()
        .references(() => users_1.users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
    }),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    idxSessionCreatedAt: (0, pg_core_1.index)('idx_messages_session_created_at').on(t.sessionId, t.createdAt),
}));
exports.chatSessionRelations = (0, drizzle_orm_1.relations)(exports.chatSessions, ({ many }) => ({
    participants: many(exports.chatSessionParticipants),
    messages: many(exports.messages),
}));
exports.chatSessionParticipantRelations = (0, drizzle_orm_1.relations)(exports.chatSessionParticipants, ({}) => ({}));
exports.messageRelations = (0, drizzle_orm_1.relations)(exports.messages, ({}) => ({}));
//# sourceMappingURL=chat.js.map