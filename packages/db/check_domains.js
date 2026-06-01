import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    const domains = await sql`SELECT id, domain, dkim_public_key FROM domains WHERE domain = 'libraryy.in'`;
    console.log("Domains:", JSON.stringify(domains, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    process.exit(0);
  }
}

main();
