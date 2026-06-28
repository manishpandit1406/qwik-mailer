import "dotenv/config";
import { db } from "./packages/db/src/index";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_sender') THEN
        CREATE TYPE support_ticket_sender AS ENUM ('user', 'admin');
      END IF;
    END $$;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_type support_ticket_sender NOT NULL,
      message text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("Success");
  process.exit(0);
}
main().catch(console.error);
