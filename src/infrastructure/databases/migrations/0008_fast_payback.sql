CREATE TABLE "conversation" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200),
	"is_processing" boolean DEFAULT false NOT NULL,
	"processing_started_at" timestamp,
	"max_context_window_reached" boolean DEFAULT false NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_message" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"conversation_id" varchar(40) NOT NULL,
	"sequence" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"parts" jsonb NOT NULL,
	"provider_state" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_user_id_idx" ON "conversation" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_message_conv_seq_idx" ON "conversation_message" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE INDEX "conversation_message_conversation_id_idx" ON "conversation_message" USING btree ("conversation_id");