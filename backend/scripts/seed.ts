// scripts/seed.ts
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

// 🚩 Sesuaikan path ini dengan project kamu:
import * as schema from '../src/db/schema';
import {
  users,
  // Articles
  articles,
  articleImages,
  articleCategories, // ⬅️ tambah
  articleCategoryLinks, // ⬅️ tambah
  // Discussion (public group)
  discussionRooms,
  discussionParticipants,
  discussionMessages,
  // Chat 1:1 (personal)
  chatSessions,
  chatSessionParticipants,
  messages as chatMessages,
} from '../src/db/schema';

// ---------- Types ----------
type DB = NodePgDatabase<typeof import('../src/db/schema')>;

type SeedUser = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'ADMIN' | 'SUPPORT' | 'NURSE' | 'USER';
  profilePicture?: string | null;
};

// ---------- Config Seed Data ----------
const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@gmail.com',
    firstName: 'Admin',
    lastName: null,
    role: 'ADMIN',
  },
  {
    email: 'support@gmail.com',
    firstName: 'Support',
    lastName: null,
    role: 'SUPPORT',
  },
  {
    email: 'nurse@gmail.com',
    firstName: 'Nurse',
    lastName: null,
    role: 'NURSE',
  },
  {
    email: 'alice@gmail.com',
    firstName: 'Alice',
    lastName: 'Doe',
    role: 'USER',
  },
  { email: 'bob@gmail.com', firstName: 'Bob', lastName: 'Stone', role: 'USER' },
  {
    email: 'charlie@gmail.com',
    firstName: 'Charlie',
    lastName: 'Kim',
    role: 'USER',
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function normalizePair(a: number, b: number) {
  return a < b ? { a, b } : { a: b, b: a };
}

// ---------- Seed helpers ----------
async function upsertUser(
  db: DB,
  u: SeedUser,
  hashedPassword: string,
  opts?: { overwriteExistingPassword?: boolean },
) {
  const overwrite = opts?.overwriteExistingPassword ?? true;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, u.email))
    .limit(1);

  if (existing.length) {
    await db
      .update(users)
      .set({
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        role: u.role,
        profilePicture: u.profilePicture ?? null,
        ...(overwrite ? { password: hashedPassword } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.email, u.email));
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      email: u.email,
      password: hashedPassword, // 👈 hash argon2id disimpan di kolom `password`
      googleId: null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      role: u.role,
      profilePicture: u.profilePicture ?? null,
      // createdAt/updatedAt pakai default CURRENT_TIMESTAMP
    })
    .returning({ id: users.id });

  return inserted.id;
}

async function seedUsers(db: DB) {
  console.log('Seeding users...');
  const hashed = await bcrypt.hash('glucoheart321', 10);

  const ids: Record<string, number> = {};
  for (const u of SEED_USERS) {
    const id = await upsertUser(db, u, hashed, {
      overwriteExistingPassword: true,
    });
    ids[u.email] = id;
    console.log(`  ✓ ${u.email} (id=${id}, role=${u.role})`);
  }
  return {
    adminId: ids['admin@gmail.com'],
    supportId: ids['support@gmail.com'],
    nurseId: ids['nurse@gmail.com'],
    aliceId: ids['alice@gmail.com'],
    bobId: ids['bob@gmail.com'],
    charlieId: ids['charlie@gmail.com'],
  };
}

// upsert 1 category by slug
type CategoryRow = typeof articleCategories.$inferSelect;

async function upsertCategory(
  db: DB,
  input: { name: string; slug: string },
): Promise<CategoryRow> {
  const slug = slugify(input.slug);
  const [exist] = await db
    .select()
    .from(articleCategories)
    .where(eq(articleCategories.slug, slug))
    .limit(1);
  if (exist) return exist;

  const [row] = await db
    .insert(articleCategories)
    .values({ name: input.name, slug })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  const [after] = await db
    .select()
    .from(articleCategories)
    .where(eq(articleCategories.slug, slug))
    .limit(1);

  return after!; // dipastikan ada
}

