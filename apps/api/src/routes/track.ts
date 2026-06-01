import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, emails, suppressionList } from "@qwikmailer/db";
import { createRedisConnection, createAnalyticsQueue } from "@qwikmailer/queue";

const redis = createRedisConnection();
const analyticsQueue = createAnalyticsQueue(redis);

// 1x1 Transparent GIF Base64
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function trackRoutes(app: FastifyInstance) {
  // GET /v1/track/open/:emailId
  app.get("/open/:emailId", async (req, reply) => {
    const { emailId } = z.object({ emailId: z.string().uuid() }).parse(req.params);

    try {
      const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
      if (email) {
        // Enqueue open event
        await analyticsQueue.add("ingest", {
          emailId,
          userId: email.userId,
          type: "opened",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: {},
        });
      }
    } catch (err) {
      req.log.error(err, "Failed to enqueue open track job");
    }

    return reply
      .header("Content-Type", "image/gif")
      .header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
      .send(TRANSPARENT_GIF);
  });

  // GET /v1/track/click/:emailId
  app.get("/click/:emailId", async (req, reply) => {
    const { emailId } = z.object({ emailId: z.string().uuid() }).parse(req.params);
    const { url } = z.object({ url: z.string().url() }).parse(req.query);

    try {
      const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
      if (email) {
        // Enqueue click event
        await analyticsQueue.add("ingest", {
          emailId,
          userId: email.userId,
          type: "clicked",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          url,
          metadata: {},
        });
      }
    } catch (err) {
      req.log.error(err, "Failed to enqueue click track job");
    }

    // Redirect to the destination URL — only allow http/https to prevent javascript: attacks
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return reply.code(400).send({ success: false, error: 'Invalid redirect URL' });
    }
    return reply.redirect(url, 302);
  });

  // POST /v1/track/unsubscribe
  app.post("/unsubscribe", async (req, reply) => {
    const { emailId } = z.object({ emailId: z.string().uuid() }).parse(req.body);

    const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
    if (!email) return reply.code(404).send({ success: false, error: "Email not found" });

    // Add to suppression list
    await db.insert(suppressionList).values({
      userId: email.userId,
      email: email.toEmail,
      reason: "manual",
      addedAt: new Date(),
    }).onConflictDoNothing();

    // Enqueue unsubscribe event
    await analyticsQueue.add("ingest", {
      emailId,
      userId: email.userId,
      type: "unsubscribed",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {},
    });

    return reply.send({ success: true, data: { message: "Successfully unsubscribed" } });
  });
}
