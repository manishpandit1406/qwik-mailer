import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const postgres = require("postgres");

// Connect with superuser / local user
const sql = postgres("postgresql://postgres@localhost:5432/qwikmailer");

async function run() {
  try {
    await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS category VARCHAR(100);`;
    console.log("Migration successful: added category to emails");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
