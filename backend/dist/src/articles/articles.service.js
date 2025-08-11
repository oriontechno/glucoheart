"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
let ArticlesService = class ArticlesService {
    db;
    constructor(db) {
        this.db = db;
    }
    assertWriter(role) {
        if (role !== 'ADMIN' && role !== 'SUPPORT') {
            throw new common_1.ForbiddenException('Only ADMIN or SUPPORT can write articles');
        }
    }
    slugify(input) {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
    async ensureUniqueSlug(base, articleId) {
        let attempt = 0;
        while (attempt < 50) {
            const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
            const existing = await this.db
                .select({ id: schema_1.articles.id })
                .from(schema_1.articles)
                .where((0, drizzle_orm_1.eq)(schema_1.articles.slug, slug));
            if (existing.length === 0 || (articleId && existing[0].id === articleId))
                return slug;
            attempt++;
        }
        throw new common_1.BadRequestException('Unable to generate unique slug');
    }
    async create(actingUser, dto) {
        this.assertWriter(actingUser.role);
        const baseSlug = dto.slug
            ? this.slugify(dto.slug)
            : this.slugify(dto.title);
        const slug = await this.ensureUniqueSlug(baseSlug);
        const [row] = await this.db
            .insert(schema_1.articles)
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
    async update(actingUser, id, dto) {
        this.assertWriter(actingUser.role);
        const [existing] = await this.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        if (!existing)
            throw new common_1.NotFoundException('Article not found');
        let slug = existing.slug;
        if (dto.slug) {
            const base = this.slugify(dto.slug);
            slug = await this.ensureUniqueSlug(base, id);
        }
        else if (dto.title && !existing.publishedAt) {
            const base = this.slugify(dto.title);
            slug = await this.ensureUniqueSlug(base, id);
        }
        const [row] = await this.db
            .update(schema_1.articles)
            .set({
            title: dto.title ?? existing.title,
            summary: dto.summary ?? existing.summary,
            content: dto.content ?? existing.content,
            slug,
            updatedBy: actingUser.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id))
            .returning();
        return row;
    }
    async publish(actingUser, id) {
        this.assertWriter(actingUser.role);
        const [existing] = await this.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        if (!existing)
            throw new common_1.NotFoundException('Article not found');
        const [row] = await this.db
            .update(schema_1.articles)
            .set({
            status: 'published',
            publishedAt: new Date(),
            updatedBy: actingUser.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id))
            .returning();
        return row;
    }
    async unpublish(actingUser, id) {
        this.assertWriter(actingUser.role);
        const [existing] = await this.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        if (!existing)
            throw new common_1.NotFoundException('Article not found');
        const [row] = await this.db
            .update(schema_1.articles)
            .set({
            status: 'draft',
            updatedBy: actingUser.id,
            updatedAt: new Date(),
            publishedAt: null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id))
            .returning();
        return row;
    }
    async getPublicList(query) {
        const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
        const offset = Math.max(query.offset ?? 0, 0);
        const where = query.q
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.articles.status, 'published'), (0, drizzle_orm_1.ilike)(schema_1.articles.title, `%${query.q}%`))
            : (0, drizzle_orm_1.eq)(schema_1.articles.status, 'published');
        const rows = await this.db
            .select()
            .from(schema_1.articles)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.articles.publishedAt))
            .limit(limit)
            .offset(offset);
        if (rows.length === 0)
            return [];
        const coverIds = rows
            .filter((r) => r.coverImageId)
            .map((r) => r.coverImageId);
        const covers = coverIds.length
            ? await this.db
                .select()
                .from(schema_1.articleImages)
                .where((0, drizzle_orm_1.inArray)(schema_1.articleImages.id, coverIds))
            : [];
        const map = new Map(covers.map((c) => [c.id, c]));
        return rows.map((r) => ({
            ...r,
            coverImage: r.coverImageId ? (map.get(r.coverImageId) ?? null) : null,
        }));
    }
    async getPublicBySlug(slug) {
        const [row] = await this.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.articles.slug, slug), (0, drizzle_orm_1.eq)(schema_1.articles.status, 'published')));
        if (!row)
            throw new common_1.NotFoundException('Article not found');
        const images = await this.db
            .select()
            .from(schema_1.articleImages)
            .where((0, drizzle_orm_1.eq)(schema_1.articleImages.articleId, row.id))
            .orderBy(schema_1.articleImages.position);
        return { ...row, images };
    }
    async getByIdForAdmin(actingUser, id) {
        this.assertWriter(actingUser.role);
        const [row] = await this.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        if (!row)
            throw new common_1.NotFoundException('Article not found');
        const images = await this.db
            .select()
            .from(schema_1.articleImages)
            .where((0, drizzle_orm_1.eq)(schema_1.articleImages.articleId, id))
            .orderBy(schema_1.articleImages.position);
        return { ...row, images };
    }
    async listAllForAdmin(actingUser, query) {
        this.assertWriter(actingUser.role);
        const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
        const offset = Math.max(query.offset ?? 0, 0);
        let where = undefined;
        if (query.q)
            where = (0, drizzle_orm_1.ilike)(schema_1.articles.title, `%${query.q}%`);
        if (query.status)
            where = where
                ? (0, drizzle_orm_1.and)(where, (0, drizzle_orm_1.eq)(schema_1.articles.status, query.status))
                : (0, drizzle_orm_1.eq)(schema_1.articles.status, query.status);
        const rows = await this.db
            .select()
            .from(schema_1.articles)
            .where(where ?? (0, drizzle_orm_1.sql) `true`)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.articles.updatedAt))
            .limit(limit)
            .offset(offset);
        return rows;
    }
    async attachImage(actingUser, id, file, opts) {
        this.assertWriter(actingUser.role);
        const [art] = await this.db
            .select({ id: schema_1.articles.id })
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        if (!art)
            throw new common_1.NotFoundException('Article not found');
        const [img] = await this.db
            .insert(schema_1.articleImages)
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
                .update(schema_1.articles)
                .set({
                coverImageId: img.id,
                updatedAt: new Date(),
                updatedBy: actingUser.id,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id));
        }
        return img;
    }
    async deleteImage(actingUser, id, imageId) {
        this.assertWriter(actingUser.role);
        const [img] = await this.db
            .select()
            .from(schema_1.articleImages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.articleImages.id, imageId), (0, drizzle_orm_1.eq)(schema_1.articleImages.articleId, id)));
        if (!img)
            throw new common_1.NotFoundException('Image not found');
        await this.db.delete(schema_1.articleImages).where((0, drizzle_orm_1.eq)(schema_1.articleImages.id, imageId));
        await this.db
            .update(schema_1.articles)
            .set({ coverImageId: null, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.articles.id, id), (0, drizzle_orm_1.eq)(schema_1.articles.coverImageId, imageId)));
        return { ok: true };
    }
    async uploadEditorImage(actingUser, articleId, file, opts) {
        if (actingUser.role !== 'ADMIN' && actingUser.role !== 'SUPPORT') {
            throw new common_1.ForbiddenException('Only ADMIN or SUPPORT can upload images');
        }
        const [art] = await this.db
            .select({ id: schema_1.articles.id })
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.eq)(schema_1.articles.id, articleId));
        if (!art)
            throw new common_1.NotFoundException('Article not found');
        const [img] = await this.db
            .insert(schema_1.articleImages)
            .values({
            articleId,
            url: file.url,
            storageKey: file.storageKey,
            alt: opts?.alt,
            isCover: false,
            position: opts?.position ?? 0,
        })
            .returning();
        return { url: file.url, image: img };
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], ArticlesService);
//# sourceMappingURL=articles.service.js.map