import { db, senderIdentities, domainSenders } from "./packages/db/src/index.ts";

async function main() {
  const senders = await db.query.senderIdentities.findMany();
  console.log("SENDER IDENTITIES:", senders.map(s => ({ u: s.username, deleted: s.deletedAt })));
  const custom = await db.query.domainSenders.findMany();
  console.log("DOMAIN SENDERS:", custom.map(c => c.email));
  process.exit(0);
}
main();
