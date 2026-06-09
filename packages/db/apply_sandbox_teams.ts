import postgres from 'postgres';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  // use postgres superuser for ALTER TABLE
  const superUrl = 'postgresql://postgres:admin123@localhost:5432/qwikmailer';
  const sql = postgres(superUrl);
  await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS sandbox_mode boolean NOT NULL DEFAULT false`;
  console.log('✅ sandbox_mode column added to teams!');
  await sql.end();
}

run().catch(e => { console.error(e); process.exit(1); });
