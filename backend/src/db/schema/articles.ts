import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const articleStatus = pgEnum('article_status', ['draft', 'published']);

export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    content: text('content').notNull(),
    status: articleStatus('status').notNull().default('draft'),

    coverImageId: integer('cover_image_id'), // FK to article_images.id (set via app)

    createdBy: integer('created_by').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    updatedBy: integer('updated_by').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),

    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqSlug: uniqueIndex('uq_articles_slug').on(t.slug),
    idxStatus: index('idx_articles_status').on(t.status),
    idxPublishedAt: index('idx_articles_published_at').on(t.publishedAt),
  }),
);

export const articleImages = pgTable(
  'article_images',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    url: text('url').notNull(), // stored public path or CDN URL
    storageKey: text('storage_key'), // path/filename for deletion
    alt: text('alt'),
    isCover: boolean('is_cover').notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxArticle: index('idx_article_images_article').on(t.articleId),
    idxPosition: index('idx_article_images_position').on(
      t.articleId,
      t.position,
    ),
  }),
);

export const articleRelations = relations(articles, ({ many }) => ({
  images: many(articleImages),
}));

export const articleCategories = pgTable(
  'article_categories',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(), // unik
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uqSlug: uniqueIndex('uq_article_categories_slug').on(t.slug),
    idxName: index('idx_article_categories_name').on(t.name),
  }),
);

// --- M:N link (article <-> category) ---
export const articleCategoryLinks = pgTable(
  'article_category_links',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => articleCategories.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (t) => ({
    uqArticleCategory: uniqueIndex('uq_article_category').on(
      t.articleId,
      t.categoryId,
    ),
    idxArticle: index('idx_article_category_article').on(t.articleId),
    idxCategory: index('idx_article_category_category').on(t.categoryId),
  }),
);
