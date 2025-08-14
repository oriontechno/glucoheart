CREATE TABLE "article_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "article_category_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_category_links" ADD CONSTRAINT "article_category_links_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "article_category_links" ADD CONSTRAINT "article_category_links_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_article_categories_slug" ON "article_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_article_categories_name" ON "article_categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_article_category" ON "article_category_links" USING btree ("article_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_article_category_article" ON "article_category_links" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_article_category_category" ON "article_category_links" USING btree ("category_id");