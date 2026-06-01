ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_email_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_period_start" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_email_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_period_start" timestamp DEFAULT now() NOT NULL;
