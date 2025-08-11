"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discussionRelations = exports.discussionMessages = exports.discussionParticipants = exports.discussionRooms = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.discussionRooms = (0, pg_core_1.pgTable)('discussion_rooms', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    topic: (0, pg_core_1.text)('topic').notNull(),
    description: (0, pg_core_1.text)('description'),
    isPublic: (0, pg_core_1.boolean)('is_public').notNull().default(true),
    createdBy: (0, pg_core_1.integer)('created_by').references(() => users_1.users.id, {
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
    idxUpdatedAt: (0, pg_core_1.index)('idx_discussion_rooms_updated_at').on(t.updatedAt),
    idxPublic: (0, pg_core_1.index)('idx_discussion_rooms_public').on(t.isPublic),
}));
exports.discussionParticipants = (0, pg_core_1.pgTable)('discussion_participants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    roomId: (0, pg_core_1.integer)('room_id')
        .notNull()
        .references(() => exports.discussionRooms.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => users_1.users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: (0, pg_core_1.text)('role').notNull().default('member'),
    joinedAt: (0, pg_core_1.timestamp)('joined_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    uniqRoomUser: (0, pg_core_1.uniqueIndex)('idx_discussion_participant_unique').on(t.roomId, t.userId),
    idxRoom: (0, pg_core_1.index)('idx_discussion_participants_room').on(t.roomId),
}));
exports.discussionMessages = (0, pg_core_1.pgTable)('discussion_messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    roomId: (0, pg_core_1.integer)('room_id')
        .notNull()
        .references(() => exports.discussionRooms.id, {
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
    idxRoomCreatedAt: (0, pg_core_1.index)('idx_discussion_messages_room_created_at').on(t.roomId, t.createdAt),
}));
exports.discussionRelations = (0, drizzle_orm_1.relations)(exports.discussionRooms, ({ many }) => ({
    participants: many(exports.discussionParticipants),
    messages: many(exports.discussionMessages),
}));
//# sourceMappingURL=discussions.js.map