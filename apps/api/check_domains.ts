import { db, domains, domainSenders } from "@qwikmailer/db";
import { eq } from "drizzle-orm";

async function run() {
  const userId = '7234b9de-4925-4af5-84b5-edd8661100bd';
  
  const userDomains = await db.select().from(domains).where(eq(domains.userId, userId));
  console.log("User domains:", userDomains);
  
  const userSenders = await db.select().from(domainSenders).where(eq(domainSenders.userId, userId));
  console.log("User senders:", userSenders);

  process.exit(0);
}
run();
