import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  SQL,
  and,
  eq,
  ilike,
  desc,
  inArray,
  sql,
  asc,
  notInArray,
  ne,
  or,
} from 'drizzle-orm';
import {
  articles,
  articleImages,
  articleCategories,
  articleCategoryLinks,
} from '../db/schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

import { promises as fs } from 'fs';
import { join, relative, isAbsolute, basename, resolve } from 'path';

type ImageRow = typeof articleImages.$inferSelect;

type ArticleStatus = 'draft' | 'published';
type ArticleRow = typeof articles.$inferSelect;
type CategoryRow = typeof articleCategories.$inferSelect;

@Injectable()
export class ArticlesService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof import('../db/schema')>,
  ) {}

  private assertWriter(role?: string) {
    if (role !== 'ADMIN' && role !== 'SUPPORT') {
      throw new ForbiddenException('Only ADMIN or SUPPORT can write articles');
    }
  }

  private slugify(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private async cleanupOldCover(
    tx: NodePgDatabase<any>,
    prev: ImageRow | undefined | null,
    opts: { deleteRow?: boolean; deleteFile?: boolean } = {
      deleteRow: false,
      deleteFile: false,
    },
  ) {
    if (!prev) return;

    // tandai bukan cover
    await tx
      .update(articleImages)
      .set({ isCover: false })
      .where(eq(articleImages.id, prev.id));

    if (!opts.deleteRow) return;

    // hapus row hanya jika tidak ada image lain yg pakai storageKey yang sama
    if (prev.storageKey) {
      const [{ c }] = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(articleImages)
        .where(eq(articleImages.storageKey, prev.storageKey));

      if (c <= 1) {
        await tx.delete(articleImages).where(eq(articleImages.id, prev.id));
        if (opts.deleteFile) {
          await fs.unlink(prev.storageKey).catch(() => {});
        }
      }
    } else {
      // URL tanpa storageKey (mis. set via coverUrl) — aman hapus row
      await tx.delete(articleImages).where(eq(articleImages.id, prev.id));
    }
  }

  private readonly UPLOAD_ROOT = resolve(process.cwd(), 'uploads');

  /** file.path (abs/rel) -> { url: "/uploads/..", storageKey: "uploads/.." } */
  private toPublicFromPath(p: string) {
    const abs = isAbsolute(p) ? p : resolve(process.cwd(), p);
    // jadikan relatif terhadap folder uploads
    let relToUploads = relative(this.UPLOAD_ROOT, abs).replace(/\\/g, '/'); // "articles/xxx.png"
    if (relToUploads.startsWith('..') || relToUploads === '') {
      // fallback jika bukan di bawah /uploads
      relToUploads = `articles/${basename(abs)}`;
    }
    const storageKey = `uploads/${relToUploads}`; // "uploads/articles/xxx.png"
    const url = `/${storageKey}`; // "/uploads/articles/xxx.png"
    return { url, storageKey };
  }

  /** Multer file -> public/url + storageKey */
  private toPublicFromFile(file: Express.Multer.File) {
    return this.toPublicFromPath(file.path);
  }

  /** Ekstrak semua <img src="..."> lokal (hanya yang mulai "/uploads/") dari HTML */
  private extractInlineImageUrls(html?: string | null): string[] {
    if (!html) return [];
    const out = new Set<string>();
    const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const raw = (m[1] || '').trim();
      if (!raw) continue;
      const clean = raw.split('#')[0].split('?')[0];
      if (clean.startsWith('/uploads/')) out.add(clean);
    }
    return Array.from(out);
  }

  /** "/uploads/.." -> "uploads/.." (untuk fs.unlink) */
  private urlToStorageKey(url: string): string | null {
    if (!url || !url.startsWith('/uploads/')) return null;
    return url.slice(1).replace(/\\/g, '/');
  }

  private fileToPublic(file: Express.Multer.File) {
    // Pastikan path absolut → relatif dari project root
    const abs = isAbsolute(file.path)
      ? file.path
      : join(process.cwd(), file.path);
    let rel = relative(process.cwd(), abs).replace(/\\/g, '/'); // ex: 'uploads/articles/xxx.jpg'

    // Paksa berada di bawah 'uploads/'
    if (!rel.startsWith('uploads/')) {
      const idx = rel.indexOf('uploads/');
      rel = idx >= 0 ? rel.slice(idx) : `uploads/articles/${file.filename}`;
    }

    const url = `/${rel}`; // ex: '/uploads/articles/xxx.jpg'
    const storageKey = rel; // ex: 'uploads/articles/xxx.jpg'
    return { url, storageKey };
  }

  /** Ambil peta coverImageId -> url (batch) */
  private async getCoverUrlMapByImageIds(
    imageIds: Array<number | null | undefined>,
  ) {
    const ids = Array.from(
      new Set(
        (imageIds || []).filter((v): v is number =>
          Number.isInteger(v as number),
        ),
      ),
    );
    const map = new Map<number, string>();
    if (!ids.length) return map;

    const rows = await this.db
      .select({ id: articleImages.id, url: articleImages.url })
      .from(articleImages)
      .where(inArray(articleImages.id, ids));

    for (const r of rows) map.set(r.id, r.url);
    return map;
  }

  private async makeUniqueCategorySlug(baseName: string) {
    const base = this.slugify(baseName);
    // ambil semua slug yang diawali base (base, base-2, base-3, ...)
    const rows = await this.db
      .select({ slug: articleCategories.slug })
      .from(articleCategories)
      .where(sql`${articleCategories.slug} LIKE ${base + '%'}`);

    const used = new Set(rows.map((r) => r.slug));
    if (!used.has(base)) return base;

    // cari suffix angka terkecil yang belum dipakai
    let i = 2;
    while (used.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  // --- helpers ---
  private parseStatuses(status?: string): ArticleStatus[] | null {
    // contoh: "draft.published"
    if (!status) return null;
    const set = new Set<ArticleStatus>();
    for (const s of status.split('.').map((x) => x.trim().toLowerCase())) {
      if (s === 'draft' || s === 'published') set.add(s);
    }
    return set.size ? Array.from(set) : null;
  }

  private buildWhere(params: {
    status?: string;
    search?: string;
    defaultToPublished?: boolean;
  }) {
    const conds: any[] = [];

    // filter status
    const parsed = this.parseStatuses(params.status);
    if (parsed && parsed.length) {
      conds.push(inArray(articles.status, parsed as any));
    } else if (params.defaultToPublished) {
      // untuk public all: default hanya published
      conds.push(eq(articles.status, 'published' as any));
    }

    // search by title/summary
    if (params.search) {
      const q = `%${params.search}%`;
      conds.push(
        sql`(${articles.title} ILIKE ${q} OR ${articles.summary} ILIKE ${q})`,
      );
      // kalau mau include content:
      // conds.push(sql`(${articles.title} ILIKE ${q} OR ${articles.summary} ILIKE ${q} OR ${articles.content} ILIKE ${q})`);
    }

    return conds.length ? and(...conds) : sql`true`;
  }

  private parseSort(sort?: string) {
    // dukungan kolom sort:
    const allowed: Record<string, any> = {
      id: articles.id,
      title: articles.title,
      created_at: articles.createdAt,
      updated_at: articles.updatedAt,
      published_at: articles.publishedAt,
      status: articles.status,
    };
    const def = desc(articles.publishedAt ?? articles.createdAt);

    if (!sort) return [def];
    try {
      const arr = JSON.parse(sort);
      if (!Array.isArray(arr) || !arr.length) return [def];
      const orderBys: any[] = [];
      for (const item of arr) {
        const col = allowed[item?.id as string];
        if (!col) continue;
        orderBys.push(item?.desc ? desc(col) : asc(col));
      }
      return orderBys.length ? orderBys : [def];
    } catch {
      return [def];
    }
  }

  private async makeUniqueArticleSlug(title: string) {
    const base = this.slugify(title);
    const same = await this.db
      .select({ slug: articles.slug })
      .from(articles)
      .where(eq(articles.slug, base));
    if (!same.length) return base;

    // suffix -2, -3, ...
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const s = `${base}-${i}`;
      const [row] = await this.db
        .select({ slug: articles.slug })
        .from(articles)
        .where(eq(articles.slug, s))
        .limit(1);
      if (!row) return s;
      i++;
    }
  }

  private toPublicUrlFromFile(file: Express.Multer.File) {
    // contoh: file.path = 'uploads/articles/2025/08/a.jpg'
    const normalized = file.path.replace(/\\/g, '/'); // Windows safe
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private parseCategorySlugs(input?: string | null): string[] {
    if (!input) return [];
    return Array.from(
      new Set(
        input
          .split('.')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  // helper kategori
  private async upsertCategoryBySlug(slug: string) {
    const name = slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
    const [exist] = await this.db
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.slug, slug))
      .limit(1);
    if (exist) return exist;
    const [row] = await this.db
      .insert(articleCategories)
      .values({ name, slug })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [ref] = await this.db
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.slug, slug))
      .limit(1);
    return ref!;
  }

  private async linkArticleCategories(
    tx: any,
    articleId: number,
    slugs: string[],
  ): Promise<CategoryRow[]> {
    if (!slugs.length) return [];

    // bikin/ambil semua kategori sesuai slug → infer: CategoryRow[]
    const cats = await Promise.all(
      slugs.map((s) => this.upsertCategoryBySlug(s)),
    );

    // insert link (abaikan kalau sudah ada)
    await tx
      .insert(articleCategoryLinks)
      .values(cats.map((c) => ({ articleId, categoryId: c.id })))
      .onConflictDoNothing();

    return cats;
  }

  private async replaceArticleCategories(
    tx: NodePgDatabase<any>,
    articleId: number,
    slugs: string[],
  ) {
    // resolve slugs -> ids
    const cats: CategoryRow[] = [];
    for (const s of slugs) cats.push(await this.upsertCategoryBySlug(s));

    const catIds = cats.map((c) => c.id);

    if (!catIds.length) {
      await tx
        .delete(articleCategoryLinks)
        .where(eq(articleCategoryLinks.articleId, articleId));
      return;
    }

    // hapus yang tidak dipilih
    await tx
      .delete(articleCategoryLinks)
      .where(
        and(
          eq(articleCategoryLinks.articleId, articleId),
          notInArray(articleCategoryLinks.categoryId, catIds),
        ),
      );

    // tambah yang belum ada
    await tx
      .insert(articleCategoryLinks)
      .values(catIds.map((id) => ({ articleId, categoryId: id })))
      .onConflictDoNothing();
  }

  // ==== CATEGORY API ====
  // Create category (ADMIN/SUPPORT)
  async createCategory(
    actingUser: { id: number; role?: string },
    dto: CreateCategoryDto,
  ) {
    try {
      this.assertWriter(actingUser.role);

      const slug = await this.makeUniqueCategorySlug(dto.name);

      const [row] = await this.db
        .insert(articleCategories)
        .values({ name: dto.name, slug })
        .onConflictDoNothing() // jaga-jaga race condition
        .returning();

      if (row) return row;

      // kalau onConflictDoNothing mem-pasifkan insert (slug keburu dipakai), ambil yang sudah ada
      const [existing] = await this.db
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.slug, slug))
        .limit(1);

      return existing!;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async updateCategory(
    actingUser: { id: number; role?: string },
    categoryId: number,
    dto: UpdateCategoryDto,
  ) {
    try {
      this.assertWriter(actingUser.role);

      const slug = await this.makeUniqueCategorySlug(dto.name);

      const [row] = await this.db
        .update(articleCategories)
        .set({ name: dto.name, slug })
        .where(eq(articleCategories.id, categoryId))
        .returning();

      if (row) return row;

      // kalau tidak ada yang diupdate, ambil yang sudah ada
      const [existing] = await this.db
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.id, categoryId))
        .limit(1);

      return existing!;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async deleteCategory(
    actingUser: { id: number; role?: string },
    categoryId: number,
  ) {
    try {
      this.assertWriter(actingUser.role);

      const [row] = await this.db
        .delete(articleCategories)
        .where(eq(articleCategories.id, categoryId))
        .returning();

      if (row) return row;

      // kalau tidak ada yang dihapus, ambil yang sudah ada
      const [existing] = await this.db
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.id, categoryId))
        .limit(1);

      return existing!;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // List categories (public)
  async listCategories(q?: string, limit = 100, offset = 0) {
    const where = q ? ilike(articleCategories.name, `%${q}%`) : sql`true`;
    return this.db
      .select()
      .from(articleCategories)
      .where(where)
      .orderBy(asc(articleCategories.slug))
      .limit(limit)
      .offset(offset);
  }

  // Helper: get categories for many article ids
  private async getCategoriesMap(articleIds: number[]) {
    if (!articleIds.length) return new Map<number, any[]>();
    const rows = await this.db
      .select({
        articleId: articleCategoryLinks.articleId,
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
      })
      .from(articleCategoryLinks)
      .innerJoin(
        articleCategories,
        eq(articleCategoryLinks.categoryId, articleCategories.id),
      )
      .where(inArray(articleCategoryLinks.articleId, articleIds));

    const map = new Map<number, any[]>();
    for (const r of rows) {
      const arr = map.get(r.articleId) ?? [];
      arr.push({ id: r.id, name: r.name, slug: r.slug });
      map.set(r.articleId, arr);
    }
    return map;
  }

  // Set categories for an article (replace all). ADMIN/SUPPORT only
  async setArticleCategories(
    actingUser: { id: number; role?: string },
    articleId: number,
    slugs: string[],
  ) {
    this.assertWriter(actingUser.role);

    // pastikan artikel ada
    const [art] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, articleId));
    if (!art) throw new NotFoundException('Article not found');

    // normalisasi & ambil kategori
    const norm = Array.from(new Set(slugs.map((s) => s.toLowerCase().trim())));

    const cats = norm.length
      ? await this.db
          .select()
          .from(articleCategories)
          .where(inArray(articleCategories.slug, norm))
      : [];

    if (norm.length !== cats.length) {
      const missing = norm.filter((s) => !cats.find((c) => c.slug === s));
      throw new BadRequestException(`Unknown category: ${missing.join(', ')}`);
    }

    const catIds = cats.map((c) => c.id);

    // 🔧 DELETE links lama
    if (catIds.length === 0) {
      // jika tidak ada kategori baru → hapus semua link kategori artikel ini
      await this.db
        .delete(articleCategoryLinks)
        .where(eq(articleCategoryLinks.articleId, articleId));
    } else {
      // hapus link yang tidak termasuk set baru
      await this.db.delete(articleCategoryLinks).where(
        and(
          eq(articleCategoryLinks.articleId, articleId),
          notInArray(articleCategoryLinks.categoryId, catIds), // ✅ aman & clean
        ),
      );

      // (Jika versi drizzle kamu belum punya notInArray, pakai raw SQL berikut:)
      // await this.db.execute(sql`
      //   DELETE FROM "article_category_links"
      //   WHERE "article_id" = ${articleId}
      //     AND "category_id" NOT IN (${sql.join(catIds, sql`, `)})
      // `);
    }

    // 🔧 INSERT links baru (abaikan kalau sudah ada)
    if (catIds.length) {
      await this.db
        .insert(articleCategoryLinks)
        .values(catIds.map((cid) => ({ articleId, categoryId: cid })))
        .onConflictDoNothing();
    }

    return {
      ok: true,
      articleId,
      categories: cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    };
  }
  // ================================================================================= //

  // ================================ Filter Function ====================================== //

  // Tambah parameter categories: string (dot-separated slugs)
  async findAllSimple(params: {
    status?: string;
    search?: string;
    limit?: number;
    categories?: string;
  }) {
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 200);

    const whereBase = this.buildWhere({
      status: params.status,
      search: params.search,
      defaultToPublished: true,
    });

    let where = whereBase;
    if (params.categories) {
      const slugs = Array.from(
        new Set(
          params.categories
            .split('.')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      if (slugs.length) {
        where = and(
          whereBase,
          sql`
          EXISTS (
            SELECT 1
            FROM "article_category_links" acl
            JOIN "article_categories" ac ON ac.id = acl.category_id
            WHERE acl.article_id = ${articles.id}
              AND ac.slug IN (${sql.join(slugs, sql`, `)})
          )
        `,
        );
      }
    }

    const rows = await this.db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        publishedAt: articles.publishedAt,
        coverImageId: articles.coverImageId,
        summary: articles.summary,
      })
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt ?? articles.createdAt))
      .limit(limit);

    // ambil URL cover secara batch
    const coverMap = await this.getCoverUrlMapByImageIds(
      rows.map((r) => r.coverImageId),
    );

    // attach categories
    const map = await this.getCategoriesMap(rows.map((r) => r.id));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      summary: r.summary ?? null,
      coverImageId: r.coverImageId ?? null,
      coverImageUrl: r.coverImageId
        ? (coverMap.get(r.coverImageId) ?? null)
        : null, // ⬅️ URL cover
      created_at: r.createdAt ?? null,
      updated_at: r.updatedAt ?? null,
      published_at: r.publishedAt ?? null,
      categories: map.get(r.id) ?? [],
    }));
  }

  async findPaginated(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    scope?: 'public' | 'admin';
    categories?: string;
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 100);
    const offset = (page - 1) * limit;

    const whereBase = this.buildWhere({
      status: params.status,
      search: params.search,
      defaultToPublished: params.scope !== 'admin',
    });

    let where = whereBase;
    if (params.categories) {
      const slugs = Array.from(
        new Set(
          params.categories
            .split('.')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      if (slugs.length) {
        const slugList = slugs; // string[]
        where = and(
          whereBase,
          sql`
    EXISTS (
      SELECT 1
      FROM "article_category_links" acl
      JOIN "article_categories" ac ON ac.id = acl.category_id
      WHERE acl.article_id = ${articles.id}
        AND ac.slug IN (${sql.join(slugs, sql`, `)}) 
    )
  `,
        );
      }
    }

    const orderBys = this.parseSort(params.sort);

    const totalRows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(articles)
      .where(where);

    const rows = await this.db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        publishedAt: articles.publishedAt,
        coverImageId: articles.coverImageId,
        summary: articles.summary,
      })
      .from(articles)
      .where(where)
      .orderBy(...orderBys)
      .limit(limit)
      .offset(offset);

    // ambil URL cover batch
    const coverMap = await this.getCoverUrlMapByImageIds(
      rows.map((r) => r.coverImageId),
    );

    const map = await this.getCategoriesMap(rows.map((r) => r.id));

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'Article search results',
      total_articles: totalRows[0]?.c ?? 0,
      offset,
      limit,
      articles: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        status: r.status,
        summary: r.summary ?? null,
        coverImageId: r.coverImageId ?? null,
        coverImageUrl: r.coverImageId
          ? (coverMap.get(r.coverImageId) ?? null)
          : null, // ⬅️ URL cover
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null,
        published_at: r.publishedAt ?? null,
        categories: map.get(r.id) ?? [],
      })),
    };
  }

  // ================================ End Filter ====================================== //

  // === CREATE + optional cover (file atau url) ===
  async createWithOptionalCover(
    acting: { id: number; role?: string },
    dto: CreateArticleDto,
    coverFile?: Express.Multer.File,
  ) {
    this.assertWriter(acting.role);
    if (!dto?.title?.trim()) throw new BadRequestException('title is required');

    const slug = await this.makeUniqueArticleSlug(dto.title.trim());
    const status =
      dto.status === 'published' || dto.status === 'draft'
        ? dto.status
        : 'draft';
    const catSlugs = this.parseCategorySlugs(dto.categories);

    return this.db.transaction(async (tx) => {
      // 1) insert article
      const now = new Date();
      const [art] = await tx
        .insert(articles)
        .values({
          title: dto.title!.trim(),
          slug,
          summary: dto.summary ?? null,
          content: dto.content ?? null,
          status,
          publishedAt: status === 'published' ? now : null,
          createdBy: acting.id,
          updatedBy: acting.id,
          updatedAt: now,
        })
        .returning();

      // 2) optional categories
      if (catSlugs.length) {
        await this.linkArticleCategories(tx, art.id, catSlugs);
      }

      // 3) optional cover (file OR url)
      let coverId: number | null = null;

      if (coverFile) {
        const { url, storageKey } = this.toPublicFromFile(coverFile);
        const [img] = await tx
          .insert(articleImages)
          .values({
            articleId: art.id,
            url,
            storageKey, // "uploads/.."
            alt: dto.coverAlt ?? null,
            isCover: true,
            position: 0,
          })
          .returning();
        coverId = img.id;
      } else if (dto.coverUrl) {
        const isLocal = dto.coverUrl.startsWith('/uploads/');
        const storageKey = isLocal ? this.urlToStorageKey(dto.coverUrl) : null;

        const [img] = await tx
          .insert(articleImages)
          .values({
            articleId: art.id,
            url: dto.coverUrl, // "/uploads/..." atau URL eksternal
            storageKey, // "uploads/..." atau null
            alt: dto.coverAlt ?? null,
            isCover: true,
            position: 0,
          })
          .returning();
        coverId = img.id;
      }

      if (coverId) {
        await tx
          .update(articles)
          .set({ coverImageId: coverId, updatedAt: new Date() })
          .where(eq(articles.id, art.id));
      }

      return { ...art, coverImageId: coverId };
    });
  }
  async updateWithOptionalCover(
    acting: { id: number; role?: string },
    articleId: number,
    dto: UpdateArticleDto,
    coverFile?: Express.Multer.File,
  ) {
    this.assertWriter(acting.role);

    const [current] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    if (!current) throw new NotFoundException('Article not found');

    const now = new Date();

    // --- siapkan patch artikel ---
    const patch: Partial<ArticleRow> = { updatedBy: acting.id, updatedAt: now };
    let newSlug: string | undefined;

    if (dto.title && dto.title.trim() && dto.title.trim() !== current.title) {
      patch.title = dto.title.trim();
      newSlug = await this.makeUniqueArticleSlug(dto.title.trim());
      patch.slug = newSlug;
    }
    if (dto.summary !== undefined) patch.summary = dto.summary ?? null;
    if (dto.content !== undefined) patch.content = dto.content ?? null;

    if (dto.status === 'published' && current.status !== 'published') {
      patch.status = 'published' as any;
      patch.publishedAt = now;
    } else if (dto.status === 'draft' && current.status !== 'draft') {
      patch.status = 'draft' as any;
      patch.publishedAt = null;
    }

    const catSlugs =
      dto.categories !== undefined
        ? this.parseCategorySlugs(dto.categories)
        : null;

    // --- hitung gambar inline yang dihapus bila content diupdate ---
    const removedInlineUrls: string[] =
      dto.content !== undefined
        ? (() => {
            const before = new Set(
              this.extractInlineImageUrls(current.content),
            );
            const after = new Set(
              this.extractInlineImageUrls(dto.content ?? ''),
            );
            const lost: string[] = [];
            for (const u of before) if (!after.has(u)) lost.push(u);
            return lost;
          })()
        : [];

    // --- file yang perlu dihapus SETELAH commit (storageKey: 'uploads/...') ---
    const filesToDelete: string[] = [];

    const updated = await this.db.transaction(async (tx) => {
      // 1) update artikel
      if (Object.keys(patch).length > 2 /* updatedBy, updatedAt always set */) {
        await tx.update(articles).set(patch).where(eq(articles.id, articleId));
      }

      // 2) categories (replace-all) jika dikirim
      if (catSlugs) {
        await this.replaceArticleCategories(tx as any, articleId, catSlugs);
      }

      // util: set cover id baru
      const setCoverId = async (imgId: number) => {
        await tx
          .update(articleImages)
          .set({ isCover: true })
          .where(eq(articleImages.id, imgId));
        await tx
          .update(articles)
          .set({ coverImageId: imgId, updatedAt: new Date() })
          .where(eq(articles.id, articleId));
      };

      // ambil cover sebelumnya (jika ada)
      const [prevCover] = current.coverImageId
        ? await tx
            .select()
            .from(articleImages)
            .where(eq(articleImages.id, current.coverImageId))
            .limit(1)
        : [];

      // 3) remove cover?
      if (dto.removeCover) {
        await tx
          .update(articles)
          .set({ coverImageId: null, updatedAt: new Date() })
          .where(eq(articles.id, articleId));

        await tx
          .update(articleImages)
          .set({ isCover: false })
          .where(eq(articleImages.articleId, articleId));

        if (prevCover) {
          await tx
            .delete(articleImages)
            .where(eq(articleImages.id, prevCover.id));
          if (prevCover.storageKey) filesToDelete.push(prevCover.storageKey);
        }
      }

      // 4) cover via file upload
      if (coverFile) {
        const { url, storageKey } = this.toPublicFromFile(coverFile);
        const [img] = await (tx as any)
          .insert(articleImages)
          .values({
            articleId,
            url,
            storageKey,
            alt: dto.coverAlt ?? null,
            isCover: true,
            position: 0,
          })
          .returning();
        await setCoverId(img.id);

        // Auto-hapus cover lama ketika diganti
        if (prevCover) {
          await tx
            .delete(articleImages)
            .where(eq(articleImages.id, prevCover.id));
          if (prevCover.storageKey) filesToDelete.push(prevCover.storageKey);
        }
      }

      // 5) cover via URL
      if (!coverFile && dto.coverUrl) {
        const isLocal = dto.coverUrl.startsWith('/uploads/');
        const storageKey = isLocal ? this.urlToStorageKey(dto.coverUrl) : null;

        const [img] = await (tx as any)
          .insert(articleImages)
          .values({
            articleId,
            url: dto.coverUrl,
            storageKey,
            alt: dto.coverAlt ?? null,
            isCover: true,
            position: 0,
          })
          .returning();
        await setCoverId(img.id);

        if (prevCover) {
          await tx
            .delete(articleImages)
            .where(eq(articleImages.id, prevCover.id));
          if (prevCover.storageKey) filesToDelete.push(prevCover.storageKey);
        }
      }

      // 6) cover via existing imageId
      if (!coverFile && !dto.coverUrl && dto.coverImageId) {
        const [img] = await tx
          .select()
          .from(articleImages)
          .where(
            and(
              eq(articleImages.id, dto.coverImageId),
              eq(articleImages.articleId, articleId),
            ),
          )
          .limit(1);
        if (!img)
          throw new BadRequestException(
            'coverImageId not found on this article',
          );

        await setCoverId(img.id);

        if (prevCover && prevCover.id !== img.id) {
          await tx
            .delete(articleImages)
            .where(eq(articleImages.id, prevCover.id));
          if (prevCover.storageKey) filesToDelete.push(prevCover.storageKey);
        }
      }

      // 7) inline images yang dihapus dari content:
      if (removedInlineUrls.length) {
        await tx
          .delete(articleImages)
          .where(
            and(
              eq(articleImages.articleId, articleId),
              inArray(articleImages.url, removedInlineUrls),
            ),
          );
        for (const url of removedInlineUrls) {
          const key = this.urlToStorageKey(url); // -> "uploads/..."
          if (key) filesToDelete.push(key);
        }
      }

      const [row] = await tx
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);
      return row;
    });

    // --- setelah transaksi sukses: hapus file di filesystem (silent) ---
    for (const key of Array.from(new Set(filesToDelete))) {
      try {
        const url = '/' + key.replace(/\\/g, '/');
        const [{ c }] = await this.db
          .select({ c: sql<number>`count(*)::int` })
          .from(articles)
          .where(
            and(
              ne(articles.id, articleId),
              sql`position(${url} in ${articles.content}) > 0`,
            ),
          );

        if (c === 0) {
          await fs.unlink(join(process.cwd(), key)).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    return updated;
  }

  // === DELETE ===
  async deleteArticle(
    acting: { id: number; role?: string },
    articleId: number,
  ) {
    this.assertWriter(acting.role);

    // pastikan artikel ada
    const [exists] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    if (!exists) throw new NotFoundException('Article not found');

    // ambil semua image milik artikel (cover & inline) SEBELUM delete,
    // supaya masih bisa baca storageKey-nya.
    const imgs = await this.db
      .select({
        id: articleImages.id,
        storageKey: articleImages.storageKey, // nullable
      })
      .from(articleImages)
      .where(eq(articleImages.articleId, articleId));

    // kumpulkan path file yang perlu dihapus (non-null), dedupe
    const filesToDelete = Array.from(
      new Set(
        imgs
          .map((i) => i.storageKey)
          .filter((p): p is string => typeof p === 'string' && p.length > 0),
      ),
    );

    // transaksi: hapus artikel (FK cascade akan menghapus images & links bila sudah diset).
    await this.db.transaction(async (tx) => {
      // Kalau DI DB kamu belum set ON DELETE CASCADE untuk tabel relasi,
      // uncomment baris ini supaya bersih:
      // await tx.delete(articleCategoryLinks).where(eq(articleCategoryLinks.articleId, articleId));
      // await tx.delete(articleImages).where(eq(articleImages.articleId, articleId));

      await tx.delete(articles).where(eq(articles.id, articleId));
    });

    // setelah commit, hapus file fisik di disk (silent error)
    await Promise.all(
      filesToDelete.map((path) =>
        fs.unlink(path).catch(() => {
          // ignore error (mis. file sudah tidak ada)
        }),
      ),
    );

    return { ok: true, id: articleId, deletedFiles: filesToDelete.length };
  }

  async publish(actingUser: { id: number; role?: string }, id: number) {
    this.assertWriter(actingUser.role);

    const [existing] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('Article not found');

    const [row] = await this.db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedBy: actingUser.id,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();

    return row;
  }

  async unpublish(actingUser: { id: number; role?: string }, id: number) {
    this.assertWriter(actingUser.role);

    const [existing] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('Article not found');

    const [row] = await this.db
      .update(articles)
      .set({
        status: 'draft',
        updatedBy: actingUser.id,
        updatedAt: new Date(),
        publishedAt: null as any,
      })
      .where(eq(articles.id, id))
      .returning();

    return row;
  }

  async getPublicList(query: { q?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const where = query.q
      ? and(
          eq(articles.status, 'published'),
          ilike(articles.title, `%${query.q}%`),
        )
      : eq(articles.status, 'published');

    const rows = await this.db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) return [];

    // Get cover images (if any)
    const coverIds = rows
      .filter((r) => r.coverImageId)
      .map((r) => r.coverImageId!);
    const covers = coverIds.length
      ? await this.db
          .select()
          .from(articleImages)
          .where(inArray(articleImages.id, coverIds))
      : [];
    const map = new Map(covers.map((c) => [c.id, c] as const));

    return rows.map((r) => ({
      ...r,
      coverImage: r.coverImageId ? (map.get(r.coverImageId) ?? null) : null,
    }));
  }

  async getPublicBySlug(slug: string) {
    // ambil artikel published by slug
    const [row] = await this.db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        content: articles.content,
        status: articles.status,
        coverImageId: articles.coverImageId,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        createdBy: articles.createdBy,
        updatedBy: articles.updatedBy,
      })
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);

    if (!row) throw new NotFoundException('Article not found');

    // ambil semua images milik artikel (untuk posisi & cover)
    const images = await this.db
      .select({
        id: articleImages.id,
        articleId: articleImages.articleId,
        url: articleImages.url,
        storageKey: articleImages.storageKey,
        alt: articleImages.alt,
        isCover: articleImages.isCover,
        position: articleImages.position,
        createdAt: articleImages.createdAt,
      })
      .from(articleImages)
      .where(eq(articleImages.articleId, row.id))
      .orderBy(articleImages.position);

    // coverImageUrl (ambil dari images yang sudah kita fetch; fallback query kalau perlu)
    let coverImageUrl: string | null = null;
    if (row.coverImageId) {
      const cover = images.find((img) => img.id === row.coverImageId);
      if (cover) {
        coverImageUrl = cover.url ?? null;
      } else {
        const [cv] = await this.db
          .select({ url: articleImages.url })
          .from(articleImages)
          .where(eq(articleImages.id, row.coverImageId))
          .limit(1);
        coverImageUrl = cv?.url ?? null;
      }
    }

    // categories
    const catMap = await this.getCategoriesMap([row.id]);
    const categories = catMap.get(row.id) ?? [];

    return {
      ...row,
      coverImageUrl,
      images,
      categories,
    };
  }

  async getByIdForAdmin(actingUser: { id: number; role?: string }, id: number) {
    this.assertWriter(actingUser.role);

    // Ambil artikel dengan kolom yang jelas
    const [row] = await this.db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        content: articles.content,
        status: articles.status,
        coverImageId: articles.coverImageId,
        createdBy: articles.createdBy,
        updatedBy: articles.updatedBy,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Article not found');

    // Ambil semua images milik artikel (sekalian buat cari cover url)
    const images = await this.db
      .select({
        id: articleImages.id,
        articleId: articleImages.articleId,
        url: articleImages.url,
        storageKey: articleImages.storageKey,
        alt: articleImages.alt,
        isCover: articleImages.isCover,
        position: articleImages.position,
        createdAt: articleImages.createdAt,
      })
      .from(articleImages)
      .where(eq(articleImages.articleId, id))
      .orderBy(articleImages.position);

    // Tentukan coverImageUrl
    let coverImageUrl: string | null = null;
    if (row.coverImageId) {
      const coverInList = images.find((img) => img.id === row.coverImageId);
      if (coverInList) {
        coverImageUrl = coverInList.url ?? null;
      } else {
        // fallback kalau tidak ada di list (harusnya jarang terjadi)
        const [cv] = await this.db
          .select({ url: articleImages.url })
          .from(articleImages)
          .where(eq(articleImages.id, row.coverImageId))
          .limit(1);
        coverImageUrl = cv?.url ?? null;
      }
    }

    // Ambil categories untuk artikel ini
    const catMap = await this.getCategoriesMap([row.id]);
    const categories = catMap.get(row.id) ?? [];

    return {
      ...row,
      coverImageUrl, // <-- tambahan
      images,
      categories, // <-- tambahan
    };
  }

  async listAllForAdmin(
    actingUser: { id: number; role?: string },
    query: {
      q?: string;
      limit?: number;
      offset?: number;
      status?: 'draft' | 'published';
    },
  ) {
    this.assertWriter(actingUser.role);

    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    let where: any = undefined;
    if (query.q) where = ilike(articles.title, `%${query.q}%`);
    if (query.status)
      where = where
        ? and(where, eq(articles.status, query.status))
        : eq(articles.status, query.status);

    const rows = await this.db
      .select()
      .from(articles)
      .where(where ?? sql`true`)
      .orderBy(desc(articles.updatedAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async attachImage(
    actingUser: { id: number; role?: string },
    id: number,
    file: { url: string; storageKey?: string },
    opts: { alt?: string; isCover?: boolean; position?: number },
  ) {
    this.assertWriter(actingUser.role);

    const [art] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, id));
    if (!art) throw new NotFoundException('Article not found');

    const [img] = await this.db
      .insert(articleImages)
      .values({
        articleId: id,
        url: file.url,
        storageKey: file.storageKey,
        alt: opts.alt,
        isCover: !!opts.isCover,
        position: opts.position ?? 0,
      })
      .returning();

    if (opts.isCover) {
      await this.db
        .update(articles)
        .set({
          coverImageId: img.id,
          updatedAt: new Date(),
          updatedBy: actingUser.id,
        })
        .where(eq(articles.id, id));
    }

    return img;
  }

  async deleteImage(
    actingUser: { id: number; role?: string },
    id: number,
    imageId: number,
  ) {
    this.assertWriter(actingUser.role);

    const [img] = await this.db
      .select()
      .from(articleImages)
      .where(
        and(eq(articleImages.id, imageId), eq(articleImages.articleId, id)),
      );
    if (!img) throw new NotFoundException('Image not found');

    await this.db.delete(articleImages).where(eq(articleImages.id, imageId));

    // if deleted image was cover
    await this.db
      .update(articles)
      .set({ coverImageId: null as any, updatedAt: new Date() })
      .where(and(eq(articles.id, id), eq(articles.coverImageId, imageId)));

    return { ok: true };
  }

  async editorUpload(file: Express.Multer.File) {
    const { url, storageKey } = this.fileToPublic(file);
    return { url, storageKey };
  }

  // =================================== Categories ================================ //

  async getCategoryById(id: number) {
    const [row] = await this.db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        updatedAt: articleCategories.updatedAt,
      })
      .from(articleCategories)
      .where(eq(articleCategories.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  /** All (no paging) with filters (search / ids / slugs) */
  async findCategoriesAll(params: {
    search?: string;
    ids?: number[];
    slugs?: string[];
  }) {
    const whereParts: (SQL<unknown> | undefined)[] = [];

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      const cond = or(
        ilike(articleCategories.name, q),
        ilike(articleCategories.slug, q),
      );
      if (cond) whereParts.push(cond);
    }

    if (params?.ids && params.ids.length > 0) {
      whereParts.push(inArray(articleCategories.id, params.ids));
    }

    if (params?.slugs && params.slugs.length > 0) {
      whereParts.push(inArray(articleCategories.slug, params.slugs));
    }

    const whereExpr = whereParts.length ? and(...whereParts) : undefined;

    const rows = await this.db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        updatedAt: articleCategories.updatedAt,
      })
      .from(articleCategories)
      .where(whereExpr)
      .orderBy(asc(articleCategories.name));

    return rows;
  }

  /** Paged + filter + sort */
  async findCategoriesPaged(opts: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    ids?: number[];
    slugs?: string[];
  }) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 10));
    const offset = (page - 1) * limit;

    const whereParts: (SQL<unknown> | undefined)[] = [];

    if (opts?.search && opts.search.trim()) {
      const q = `%${opts.search.trim()}%`;
      const cond = or(
        ilike(articleCategories.name, q),
        ilike(articleCategories.slug, q),
      );
      if (cond) whereParts.push(cond);
    }
    if (opts?.ids && opts.ids.length > 0) {
      whereParts.push(inArray(articleCategories.id, opts.ids));
    }
    if (opts?.slugs && opts.slugs.length > 0) {
      whereParts.push(inArray(articleCategories.slug, opts.slugs));
    }

    const whereExpr = whereParts.length ? and(...whereParts) : undefined;

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(articleCategories)
      .where(whereExpr);

    type SortItem = {
      id: 'name' | 'slug' | 'created_at' | 'updated_at';
      desc?: boolean;
    };
    let orderBy: any[] = [asc(articleCategories.name)];
    if (opts.sort) {
      try {
        const parsed = JSON.parse(opts.sort) as SortItem[];
        const cols = {
          name: articleCategories.name,
          slug: articleCategories.slug,
          created_at: articleCategories.createdAt,
          updated_at: articleCategories.updatedAt,
        } as const;
        const mapped = parsed
          .map((s) => {
            const col = cols[s.id];
            return col ? (s.desc ? desc(col) : asc(col)) : null;
          })
          .filter(Boolean) as any[];
        if (mapped.length) orderBy = mapped;
      } catch {
        /* ignore invalid sort */
      }
    }

    const categories = await this.db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        updatedAt: articleCategories.updatedAt,
      })
      .from(articleCategories)
      .where(whereExpr)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      total,
      offset,
      limit,
      categories,
    };
  }
}
