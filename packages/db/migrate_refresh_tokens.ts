import { db } from "./src/index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(64);`);
    await db.execute(sql`ALTER TABLE refresh_tokens ADD COLUMN user_agent VARCHAR(255);`);
    console.log("Migration successful");
  } catch (err) {
    console.log("Migration failed/already exists:", err.message);
  }
  process.exit(0);
}

main();
