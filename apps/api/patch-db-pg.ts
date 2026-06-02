import { db } from "@qwikmailer/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE domains ADD COLUMN ses_dkim_tokens text[]`);
    console.log("Added ses_dkim_tokens column.");
  } catch (e) {
    console.log("Column already exists or error:", e);
  }
  process.exit(0);
}
main();
