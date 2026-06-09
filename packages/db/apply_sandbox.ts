import postgres from 'postgres';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const migration = fs.readFileSync(path.join(__dirname, 'migrations/0013_sandbox_mode.sql'), 'utf8');
  await sql.unsafe(migration);
  console.log('✅ Migration applied!');
  await sql.end();
}

run().catch(e => { console.error(e); process.exit(1); });
