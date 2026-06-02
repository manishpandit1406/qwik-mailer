ALTER TYPE "public"."user_plan" ADD VALUE 'event_level' BEFORE 'starter';--> statement-breakpoint
ALTER TYPE "public"."user_plan" ADD VALUE 'premium' BEFORE 'enterprise';--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "ses_dkim_tokens" text[];--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "mail_from_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "monthly_email_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_period_start" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_email_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_period_start" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_address_2" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zip_code" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(100);