async function linkArticleCategories(
  db: DB,
  articleId: number,
  slugs: string[],
): Promise<CategoryRow[]> {
  if (!slugs.length) return [];

  // bikin/ambil semua kategori sesuai slug (bertipe CategoryRow[])
  const cats = await Promise.all(
    slugs.map((s) =>
      upsertCategory(db, {
        name: s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        slug: s,
      }),
    ),
  );

  // buat link (ignore jika sudah ada)
  await db
    .insert(articleCategoryLinks)
    .values(cats.map((c) => ({ articleId, categoryId: c.id })))
    .onConflictDoNothing();

  return cats;
}

async function seedArticles(db: DB, who: { adminId: number }) {
  console.log('Seeding articles...');

  // siapkan kategori yang akan dipakai
  const catMental = await upsertCategory(db, {
    name: 'Mental Health',
    slug: 'mental-health',
  });
  const catNutrition = await upsertCategory(db, {
    name: 'Nutrition',
    slug: 'nutrition',
  });
  const catWellness = await upsertCategory(db, {
    name: 'Wellness',
    slug: 'wellness',
  });

  // --- Draft article ---
  const draftTitle = 'Manajemen Stres untuk Mahasiswa';
  const draftSlug = slugify(draftTitle);
  const [draftIns] = await db
    .insert(articles)
    .values({
      title: draftTitle,
      slug: draftSlug,
      summary: 'Cara sederhana mengelola stres saat kuliah.',
      content: '<p>Ini adalah <em>draft</em> artikel...</p>',
      status: 'draft',
      createdBy: who.adminId,
      updatedBy: who.adminId,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // jika sudah ada (onConflict), ambil recordnya
  const draft =
    draftIns ??
    (
      await db
        .select()
        .from(articles)
        .where(eq(articles.slug, draftSlug))
        .limit(1)
    )[0];

  // link kategori draft
  await linkArticleCategories(db, draft.id, [catMental.slug]);

  // --- Published article ---
  const pubTitle = 'Gizi Seimbang 101';
  const pubSlug = slugify(pubTitle);
  const now = new Date();
  const [pubIns] = await db
    .insert(articles)
    .values({
      title: pubTitle,
      slug: pubSlug,
      summary: 'Memahami porsi & variasi makanan.',
      content: '<p>Artikel publik tentang gizi seimbang.</p>',
      status: 'published',
      publishedAt: now,
      createdBy: who.adminId,
      updatedBy: who.adminId,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  const published =
    pubIns ??
    (
      await db
        .select()
        .from(articles)
        .where(eq(articles.slug, pubSlug))
        .limit(1)
    )[0];

  // link kategori published
  await linkArticleCategories(db, published.id, [
    catNutrition.slug,
    catWellness.slug,
  ]);

  // cover dummy (tanpa file fisik)
  const [img] = await db
    .insert(articleImages)
    .values({
      articleId: published.id,
      url: '/uploads/articles/sample.jpg',
      alt: 'Ilustrasi gizi seimbang',
      isCover: true,
      position: 0,
    })
    .onConflictDoNothing()
    .returning();

  // set cover jika barusan dibuat
  if (img) {
    await db
      .update(articles)
      .set({ coverImageId: img.id, updatedAt: new Date() })
      .where(eq(articles.id, published.id));
  }

  console.log(`  ✓ draft: ${draftSlug} [categories: mental-health]`);
  console.log(
    `  ✓ published: ${pubSlug} [categories: nutrition, wellness] + cover`,
  );

  return { draft, published };
}

async function seedDiscussion(
  db: DB,
  who: { supportId: number; adminId: number; aliceId: number },
) {
  console.log('Seeding discussion rooms...');

  // Room 1
  const [room1] = await db
    .insert(discussionRooms)
    .values({
      topic: 'Kesehatan Mental 101',
      description: 'Diskusi terbuka seputar kesehatan mental',
      isPublic: true,
      createdBy: who.supportId,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // Room 2
  const [room2] = await db
    .insert(discussionRooms)
    .values({
      topic: 'Gizi Seimbang',
      description: 'Tips gizi harian',
      isPublic: true,
      createdBy: who.supportId,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // Tambah participants (optional, public rooms auto-join saat post juga boleh)
  if (room1) {
    await db
      .insert(discussionParticipants)
      .values([
        { roomId: room1.id, userId: who.supportId, role: 'member' },
        { roomId: room1.id, userId: who.adminId, role: 'member' },
        { roomId: room1.id, userId: who.aliceId, role: 'member' },
      ])
      .onConflictDoNothing();

    const [m1] = await db
      .insert(discussionMessages)
      .values({
        roomId: room1.id,
        senderId: who.supportId,
        content: 'Selamat datang di diskusi Kesehatan Mental 101 👋',
      })
      .returning();

    await db
      .update(discussionRooms)
      .set({
        lastMessageId: m1.id,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(discussionRooms.id, room1.id));
  }

  if (room2) {
    await db
      .insert(discussionParticipants)
      .values([
        { roomId: room2.id, userId: who.supportId, role: 'member' },
        { roomId: room2.id, userId: who.adminId, role: 'member' },
      ])
      .onConflictDoNothing();

    const [m2] = await db
      .insert(discussionMessages)
      .values({
        roomId: room2.id,
        senderId: who.supportId,
        content: 'Mulai diskusi Gizi Seimbang  🥗',
      })
      .returning();

    await db
      .update(discussionRooms)
      .set({
        lastMessageId: m2.id,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(discussionRooms.id, room2.id));
  }

  return { room1, room2 };
}

async function seedChatOneToOne(
  db: DB,
  who: { supportId: number; aliceId: number; nurseId: number },
) {
  console.log('Seeding one-to-one chat...');

  // bikin/ambil 1:1 (support <-> alice)
  const pair = normalizePair(who.supportId, who.aliceId);
  let [session] = await db
    .insert(chatSessions)
    .values({
      type: 'one_to_one', // enum chat_session_type
      userAId: pair.a,
      userBId: pair.b,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (!session) {
    [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.type, 'one_to_one'),
          eq(chatSessions.userAId, pair.a),
          eq(chatSessions.userBId, pair.b),
        ),
      )
      .limit(1);
  }

  // participants
  await db
    .insert(chatSessionParticipants)
    .values([
      { sessionId: session.id, userId: who.supportId, role: 'member' },
      { sessionId: session.id, userId: who.aliceId, role: 'member' },
    ])
    .onConflictDoNothing();

  // assign nurse
  await db
    .insert(chatSessionParticipants)
    .values({ sessionId: session.id, userId: who.nurseId, role: 'nurse' })
    .onConflictDoNothing();

  await db
    .update(chatSessions)
    .set({ assignedNurseId: who.nurseId, updatedAt: new Date() })
    .where(eq(chatSessions.id, session.id));

  // messages
  const [m1] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      senderId: who.aliceId,
      content: 'Halo, saya butuh bantuan.',
    })
    .returning();

  const [m2] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      senderId: who.supportId,
      content: 'Halo! Ada yang bisa kami bantu?',
    })
    .returning();

  await db
    .update(chatSessions)
    .set({
      lastMessageId: m2.id,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, session.id));

  return { sessionId: session.id };
}

// ---------- main ----------
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ Missing DATABASE_URL in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    console.log('--- SEED START ---');

    const ids = await seedUsers(db);
    await seedArticles(db, { adminId: ids.adminId });
    await seedDiscussion(db, {
      supportId: ids.supportId,
      adminId: ids.adminId,
      aliceId: ids.aliceId,
    });
    await seedChatOneToOne(db, {
      supportId: ids.supportId,
      aliceId: ids.aliceId,
      nurseId: ids.nurseId,
    });

    console.log('--- SEED DONE ---');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
