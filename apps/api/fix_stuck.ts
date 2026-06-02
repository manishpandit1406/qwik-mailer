import { db, emails } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
import { createRedisConnection, createEmailQueue } from "@qwikmailer/queue";

async function run() {
  const conn = createRedisConnection();
  const queue = createEmailQueue(conn);

  const emailId = 'a7675131-54d2-4fbd-a631-1b836ecf2a54';
  const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
  
  if (email && email.status === 'sending') {
    await db.update(emails).set({ status: 'queued' }).where(eq(emails.id, emailId));
    await queue.add("send", { emailId: email.id, userId: email.userId });
    console.log("Re-queued stuck email.");
  }
  process.exit(0);
}
run();
