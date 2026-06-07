import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, emails, suppressionList, reputationLogs } from "@qwikmailer/db";
import { createRedisConnection, createAnalyticsQueue } from "@qwikmailer/queue";

const redis = createRedisConnection();
const analyticsQueue = createAnalyticsQueue(redis);

// AWS SNS message shape
const snsMessageSchema = z.object({
  Type: z.string(),
  MessageId: z.string(),
  TopicArn: z.string(),
  Message: z.string(),
  SubscribeURL: z.string().optional(),
  Timestamp: z.string(),
  SignatureVersion: z.string().optional(),
  Signature: z.string().optional(),
  SigningCertURL: z.string().optional(),
}).passthrough();

export async function sesWebhookRoutes(app: FastifyInstance) {
  
  // AWS SNS sends Content-Type: text/plain for JSON payloads.
  // Fastify needs to parse it properly.
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, function (req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // POST /v1/webhooks/ses
  app.post("/ses", async (req, reply) => {
    try {
      const payload = snsMessageSchema.parse(req.body);

      // 1. Handle Subscription Confirmation
      if (payload.Type === "SubscriptionConfirmation" && payload.SubscribeURL) {
        console.log(`[SES Webhook] Confirming subscription: ${payload.SubscribeURL}`);
        try {
          await fetch(payload.SubscribeURL);
          return reply.send({ success: true, message: "Subscription confirmed" });
        } catch (err) {
          req.log.error(err, "Failed to confirm SNS subscription");
          return reply.code(500).send({ success: false, error: "Failed to confirm subscription" });
        }
      }

      // 2. Handle Notifications (Bounces, Complaints, Deliveries)
      if (payload.Type === "Notification") {
        let messageData;
        try {
          messageData = JSON.parse(payload.Message);
        } catch (e) {
          console.warn("[SES Webhook] Could not parse SNS Message as JSON");
          return reply.send({ success: true }); // Ignore non-JSON messages
        }

        const notificationType = messageData.notificationType; // Bounce, Complaint, Delivery
        const mail = messageData.mail;

        if (!mail || !mail.messageId) {
          return reply.send({ success: true });
        }

        // Find the email in our database using the messageId.
        // AWS messageId is usually the SES message ID. Our worker saves it as: info.messageId.
        // Let's strip brackets if nodemail added them, but SES usually doesn't.
        const originalMessageId = mail.messageId; 
        
        // Let's find the email by matching `messageId` field
        // Since nodemail might format it as <ID@domain>, we use a LIKE query or exact match.
        const emailRecord = await db.query.emails.findFirst({
          where: sql`${emails.messageId} LIKE ${'%' + originalMessageId + '%'}`
        });

        if (!emailRecord) {
          console.log(`[SES Webhook] Email record not found for messageId: ${originalMessageId}`);
          return reply.send({ success: true }); // Acknowledge anyway
        }

        const emailId = emailRecord.id;
        const teamId = emailRecord.teamId;

        if (notificationType === "Bounce") {
          const bounce = messageData.bounce;
          const bounceType = bounce?.bounceType; // Permanent, Transient
          const bouncedRecipients = bounce?.bouncedRecipients || [];

          for (const recipient of bouncedRecipients) {
            const recipientEmail = recipient.emailAddress;
            const diagnosticCode = recipient.diagnosticCode || "Unknown bounce reason";

            // Enqueue bounced event
            await analyticsQueue.add("ingest", {
              emailId,
              teamId: teamId!,
              type: "bounced",
              metadata: { error: diagnosticCode, bounceType },
            });

            // If it's a Permanent (Hard) Bounce, update suppression and reputation
            if (bounceType === "Permanent") {
              await db.insert(suppressionList).values({
                teamId: teamId!,
                email: recipientEmail,
                reason: "bounce",
                addedAt: new Date()
              } as any).onConflictDoNothing();

              // Deduct Reputation Points
              await db.execute(sql`UPDATE users SET reputation_score = reputation_score - 10 WHERE id = ${teamId}`);
              await db.insert(reputationLogs).values({
                teamId: teamId!,
                points: -10,
                reason: `Hard bounce from AWS SES: ${recipientEmail}`
              } as any);
            }
          }
        } 
        else if (notificationType === "Complaint") {
          const complaint = messageData.complaint;
          const complainedRecipients = complaint?.complainedRecipients || [];

          for (const recipient of complainedRecipients) {
            const recipientEmail = recipient.emailAddress;
            
            // Enqueue complained event
            await analyticsQueue.add("ingest", {
              emailId,
              teamId: teamId!,
              type: "complained",
              metadata: { complaintType: complaint?.complaintFeedbackType },
            });

            // Always add complaints to suppression list
            await db.insert(suppressionList).values({
              teamId: teamId!,
              email: recipientEmail,
              reason: "complaint",
              addedAt: new Date()
            } as any).onConflictDoNothing();

            // Heavy deduction for complaints
            await db.execute(sql`UPDATE users SET reputation_score = reputation_score - 20 WHERE id = ${teamId}`);
            await db.insert(reputationLogs).values({
              teamId: teamId!,
              points: -20,
              reason: `Spam complaint from AWS SES: ${recipientEmail}`
            } as any);
          }
        }
        else if (notificationType === "Delivery") {
          // Delivery is usually handled by our own tracking, but we can log it
          await analyticsQueue.add("ingest", {
            emailId,
            teamId: teamId!,
            type: "delivered",
          });
        }
        else if (notificationType === "Open") {
          const openInfo = messageData.open;
          await analyticsQueue.add("ingest", {
            emailId,
            teamId: teamId!,
            type: "opened",
            ip: openInfo?.ipAddress,
            userAgent: openInfo?.userAgent,
          });
        }
        else if (notificationType === "Click") {
          const clickInfo = messageData.click;
          await analyticsQueue.add("ingest", {
            emailId,
            teamId: teamId!,
            type: "clicked",
            url: clickInfo?.link,
            ip: clickInfo?.ipAddress,
            userAgent: clickInfo?.userAgent,
          });
        }

        return reply.send({ success: true });
      }

      // 3. Fallback for other types
      return reply.send({ success: true });

    } catch (err) {
      req.log.error(err, "SES Webhook Processing Error");
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
  });
}
