import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const chatSessionType = pgEnum('chat_session_type', [
  'one_to_one',
  'group',
]);
export const participantRole = pgEnum('chat_participant_role', [
  'member',
  'nurse',
]);

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: serial('id').primaryKey(),
    type: chatSessionType('type').notNull().default('one_to_one'),

    // Normalized pair to guarantee uniqueness for one-to-one sessions.
    userAId: integer('user_a_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    userBId: integer('user_b_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),

    assignedNurseId: integer('assigned_nurse_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),

    lastMessageId: integer('last_message_id'), // keep nullable to avoid circular FK
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),

    createdAt: timestamp('created_at').default(sql`now()`),
    updatedAt: timestamp('updated_at').default(sql`now()`),
  },
  (t) => ({
    // Enforce one unique 1:1 session per normalized pair (NULLs allowed for groups)
    oneToOnePairUnique: uniqueIndex(
      'idx_chat_sessions_one_to_one_pair_unique',
    ).on(t.type, t.userAId, t.userBId),
    idxUpdatedAt: index('idx_chat_sessions_updated_at').on(t.updatedAt),
  }),
);

export const chatSessionParticipants = pgTable(
  'chat_session_participants',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => chatSessions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: participantRole('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqSessionUser: uniqueIndex('idx_chat_session_participant_unique').on(
      t.sessionId,
      t.userId,
    ),
    idxSession: index('idx_chat_session_participants_session').on(t.sessionId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => chatSessions.id, {
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
    idxSessionCreatedAt: index('idx_messages_session_created_at').on(
      t.sessionId,
      t.createdAt,
    ),
  }),
);

// Optional relations (for type-safe joins)
export const chatSessionRelations = relations(chatSessions, ({ many }) => ({
  participants: many(chatSessionParticipants),
  messages: many(messages),
}));

export const chatSessionParticipantRelations = relations(
  chatSessionParticipants,
  ({}) => ({}),
);
export const messageRelations = relations(messages, ({}) => ({}));
