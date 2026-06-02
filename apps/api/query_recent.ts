import { db, emails } from "@qwikmailer/db";
import { desc } from "drizzle-orm";

async function run() {
  const result = await db.select({
    id: emails.id,
    status: emails.status,
    to: emails.toEmail,
    createdAt: emails.createdAt
  }).from(emails).orderBy(desc(emails.createdAt)).limit(10);
  console.log(result);
  process.exit(0);
}
run();
