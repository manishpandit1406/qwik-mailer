import { sql } from "drizzle-orm";
import { db, connection } from "./src/index";

async function main() {
  console.log("Applying users table alterations...");
  try {
    // Set all users to false so they must complete onboarding
    await db.execute(sql`UPDATE "users" SET "onboarding_completed" = false;`);
    
    console.log("Successfully altered table users.");
  } catch (err: any) {
    console.log("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

main();
