import { db, domainSenders } from "@qwikmailer/db";
async function run() {
  const senders = await db.select().from(domainSenders).limit(5);
  console.log(senders);
  process.exit(0);
}
run();
