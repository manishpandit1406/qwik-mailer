import { db, users, apiKeys, contactLists, domains, domainSenders } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function setup() {
  const allUsers = await db.query.users.findMany({ limit: 1 });
  if (allUsers.length === 0) {
    console.log("No user found");
    return;
  }
  const user = allUsers[0];

  await db.update(users).set({ planLimit: 10000000 }).where(eq(users.id, user.id));

  const keyHash = crypto.createHash("sha256").update("test-key-12345").digest("hex");
  await db.insert(apiKeys).values({
    userId: user.id,
    name: "Test Key 100k",
    keyPrefix: "qk_test",
    keyHash,
  }).onConflictDoNothing();

  const userDomains = await db.query.domains.findMany({ where: eq(domains.userId, user.id) });
  let domainId = userDomains[0]?.id;
  if (!domainId) {
    const [newDom] = await db.insert(domains).values({ userId: user.id, domain: "example.com", status: "verified" }).returning();
    domainId = newDom.id;
  }

  const senders = await db.query.domainSenders.findMany({ where: eq(domainSenders.userId, user.id) });
  if (senders.length === 0) {
    await db.insert(domainSenders).values({
      userId: user.id,
      domainId,
      email: "test@example.com",
      fromName: "Test Sender"
    });
  }

  // Generate 50k emails JSON for API testing
  const fs = require('fs');
  const path = require('path');
  
  console.log("Generating 50k.json...");
  const emailsList = [];
  for(let i=0; i<50000; i++) {
    emailsList.push({
      to: `user${i}@test.com`,
      subject: `Test 50k API ${i}`,
      html: `<h1>Hello ${i}</h1>`
    });
  }
  fs.writeFileSync(path.join(__dirname, '50k.json'), JSON.stringify({ emails: emailsList }));

  console.log("Generating 50k.csv...");
  let csv = "email,name\n";
  for(let i=0; i<50000; i++) {
    csv += `user${i}@test.com,User ${i}\n`;
  }
  fs.writeFileSync(path.join(__dirname, '50k.csv'), csv);

  console.log("Setup complete! API Key to use: qk_test.test-key-12345");
  process.exit(0);
}

setup().catch(console.error);
