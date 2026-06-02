import { db, domains, domainSenders } from "@qwikmailer/db";
import { eq, and } from "drizzle-orm";

async function resolveSenderDomain(userId: string, requestedFrom?: string, requestedFromName?: string) {
  const defaultFrom = "noreply@qwikmailer.in";
  let fromEmail = defaultFrom;
  let fromName = requestedFromName ?? "Qwik Mailer";
  let replyTo: string | undefined = undefined;

  if (requestedFrom && requestedFrom !== defaultFrom) {
    const domainPart = requestedFrom.split("@")[1];
    if (domainPart) {
      const verifiedDomain = await db.query.domains.findFirst({
        where: and(eq(domains.userId, userId), eq(domains.domain, domainPart), eq(domains.status, "verified")),
      });
      
      if (verifiedDomain) {
        const sender = await db.query.domainSenders.findFirst({
          where: eq(domainSenders.email, requestedFrom),
        });

        if (sender) {
          fromEmail = requestedFrom;
          
          if (!requestedFromName && sender.fromName) {
            fromName = sender.fromName;
          }
          if (sender.replyTo) {
            replyTo = sender.replyTo;
          }
        } else {
          replyTo = requestedFrom;
        }
      } else {
        replyTo = requestedFrom;
      }
    }
  }
  return { fromEmail, fromName, replyTo };
}

async function run() {
  const userId = '7234b9de-4925-4af5-84b5-edd8661100bd'; // From previous query
  const res1 = await resolveSenderDomain(userId, 'libraryy-support@mail.qwikmailer.in', undefined);
  console.log("Without fromName:", res1);
  const res2 = await resolveSenderDomain(userId, 'libraryy-support@mail.qwikmailer.in', '');
  console.log("With empty fromName:", res2);
  process.exit(0);
}
run();
