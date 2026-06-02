import { db } from "@qwikmailer/db";
import { sql } from "drizzle-orm";
async function main() {
  await db.execute(sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS mail_from_verified BOOLEAN DEFAULT false NOT NULL;`);
  console.log("Column added");
  process.exit(0);
}
main();
