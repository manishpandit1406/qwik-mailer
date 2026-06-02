import { db } from "./src";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

async function main() {
    console.log("Adding columns to domain_senders...");
    try {
        await db.execute(sql`ALTER TABLE domain_senders ADD COLUMN username_last_edited_at timestamp without time zone;`);
        console.log("username_last_edited_at added.");
    } catch (e) {
        console.error("Error adding username_last_edited_at:", e.message);
    }
    try {
        await db.execute(sql`ALTER TABLE domain_senders ADD COLUMN username_edit_count integer DEFAULT 0 NOT NULL;`);
        console.log("username_edit_count added.");
    } catch (e) {
        console.error("Error adding username_edit_count:", e.message);
    }
    console.log("Done.");
    process.exit(0);
}
main();
