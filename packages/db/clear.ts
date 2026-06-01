import { db } from './src/index.ts';
import { suppressionList, reputationLogs } from './src/schema.ts';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Clearing suppression list...');
  await db.delete(suppressionList);
  console.log('Resetting reputation scores...');
  await db.execute(sql`UPDATE users SET reputation_score = 100`);
  console.log('Done!');
  process.exit(0);
}
run();
