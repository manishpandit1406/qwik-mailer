import { db, emails } from "@qwikmailer/db";
import { eq } from "drizzle-orm";

async function run() {
  const result = await db.select({
    id: emails.id,
    status: emails.status,
    scheduledAt: emails.scheduledAt,
    createdAt: emails.createdAt
  }).from(emails).where(eq(emails.batchId, '9de25661-5165-4925-b4eb-3988dbb0bb3c'));
  console.log("Emails for batch 9de25661-5165-4925-b4eb-3988dbb0bb3c:", result);
  process.exit(0);
}
run();
