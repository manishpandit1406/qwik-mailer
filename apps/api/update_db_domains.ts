import { db } from "@qwikmailer/db";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.execute(sql`
    UPDATE domains 
    SET 
      spf_record = REPLACE(spf_record, 'qwikmailer.dev', 'qwikmailer.in'),
      dmarc_record = REPLACE(dmarc_record, 'qwikmailer.dev', 'qwikmailer.in')
  `);
  console.log('Update complete.');
  process.exit(0);
}

run().catch(console.error);
