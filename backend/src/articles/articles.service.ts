import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, ilike, desc, inArray, sql } from 'drizzle-orm';
import { articles, articleImages } from '../db/schema';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

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
