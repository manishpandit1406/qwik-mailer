ALTER TABLE "users" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "use_case" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;