import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const discussionRooms = pgTable(
  'discussion_rooms',
  {
    id: serial('id').primaryKey(),
    topic: text('topic').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').notNull().default(true),
    createdBy: integer('created_by').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),

    lastMessageId: integer('last_message_id'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxUpdatedAt: index('idx_discussion_rooms_updated_at').on(t.updatedAt),
    idxPublic: index('idx_discussion_rooms_public').on(t.isPublic),
    // Optional: make topic unique (case-insensitive) if needed — implement at DB level with lower(topic)
  }),
);

export const discussionParticipants = pgTable(
  'discussion_participants',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => discussionRooms.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: text('role').notNull().default('member'), // future: moderator, etc.
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqRoomUser: uniqueIndex('idx_discussion_participant_unique').on(
      t.roomId,
      t.userId,
    ),
    idxRoom: index('idx_discussion_participants_room').on(t.roomId),
  }),
);

export const discussionMessages = pgTable(
  'discussion_messages',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => discussionRooms.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxRoomCreatedAt: index('idx_discussion_messages_room_created_at').on(
      t.roomId,
      t.createdAt,
    ),
  }),
);

export const discussionRelations = relations(discussionRooms, ({ many }) => ({
  participants: many(discussionParticipants),
  messages: many(discussionMessages),
}));
