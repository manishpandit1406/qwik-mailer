import postgres from 'postgres';

const sql = postgres('postgresql://postgres:admin123@localhost:5432/qwikmailer');

async function migrate() {
  try {
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "user_passkeys" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "user_id" uuid NOT NULL, "credential_id" text NOT NULL, "public_key" text NOT NULL, "counter" integer DEFAULT 0 NOT NULL, "transports" jsonb, "device_type" varchar(64), "backed_up" boolean DEFAULT false NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "last_used_at" timestamp DEFAULT now() NOT NULL);`);
    await sql.unsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "webauthn_current_challenge" text;`);
    await sql.unsafe(`DO $$ BEGIN ALTER TABLE "user_passkeys" ADD CONSTRAINT "user_passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "passkeys_user_id_idx" ON "user_passkeys" USING btree ("user_id");`);
    await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credential_id_idx" ON "user_passkeys" USING btree ("credential_id");`);
    console.log("Migration successful");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrate();
