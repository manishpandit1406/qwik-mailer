import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    const result = await sql`UPDATE users SET email_verified = true WHERE email = 'manishp2119@gmail.com' RETURNING id, email, email_verified`;
    console.log("Updated user:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    process.exit(0);
  }
}

main();
