const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=([^\n]+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const postgres = require('postgres');
const sql = postgres(dbUrl);

async function main() {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_sender') THEN
        CREATE TYPE support_ticket_sender AS ENUM ('user', 'admin');
      END IF;
    END $$;
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_type support_ticket_sender NOT NULL,
      message text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `;
  console.log("Success");
  process.exit(0);
}
main().catch(console.error);
