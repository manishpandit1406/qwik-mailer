import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    const users = await sql`SELECT id, email, plan, role FROM users`;
    console.log("All users:", JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    process.exit(0);
  }
}

main();
