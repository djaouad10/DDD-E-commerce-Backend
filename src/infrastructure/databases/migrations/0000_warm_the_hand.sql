CREATE TYPE "public"."color" AS ENUM('BLACK', 'WHITE', 'GRAY', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 'BROWN', 'BEIGE', 'NAVY', 'MAROON', 'TEAL');--> statement-breakpoint
CREATE TYPE "public"."delivery_type" AS ENUM('TO_DESK', 'TO_HOME');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'PRE_TRANSIT', 'SHIPPING', 'DELIVERED', 'RETURNED', 'CANCELLED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."outbox_category" AS ENUM('outbox-job', 'domain-event');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CLIENT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."shipping_provider" AS ENUM('WORLD_EXPRESS');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42', 'EU_43');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"variation_id" varchar(40) NOT NULL,
	"selected_qty" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"public_url" varchar(2048) NOT NULL,
	"product_id" varchar(40) NOT NULL,
	"is_main" boolean NOT NULL,
	CONSTRAINT "file_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"tracking_number" varchar(32),
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"shipping_status" varchar(50),
	"user_id" text NOT NULL,
	"shipping_price_at_order_time" real NOT NULL,
	"selected_shipping_provider" "shipping_provider" NOT NULL,
	"shipping_details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "order_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"order_id" varchar(40) NOT NULL,
	"variation_id" varchar(40) NOT NULL,
	"qty" smallint NOT NULL,
	"unit_price_at_order_time" real NOT NULL,
	"unit_discount_price_at_order_time" real,
	"weight_at_order_time" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"category" "outbox_category" NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"aggregate_id" varchar(40),
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(300) NOT NULL,
	"description" varchar(5000),
	"category_id" varchar(40),
	"brand" varchar(100) NOT NULL,
	"material" varchar(100) NOT NULL,
	"price" real NOT NULL,
	"discount_price" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"user_id" varchar(40) NOT NULL,
	"product_id" varchar(40) NOT NULL,
	"rating" smallint NOT NULL,
	"comment" varchar(1000),
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'CLIENT' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "variation" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"product_id" varchar(40) NOT NULL,
	"size" "size" NOT NULL,
	"color" "color" NOT NULL,
	"total_qty" integer NOT NULL,
	"reserved_qty" integer NOT NULL,
	"weight_in_grams" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation" ADD CONSTRAINT "variation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_user_id_variation_id_idx" ON "cart_item" USING btree ("user_id","variation_id");--> statement-breakpoint
CREATE INDEX "cart_item_user_id_idx" ON "cart_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_product_id_idx" ON "file" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_user_id_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_created_at_idx" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_item_order_id_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "outbox_category_status_scheduled_idx" ON "outbox" USING btree ("category","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "outbox_aggregate_id_idx" ON "outbox" USING btree ("aggregate_id");--> statement-breakpoint
CREATE INDEX "outbox_event_type_idx" ON "outbox" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "product_category_id_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_slug_idx" ON "product" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "rating_product_id_idx" ON "rating" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "rating_user_id_idx" ON "rating" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rating_is_approved_idx" ON "rating" USING btree ("is_approved");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_banned_idx" ON "user" USING btree ("banned");--> statement-breakpoint
CREATE UNIQUE INDEX "variation_product_id_color_size_idx" ON "variation" USING btree ("product_id","color","size");--> statement-breakpoint
CREATE INDEX "variation_product_id_idx" ON "variation" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variation_color_idx" ON "variation" USING btree ("color");--> statement-breakpoint
CREATE INDEX "variation_size_idx" ON "variation" USING btree ("size");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");