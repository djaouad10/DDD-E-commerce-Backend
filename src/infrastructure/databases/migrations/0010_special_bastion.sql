ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_pkey";
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_id_handler_name_pk" PRIMARY KEY("id","handler_name");--> statement-breakpoint
CREATE INDEX "idempotency_keys_handler_name_idx" ON "idempotency_keys" USING btree ("handler_name");