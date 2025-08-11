"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRelations = exports.articleImages = exports.articles = exports.articleStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.articleStatus = (0, pg_core_1.pgEnum)('article_status', ['draft', 'published']);
exports.articles = (0, pg_core_1.pgTable)('articles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    title: (0, pg_core_1.text)('title').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull(),
    summary: (0, pg_core_1.text)('summary'),
    content: (0, pg_core_1.text)('content').notNull(),
    status: (0, exports.articleStatus)('status').notNull().default('draft'),
    coverImageId: (0, pg_core_1.integer)('cover_image_id'),
    createdBy: (0, pg_core_1.integer)('created_by').references(() => users_1.users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
    updatedBy: (0, pg_core_1.integer)('updated_by').references(() => users_1.users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    uqSlug: (0, pg_core_1.uniqueIndex)('uq_articles_slug').on(t.slug),
    idxStatus: (0, pg_core_1.index)('idx_articles_status').on(t.status),
    idxPublishedAt: (0, pg_core_1.index)('idx_articles_published_at').on(t.publishedAt),
}));
exports.articleImages = (0, pg_core_1.pgTable)('article_images', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    articleId: (0, pg_core_1.integer)('article_id')
        .notNull()
        .references(() => exports.articles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    url: (0, pg_core_1.text)('url').notNull(),
    storageKey: (0, pg_core_1.text)('storage_key'),
    alt: (0, pg_core_1.text)('alt'),
    isCover: (0, pg_core_1.boolean)('is_cover').notNull().default(false),
    position: (0, pg_core_1.integer)('position').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    idxArticle: (0, pg_core_1.index)('idx_article_images_article').on(t.articleId),
    idxPosition: (0, pg_core_1.index)('idx_article_images_position').on(t.articleId, t.position),
}));
exports.articleRelations = (0, drizzle_orm_1.relations)(exports.articles, ({ many }) => ({
    images: many(exports.articleImages),
}));
//# sourceMappingURL=articles.js.map