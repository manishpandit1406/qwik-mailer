import { db, emails } from "@qwikmailer/db";
import { desc } from "drizzle-orm";
async function run() {
  const result = await db.select({
    id: emails.id,
    fromEmail: emails.fromEmail,
    fromName: emails.fromName,
    subject: emails.subject,
    status: emails.status,
    createdAt: emails.createdAt
  }).from(emails).orderBy(desc(emails.createdAt)).limit(5);
  console.log(result);
  process.exit(0);
}
run();
