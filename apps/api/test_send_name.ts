import { createRedisConnection, createEmailQueue } from "@qwikmailer/queue";
import { db, emails } from "@qwikmailer/db";
import crypto from "crypto";

async function run() {
  const conn = createRedisConnection();
  const queue = createEmailQueue(conn);
  
  const user = await db.query.users.findFirst();
  if (!user) return;

  const [email] = await db
    .insert(emails)
    .values({
      userId: user.id,
      batchId: crypto.randomUUID(),
      fromEmail: "libraryy-support@mail.qwikmailer.in",
      fromName: "Special Libraryy Team",
      toEmail: "testrecipient@example.com",
      subject: "Test worker speed with Name",
      htmlBody: "<p>test</p>",
      textBody: "test",
      status: "queued",
    })
    .returning();

  console.log("Inserted email:", email.id);
  const t0 = Date.now();
  await queue.add("send", { emailId: email.id, userId: user.id });
  console.log("Added to queue in", Date.now() - t0, "ms");
  
  process.exit(0);
}
run();
