CREATE TYPE "public"."chat_session_type" AS ENUM('one_to_one', 'group');--> statement-breakpoint
CREATE TYPE "public"."chat_participant_role" AS ENUM('member', 'nurse');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'NURSE', 'ADMIN', 'SUPPORT');--> statement-breakpoint
CREATE TABLE "article_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"caption" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"cover_image" varchar(255),
	"author_id" integer NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_session_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "chat_participant_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "chat_session_type" DEFAULT 'one_to_one' NOT NULL,
	"user_a_id" integer,
	"user_b_id" integer,
	"assigned_nurse_id" integer,
	"last_message_id" integer,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"last_message_id" integer,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"google_id" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" "role" DEFAULT 'USER' NOT NULL,
	"profile_picture" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_images" ADD CONSTRAINT "article_images_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session_participants" ADD CONSTRAINT "chat_session_participants_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_session_participants" ADD CONSTRAINT "chat_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_assigned_nurse_id_users_id_fk" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_room_id_discussion_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."discussion_rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discussion_participants" ADD CONSTRAINT "discussion_participants_room_id_discussion_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."discussion_rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discussion_participants" ADD CONSTRAINT "discussion_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discussion_rooms" ADD CONSTRAINT "discussion_rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chat_session_participant_unique" ON "chat_session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_session_participants_session" ON "chat_session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chat_sessions_one_to_one_pair_unique" ON "chat_sessions" USING btree ("type","user_a_id","user_b_id");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_updated_at" ON "chat_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_messages_session_created_at" ON "messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_discussion_messages_room_created_at" ON "discussion_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_discussion_participant_unique" ON "discussion_participants" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_discussion_participants_room" ON "discussion_participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_discussion_rooms_updated_at" ON "discussion_rooms" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_discussion_rooms_public" ON "discussion_rooms" USING btree ("is_public");