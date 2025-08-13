// scripts/seed.ts
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';

// Types
type DB = NodePgDatabase<typeof import('../src/db/schema')>;

function normalizePair(a: number, b: number) {
  return a < b ? { a, b } : { a: b, b: a };
}

async function upsertUser(
  db: DB,
  params: {
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPPORT' | 'NURSE' | 'USER';
    password: string;
  },
) {
  const { email, name, role, password } = params;

  // 1) cek apakah ada
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users as any)
    .where(eq((schema.users as any).email, email))
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0]!.id, email, name, role };
  }

  // 2) insert user baru
  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // ⬇️ Jika hash col kamu bernama `password_hash`, ganti key 'passwordHash' di values() jadi 'password_hash'
  const [row] = await db
    .insert(schema.users as any)
    .values({
      email,
      name,
      role,
      passwordHash: hash, // ← ganti ke password_hash kalau schema kamu snake_case
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .returning({ id: schema.users.id });

  return { id: row.id, email, name, role };
}

async function seedUsers(db: DB) {
  console.log('Seeding users...');
  const admin = await upsertUser(db, {
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN',
    password: 'Password123!',
  });
  const support = await upsertUser(db, {
    email: 'support@example.com',
    name: 'Support',
    role: 'SUPPORT',
    password: 'Password123!',
  });
  const nurse = await upsertUser(db, {
    email: 'nurse@example.com',
    name: 'Nurse',
    role: 'NURSE',
    password: 'Password123!',
  });
  const alice = await upsertUser(db, {
    email: 'alice@example.com',
    name: 'Alice',
    role: 'USER',
    password: 'Password123!',
  });
  const bob = await upsertUser(db, {
    email: 'bob@example.com',
    name: 'Bob',
    role: 'USER',
    password: 'Password123!',
  });
  const charlie = await upsertUser(db, {
    email: 'charlie@example.com',
    name: 'Charlie',
    role: 'USER',
    password: 'Password123!',
  });
  return { admin, support, nurse, alice, bob, charlie };
}

async function seedDiscussion(
  db: DB,
  usersSeed: Awaited<ReturnType<typeof seedUsers>>,
) {
  console.log('Seeding discussion rooms...');

  const [room1] = await db
    .insert(schema.discussionRooms)
    .values({
      topic: 'Kesehatan Mental 101',
      description: 'Diskusi terbuka seputar kesehatan mental',
      isPublic: true,
      createdBy: usersSeed.support.id,
    })
    .returning();

  const [room2] = await db
    .insert(schema.discussionRooms)
    .values({
      topic: 'Gizi Seimbang',
      description: 'Tips gizi harian',
      isPublic: true,
      createdBy: usersSeed.support.id,
    })
    .returning();

  return { room1, room2 };
}

async function seedArticles(
  db: DB,
  usersSeed: Awaited<ReturnType<typeof seedUsers>>,
) {
  console.log('Seeding articles...');
  const now = new Date();

  const [draft] = await db
    .insert(schema.articles)
    .values({
      title: 'Manajemen Stres untuk Mahasiswa',
      slug: 'manajemen-stres-untuk-mahasiswa',
      summary: 'Cara-cara sederhana mengelola stres saat kuliah',
      content: '<p>Ini adalah draft artikel...</p>',
      status: 'draft',
      createdBy: usersSeed.admin.id,
      updatedBy: usersSeed.admin.id,
      updatedAt: now,
    })
    .returning();

  const [published] = await db
    .insert(schema.articles)
    .values({
      title: 'Gizi Seimbang 101',
      slug: 'gizi-seimbang-101',
      summary: 'Memahami porsi dan variasi makanan',
      content: '<p>Artikel publik tentang gizi seimbang.</p>',
      status: 'published',
      publishedAt: now,
      createdBy: usersSeed.admin.id,
      updatedBy: usersSeed.admin.id,
      updatedAt: now,
    })
    .returning();

  // cover dummy (tanpa file fisik)
  const [img] = await db
    .insert(schema.articleImages)
    .values({
      articleId: published.id,
      url: '/uploads/articles/sample.jpg',
      alt: 'Ilustrasi gizi seimbang',
      isCover: true,
      position: 0,
    })
    .returning();

  await db
    .update(schema.articles)
    .set({ coverImageId: img.id, updatedAt: new Date() })
    .where(eq(schema.articles.id, published.id));

  return { draft, published };
}

async function seedOneToOneChat(
  db: DB,
  usersSeed: Awaited<ReturnType<typeof seedUsers>>,
) {
  console.log('Seeding one-to-one chat...');
  const { support, nurse, alice } = usersSeed;
  const pair = normalizePair(support.id, alice.id);

  // insert session (idempotent)
  let [maybe] = await db
    .insert(schema.chatSessions)
    .values({
      type: 'one_to_one',
      userAId: pair.a,
      userBId: pair.b,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (!maybe) {
    [maybe] = await db
      .select()
      .from(schema.chatSessions)
      .where(
        and(
          eq(schema.chatSessions.type, 'one_to_one'),
          eq(schema.chatSessions.userAId, pair.a),
          eq(schema.chatSessions.userBId, pair.b),
        ),
      )
      .limit(1);
  }

  const sessionId = maybe.id;

  // participants (support, alice)
  await db
    .insert(schema.chatSessionParticipants)
    .values([
      { sessionId, userId: support.id, role: 'member' },
      { sessionId, userId: alice.id, role: 'member' },
    ])
    .onConflictDoNothing();

  // assign nurse
  await db
    .insert(schema.chatSessionParticipants)
    .values({ sessionId, userId: nurse.id, role: 'nurse' })
    .onConflictDoNothing();

  await db
    .update(schema.chatSessions)
    .set({ assignedNurseId: nurse.id, updatedAt: new Date() })
    .where(eq(schema.chatSessions.id, sessionId));

  // messages
  const [m1] = await db
    .insert(schema.messages)
    .values({
      sessionId,
      senderId: alice.id,
      content: 'Halo, saya butuh bantuan.',
    })
    .returning();

  const [m2] = await db
    .insert(schema.messages)
    .values({
      sessionId,
      senderId: support.id,
      content: 'Halo! Ada yang bisa kami bantu?',
    })
    .returning();

  await db
    .update(schema.chatSessions)
    .set({
      lastMessageId: m2.id,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.chatSessions.id, sessionId));

  return { sessionId };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    console.log('--- SEED START ---');
    const usersSeed = await seedUsers(db);
    await seedDiscussion(db, usersSeed);
    await seedArticles(db, usersSeed);
    await seedOneToOneChat(db, usersSeed);
    console.log('--- SEED DONE ---');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
