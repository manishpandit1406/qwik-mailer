import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const sql = postgres(process.env.DATABASE_URL);
const migrationPath = path.join(process.cwd(), "migrations", "0009_normal_darkstar.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");

async function main() {
  const statements = migrationSql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log("Successfully ran:", statement.substring(0, 50) + "...");
    } catch (e) {
      console.error("Error running statement:", statement.substring(0, 50) + "...", e.message);
    }
  }
  console.log("Done.");
  process.exit(0);
}

main();
