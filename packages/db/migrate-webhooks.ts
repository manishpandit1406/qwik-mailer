import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        payload JSONB NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS webhook_logs_webhook_idx ON webhook_logs(webhook_id);
    `;
    console.log("Created webhook_logs table successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
