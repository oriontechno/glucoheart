CREATE TYPE "public"."article_status" AS ENUM('draft', 'published');--> statement-breakpoint
ALTER TABLE "article_images" RENAME COLUMN "image_url" TO "url";--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_slug_unique";--> statement-breakpoint
ALTER TABLE "article_images" DROP CONSTRAINT "article_images_article_id_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "article_images" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "article_images" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "article_images" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "slug" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "published_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "article_images" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "article_images" ADD COLUMN "alt" text;--> statement-breakpoint
ALTER TABLE "article_images" ADD COLUMN "is_cover" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "article_images" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "status" "article_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "cover_image_id" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "updated_by" integer;--> statement-breakpoint
ALTER TABLE "article_images" ADD CONSTRAINT "article_images_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_article_images_article" ON "article_images" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_article_images_position" ON "article_images" USING btree ("article_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_articles_slug" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_articles_published_at" ON "articles" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "article_images" DROP COLUMN "caption";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "cover_image";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "author_id";