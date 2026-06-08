import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import { eq, and, or, inArray } from "drizzle-orm";
import { db, apiKeys, users, domainSenders, emails, suppressionList, teams } from "@qwikmailer/db";
import { createRedisConnection, createEmailQueue, createAnalyticsQueue } from "@qwikmailer/queue";
import { getOwnerTeamIds, getTeamOwnerId } from "../utils/team-owner.js";
import { isRelatedToCompany } from "../utils/validation.js";
import { checkAndConsumeQuota } from "../utils/quota.js";

const redis = createRedisConnection();
const emailQueue = createEmailQueue(redis);
const analyticsQueue = createAnalyticsQueue(redis);

async function resolveSenderDomain(teamId: string, requestedFrom?: string, requestedFromName?: string) {
  let fromEmail = "";
  let fromName = requestedFromName;
  let replyTo: string | undefined = undefined;

  const ownerId = await getTeamOwnerId(teamId);
  const ownerTeamIds = await getOwnerTeamIds(teamId);

  const userRec = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
  if (requestedFromName && !isRelatedToCompany(userRec?.companyName, requestedFromName)) {
    throw new Error("From name must be related to your company name.");
  }

  let sender: any = null;

  if (requestedFrom) {
    sender = await db.query.domainSenders.findFirst({
      where: and(
        or(
          inArray((domainSenders as any).teamId, ownerTeamIds),
          eq((domainSenders as any).userId, ownerId)
        ),
        eq(domainSenders.email, requestedFrom)
      ),
    });
    if (!sender) {
      throw new Error("Sender identity not found. Please create it first in the dashboard.");
    }
  } else {
    sender = await db.query.domainSenders.findFirst({
      where: or(
        inArray((domainSenders as any).teamId, ownerTeamIds),
        eq((domainSenders as any).userId, ownerId)
      ),
      orderBy: (senders, { desc }) => [desc(senders.createdAt)],
    });
    if (!sender) {
      throw new Error("You must create a sender identity before sending emails.");
    }
  }

  fromEmail = sender.email;
  if (!requestedFromName && sender.fromName) {
    fromName = sender.fromName;
  }
  if (!fromName) {
    fromName = process.env.SMTP_FROM_NAME || "Qwik Mailer";
  }
  if (sender.replyTo) {
    replyTo = sender.replyTo;
  }
  return { fromEmail, fromName, replyTo };
}

export function startSmtpServer() {
  const port = process.env.CUSTOM_SMTP_PORT ? parseInt(process.env.CUSTOM_SMTP_PORT) : 2525;
  const server = new SMTPServer({
    secure: false, 
    allowInsecureAuth: true,
    authOptional: false,
    
    onAuth: async (auth, session, callback) => {
      const username = auth.username; // Expected to be the Project Slug
      const rawKey = auth.password;

      if (!username || username.length < 5) {
        return callback(new Error("Invalid username. Please use your Project Slug as the username."));
      }

      if (!rawKey || !rawKey.startsWith("mf_live_")) {
        return callback(new Error("Invalid API key format for password."));
      }

      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      
      try {
        const team = await db.query.teams.findFirst({
          where: eq(teams.slug, username)
        });

        if (!team) {
          return callback(new Error("Invalid username. Please use a valid Project Slug."));
        }

        const key = await db.query.apiKeys.findFirst({
          where: and(
            eq(apiKeys.keyHash, keyHash), 
            eq(apiKeys.isActive, true),
            eq(apiKeys.teamId, team.id)
          ),
        });

        if (!key) {
          return callback(new Error("Invalid API Key"));
        }

        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));

        return callback(null, { user: { teamId: key.teamId } });
      } catch (err) {
        return callback(new Error("Internal Error"));
      }
    },

    onData: (stream, session, callback) => {
      simpleParser(stream)
        .then(async (parsed) => {
          const teamId = (session as any).user.teamId;

          const requestedFrom = parsed.from?.value[0]?.address;
          const requestedFromName = parsed.from?.value[0]?.name;
          
          let resolvedSender;
          try {
            resolvedSender = await resolveSenderDomain(teamId, requestedFrom, requestedFromName);
          } catch (e: any) {
            return callback(new Error(e.message));
          }

          const { fromEmail, fromName, replyTo } = resolvedSender;
          const toField = parsed.to;
          let toList: { name?: string, address?: string }[] = [];
          if (toField) {
            if (Array.isArray(toField)) {
              toField.forEach(t => toList.push(...(t.value || [])));
            } else {
              toList = toField.value || [];
            }
          }

          for (const recipient of toList) {
             if (!recipient.address) continue;
             
             try {
                await checkAndConsumeQuota(teamId, 1);
             } catch (e: any) {
                return callback(new Error("Quota Exceeded"));
             }

             const suppressed = await db.query.suppressionList.findFirst({
               where: eq(suppressionList.email, recipient.address),
             });
             if (suppressed) continue;

             const batchId = crypto.randomUUID();
             const metadata = { _source: "smtp" };

             const [email] = await db
              .insert(emails)
              .values({
                teamId,
                batchId,
                fromEmail,
                fromName,
                toEmail: recipient.address,
                toName: recipient.name,
                replyTo: replyTo,
                subject: parsed.subject || "No Subject",
                htmlBody: parsed.html || parsed.textAsHtml || "",
                textBody: parsed.text || "",
                tags: ["smtp"],
                metadata,
                status: "queued",
              })
              .returning();

             await emailQueue.add(
              "send",
              { emailId: email.id, teamId },
              { delay: 0 }
             );

             await analyticsQueue.add("ingest", {
              emailId: email.id,
              teamId,
              type: "queued" as any,
             });
          }

          callback();
        })
        .catch((err) => {
          console.error("[SMTP Server Error]", err);
          callback(err);
        });
    }
  });

  server.on("error", (err) => {
    console.error("[SMTP Server] Error:", err);
  });

  server.listen(port, () => {
    console.log(`[SMTP] Server listening on port ${port}`);
  });
}
