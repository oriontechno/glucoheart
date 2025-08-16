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
  and,
  eq,
  ilike,
  desc,
  inArray,
  sql,
  asc,
  notInArray,
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

type ArticleStatus = 'draft' | 'published';

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

  private async ensureUniqueSlug(base: string, articleId?: number) {
    let attempt = 0;
    while (attempt < 50) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, slug));
      if (existing.length === 0 || (articleId && existing[0].id === articleId))
        return slug;
      attempt++;
    }
    throw new BadRequestException('Unable to generate unique slug');
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

    // WHERE dasar (status/search)
    const whereBase = this.buildWhere({
      status: params.status,
      search: params.search,
      defaultToPublished: true,
    });

    // Filter kategori via EXISTS (OR: salah satu slug cocok)
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

    // attach categories
    const map = await this.getCategoriesMap(rows.map((r) => r.id));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      summary: r.summary ?? null,
      coverImageId: r.coverImageId ?? null,
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
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null,
        published_at: r.publishedAt ?? null,
        categories: map.get(r.id) ?? [],
      })),
    };
  }

  // ================================ End Filter ====================================== //

  async create(
    actingUser: { id: number; role?: string },
    dto: CreateArticleDto,
  ) {
    this.assertWriter(actingUser.role);

    const baseSlug = dto.slug
      ? this.slugify(dto.slug)
      : this.slugify(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const [row] = await this.db
      .insert(articles)
      .values({
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        slug,
        status: 'draft',
        createdBy: actingUser.id,
        updatedBy: actingUser.id,
      })
      .returning();

    return row;
  }

  async update(
    actingUser: { id: number; role?: string },
    id: number,
    dto: UpdateArticleDto,
  ) {
    this.assertWriter(actingUser.role);

    const [existing] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('Article not found');

    let slug = existing.slug;
    if (dto.slug) {
      const base = this.slugify(dto.slug);
      slug = await this.ensureUniqueSlug(base, id);
    } else if (dto.title && !existing.publishedAt) {
      // allow update slug from title when still draft
      const base = this.slugify(dto.title);
      slug = await this.ensureUniqueSlug(base, id);
    }

    const [row] = await this.db
      .update(articles)
      .set({
        title: dto.title ?? existing.title,
        summary: dto.summary ?? existing.summary,
        content: dto.content ?? existing.content,
        slug,
        updatedBy: actingUser.id,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();

    return row;
  }

  async delete(actingUser: { id: number; role?: string }, id: number) {
    this.assertWriter(actingUser.role);

    const [existing] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('Article not found');

    await this.db.delete(articles).where(eq(articles.id, id));
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
    const [row] = await this.db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')));
    if (!row) throw new NotFoundException('Article not found');

    const images = await this.db
      .select()
      .from(articleImages)
      .where(eq(articleImages.articleId, row.id))
      .orderBy(articleImages.position);
    return { ...row, images };
  }

  async getByIdForAdmin(actingUser: { id: number; role?: string }, id: number) {
    this.assertWriter(actingUser.role);

    const [row] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    if (!row) throw new NotFoundException('Article not found');

    const images = await this.db
      .select()
      .from(articleImages)
      .where(eq(articleImages.articleId, id))
      .orderBy(articleImages.position);
    return { ...row, images };
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

  async uploadEditorImage(
    actingUser: { id: number; role?: string },
    articleId: number,
    file: { url: string; storageKey?: string },
    opts?: { alt?: string; position?: number },
  ) {
    // Hanya ADMIN/SUPPORT yang boleh
    if (actingUser.role !== 'ADMIN' && actingUser.role !== 'SUPPORT') {
      throw new ForbiddenException('Only ADMIN or SUPPORT can upload images');
    }

    // Pastikan artikel ada
    const [art] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, articleId));
    if (!art) throw new NotFoundException('Article not found');

    // Simpan image (bukan cover)
    const [img] = await this.db
      .insert(articleImages)
      .values({
        articleId,
        url: file.url,
        storageKey: file.storageKey,
        alt: opts?.alt,
        isCover: false,
        position: opts?.position ?? 0,
      })
      .returning();

    // CKEditor SimpleUpload minimal butuh { url }
    return { url: file.url, image: img };
  }
}
