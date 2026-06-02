import { db } from "./packages/db/src";
import { users, senderIdentities, domains, dnsRecords } from "./packages/db/src/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Looking for user work.manishpandit1406@gmail.com...");
    const userList = await db.select().from(users).where(eq(users.email, "work.manishpandit1406@gmail.com"));
    
    if (userList.length === 0) {
        console.log("User not found!");
        process.exit(1);
    }
    
    const user = userList[0];
    console.log(`Found user: ${user.id}`);
    
    // Delete sender identities
    console.log("Deleting sender identities...");
    await db.delete(senderIdentities).where(eq(senderIdentities.userId, user.id));
    
    // Find domains
    const userDomains = await db.select().from(domains).where(eq(domains.userId, user.id));
    for (const d of userDomains) {
        console.log(`Deleting DNS records for domain: ${d.id}...`);
        await db.delete(dnsRecords).where(eq(dnsRecords.domainId, d.id));
    }
    
    console.log("Deleting domains...");
    await db.delete(domains).where(eq(domains.userId, user.id));
    
    console.log("Resetting onboarding flag...");
    await db.update(users).set({ onboardingCompleted: false }).where(eq(users.id, user.id));
    
    console.log("Done! Data reset successfully.");
    process.exit(0);
}

main().catch(console.error);
