import { checkDnsRecord } from "./src/services/dns.service.js";

async function main() {
  const cnameHostname = "track.libraryy.in";
  const cnameExpected = "track.qwikmailer.in";
  console.log("Checking CNAME at:", cnameHostname);
  const cnameResult = await checkDnsRecord(cnameHostname, "CNAME", cnameExpected);
  console.log("CNAME verify result:", cnameResult);
}

main();
