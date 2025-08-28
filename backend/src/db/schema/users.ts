import { relations, sql } from 'drizzle-orm';
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import { roleEnum } from './roles';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: roleEnum('role').notNull().default('USER'),
  profilePicture: varchar('profile_picture', { length: 255 }),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Pendekatan yang lebih simpel untuk relasi
let messagesRef;
let groupMembersRef;
let articlesRef;

// Fungsi setter yang lebih simpel
export const setUserMessagesRef = (ref) => {
  messagesRef = ref;
};

export const setUserGroupMembersRef = (ref) => {
  groupMembersRef = ref;
};

export const setUserArticlesRef = (ref) => {
  articlesRef = ref;
};

// Inisialisasi relasi awal yang kosong
export let usersRelations = relations(users, () => ({}));

// Fungsi untuk menginisialisasi ulang relasi setelah semua tabel tersedia
export function initializeUsersRelations() {
  if (messagesRef && groupMembersRef && articlesRef) {
    usersRelations = relations(users, ({ many }) => ({
      sentMessages: many(messagesRef),
      receivedMessages: many(messagesRef, { relationName: 'receivedMessages' }),
      groupMemberships: many(groupMembersRef),
      articles: many(articlesRef),
    }));
  }
  return usersRelations;
}
