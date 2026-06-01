import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { checkDnsRecord } from "./src/services/dns.service.js";
import { db } from "@qwikmailer/db";

async function main() {
  const domainName = "libraryy.in";
  
  const domain = await db.query.domains.findFirst({
    where: (d, { eq }) => eq(d.domain, domainName)
  });

  if (!domain) {
    console.log("Domain not found in DB");
    process.exit(1);
  }

  console.log("Domain ID:", domain.id);
  console.log("Expected DKIM Public Key:", domain.dkimPublicKey);
  
  const dkimHostname = `${domain.dkimSelector}._domainkey.${domain.domain}`;
  const dkimExpected = `p=${domain.dkimPublicKey}`;
  console.log("Checking DKIM at:", dkimHostname);
  const dkimResult = await checkDnsRecord(dkimHostname, "TXT", dkimExpected);
  console.log("DKIM verify result:", dkimResult);

  const cnameHostname = `track.${domain.domain}`;
  const cnameExpected = `track.qwikmailer.in`;
  console.log("Checking CNAME at:", cnameHostname);
  const cnameResult = await checkDnsRecord(cnameHostname, "CNAME", cnameExpected);
  console.log("CNAME verify result:", cnameResult);
  
  process.exit(0);
}

main();
