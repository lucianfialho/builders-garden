CREATE TABLE "currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"seeds" integer DEFAULT 0 NOT NULL,
	"lifetime_seeds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "gardens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"grid_size" integer DEFAULT 10 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"total_growth_points" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"last_check_in" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gardens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"expires_at" timestamp,
	"scope" varchar(500),
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"ga_sessions" integer DEFAULT 0,
	"ga_users" integer DEFAULT 0,
	"stripe_revenue" numeric(10, 2) DEFAULT '0',
	"stripe_payments" integer DEFAULT 0,
	"growth_points_earned" integer DEFAULT 0,
	"seeds_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garden_id" uuid NOT NULL,
	"plant_type_id" varchar(50) NOT NULL,
	"position_x" integer NOT NULL,
	"position_y" integer NOT NULL,
	"growth_stage" integer DEFAULT 0 NOT NULL,
	"growth_points" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"planted_at" timestamp DEFAULT now() NOT NULL,
	"last_grown_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shop_item_id" varchar(50) NOT NULL,
	"price" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"category" varchar(50) NOT NULL,
	"price" integer NOT NULL,
	"effect" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"garden_id" uuid NOT NULL,
	"visited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "currency" ADD CONSTRAINT "currency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_shop_item_id_shop_items_id_fk" FOREIGN KEY ("shop_item_id") REFERENCES "public"."shop_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_id_users_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "currency_user_idx" ON "currency" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gardens_user_idx" ON "gardens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gardens_rank_idx" ON "gardens" USING btree ("rank");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_user_provider_idx" ON "integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_user_date_idx" ON "metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "metrics_date_idx" ON "metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "plants_garden_idx" ON "plants" USING btree ("garden_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plants_position_idx" ON "plants" USING btree ("garden_id","position_x","position_y");--> statement-breakpoint
CREATE INDEX "purchases_user_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchases_user_item_idx" ON "purchases" USING btree ("user_id","shop_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "visits_visitor_idx" ON "visits" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "visits_garden_idx" ON "visits" USING btree ("garden_id");