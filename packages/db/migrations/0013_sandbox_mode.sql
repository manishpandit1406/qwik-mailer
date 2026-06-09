-- Add sandbox_mode to teams table
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sandbox_mode" boolean NOT NULL DEFAULT false;

-- Create sandbox_emails table
CREATE TABLE IF NOT EXISTS "sandbox_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "from_email" varchar(255) NOT NULL,
  "from_name" varchar(255),
  "to_email" varchar(255) NOT NULL,
  "to_name" varchar(255),
  "reply_to" varchar(255),
  "subject" text NOT NULL,
  "html_body" text,
  "text_body" text,
  "raw_headers" jsonb DEFAULT '{}'::jsonb,
  "attachments" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "is_read" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "sandbox_emails_team_idx" ON "sandbox_emails" ("team_id");
CREATE INDEX IF NOT EXISTS "sandbox_emails_expires_at_idx" ON "sandbox_emails" ("expires_at");
CREATE INDEX IF NOT EXISTS "sandbox_emails_created_at_idx" ON "sandbox_emails" ("created_at");
