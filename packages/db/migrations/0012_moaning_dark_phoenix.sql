CREATE TYPE "public"."sender_identity_category" AS ENUM('marketing', 'transactional', 'otp');--> statement-breakpoint
CREATE TABLE "sender_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"nickname" varchar(255),
	"reply_to" varchar(255),
	"category" "sender_identity_category" NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"company_address" text,
	"company_address_2" text,
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"country" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspend_reason" text,
	"spam_complaints" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "ip_address" varchar(64);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" varchar(255);--> statement-breakpoint
ALTER TABLE "user_passkeys" ADD COLUMN "device_name" varchar(255);--> statement-breakpoint
ALTER TABLE "user_passkeys" ADD COLUMN "device_os" varchar(64);--> statement-breakpoint
ALTER TABLE "user_passkeys" ADD COLUMN "browser" varchar(64);--> statement-breakpoint
ALTER TABLE "user_passkeys" ADD COLUMN "ip_address" varchar(64);--> statement-breakpoint
ALTER TABLE "sender_identities" ADD CONSTRAINT "sender_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sender_identities_username_idx" ON "sender_identities" USING btree ("username");--> statement-breakpoint
CREATE INDEX "sender_identities_user_idx" ON "sender_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sender_identities_category_idx" ON "sender_identities" USING btree ("category");