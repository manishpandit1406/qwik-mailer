import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { sql } from "drizzle-orm";
import { db } from "@qwikmailer/db";

async function run() {
  await db.execute(sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS batch_id varchar(50);`);
  console.log("Column batch_id added successfully.");
  process.exit(0);
}
run();
