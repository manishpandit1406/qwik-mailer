import { db, domains } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
async function main() {
  const ds = await db.query.domains.findMany();
  console.log(ds);
  process.exit(0);
}
main();
