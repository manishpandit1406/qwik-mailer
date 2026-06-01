ALTER TYPE "public"."email_event_type" ADD VALUE 'queued' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."email_event_type" ADD VALUE 'sent' BEFORE 'delivered';--> statement-breakpoint
CREATE TABLE "dedicated_ips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"pool_id" uuid,
	"domain_id" uuid,
	"is_warmup_enabled" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dedicated_ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "ip_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "ip_allowlist" text[];--> statement-breakpoint
ALTER TABLE "dedicated_ips" ADD CONSTRAINT "dedicated_ips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedicated_ips" ADD CONSTRAINT "dedicated_ips_pool_id_ip_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."ip_pools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_pools" ADD CONSTRAINT "ip_pools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dedicated_ips_user_idx" ON "dedicated_ips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dedicated_ips_pool_idx" ON "dedicated_ips" USING btree ("pool_id");--> statement-breakpoint
CREATE INDEX "ip_pools_user_idx" ON "ip_pools" USING btree ("user_id");