import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const postgres = require("postgres");

// Connect with superuser / local user
const sql = postgres("postgresql://postgres@localhost:5432/qwikmailer");

async function run() {
  try {
    await sql`ALTER TYPE sender_identity_category ADD VALUE IF NOT EXISTS 'newsletter';`;
    await sql`ALTER TYPE sender_identity_category ADD VALUE IF NOT EXISTS 'support';`;
    console.log("Migration successful: added newsletter and support to enum");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
