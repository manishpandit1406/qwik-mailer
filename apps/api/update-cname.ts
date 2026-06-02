import { db, domains } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
async function main() {
  await db.update(domains).set({ isTrackingDomain: true, trackingCname: "track.libraryy.in" }).where(eq(domains.domain, "libraryy.in"));
  console.log("Updated libraryy.in CNAME to enabled.");
  process.exit(0);
}
main();
