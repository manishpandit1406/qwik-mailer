import { db, emails } from "@qwikmailer/db";
import { desc, eq } from "drizzle-orm";
async function run() {
  const result = await db.select({
    id: emails.id,
    fromEmail: emails.fromEmail,
    fromName: emails.fromName,
    status: emails.status
  }).from(emails).where(eq(emails.fromEmail, 'libraryy-support@mail.qwikmailer.in')).orderBy(desc(emails.createdAt)).limit(5);
  console.log(result);
  process.exit(0);
}
run();
