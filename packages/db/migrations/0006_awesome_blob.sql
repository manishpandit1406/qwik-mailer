ALTER TABLE "suppression_list" DROP CONSTRAINT "suppression_list_email_unique";--> statement-breakpoint
DROP INDEX "suppression_email_idx";--> statement-breakpoint
ALTER TABLE "suppression_list" ALTER COLUMN "reason" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "suppression_list" ALTER COLUMN "reason" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "from_name" varchar(255);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "reply_to" varchar(255);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "company_address_2" text;--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "zip_code" varchar(20);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "domain_senders" ADD COLUMN "nickname" varchar(255);--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "is_tracking_domain" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "tracking_cname" varchar(255);--> statement-breakpoint
ALTER TABLE "suppression_list" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD COLUMN "type" varchar(50) DEFAULT 'unsubscribe' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_user_email_idx" ON "suppression_list" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "suppression_user_type_idx" ON "suppression_list" USING btree ("user_id","type");