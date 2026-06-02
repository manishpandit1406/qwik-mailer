import { db } from "./src/index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE user_passkeys ADD COLUMN device_name VARCHAR(255);`);
    await db.execute(sql`ALTER TABLE user_passkeys ADD COLUMN device_os VARCHAR(64);`);
    await db.execute(sql`ALTER TABLE user_passkeys ADD COLUMN browser VARCHAR(64);`);
    await db.execute(sql`ALTER TABLE user_passkeys ADD COLUMN ip_address VARCHAR(64);`);
    console.log("Migration successful");
  } catch (err) {
    console.log("Migration failed/already exists:", err.message);
  }
  process.exit(0);
}

main();
