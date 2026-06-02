import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const postgres = require("postgres");

const sql = postgres("postgresql://postgres@localhost:5432/qwikmailer");

async function run() {
  try {
    console.log("Dropping category and subdomain columns...");
    await sql`ALTER TABLE sender_identities DROP COLUMN IF EXISTS category CASCADE;`;
    await sql`ALTER TABLE sender_identities DROP COLUMN IF EXISTS subdomain CASCADE;`;
    
    console.log("Adding replyTo verified columns...");
    await sql`ALTER TABLE sender_identities ADD COLUMN IF NOT EXISTS reply_to_verified BOOLEAN DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE sender_identities ADD COLUMN IF NOT EXISTS reply_to_verification_otp VARCHAR(6);`;
    await sql`ALTER TABLE sender_identities ADD COLUMN IF NOT EXISTS reply_to_verification_expires TIMESTAMP;`;
    
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
