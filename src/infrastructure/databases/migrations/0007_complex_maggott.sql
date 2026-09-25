CREATE TABLE "product_embeddings" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"product_id" varchar(40) NOT NULL,
	"chunk_index" smallint NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "product_embeddings_hnsw_idx" ON "product_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_embeddings_product_chunk_idx" ON "product_embeddings" USING btree ("product_id","chunk_index");