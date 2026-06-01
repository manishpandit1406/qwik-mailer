CREATE TABLE "inbound_parse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"subdomain" varchar(255) NOT NULL,
	"destination_url" text NOT NULL,
	"spam_check" boolean DEFAULT false NOT NULL,
	"send_raw" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_parse" ADD CONSTRAINT "inbound_parse_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_parse" ADD CONSTRAINT "inbound_parse_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_parse_user_idx" ON "inbound_parse" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_parse_domain_idx" ON "inbound_parse" USING btree ("domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_parse_subdomain_idx" ON "inbound_parse" USING btree ("subdomain");