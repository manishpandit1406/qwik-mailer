import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { db, webhooks, webhookLogs } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { nanoid } from "nanoid";

export async function webhookRoutes(app: FastifyInstance) {
  const webhookEvents = ["delivered", "bounced", "opened", "clicked", "unsubscribed", "complained"];

  // GET /v1/webhooks
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const userWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.userId, user.sub),
    });
    return reply.send({ success: true, data: userWebhooks });
  });

  // POST /v1/webhooks
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const body = z
      .object({
        url: z.string().url(),
        events: z.array(z.enum(["delivered", "bounced", "opened", "clicked", "unsubscribed", "complained", "queued", "sent", "failed"])),
      })
      .parse(req.body);

    const secret = `whsec_${nanoid(32)}`;

    const [webhook] = await db
      .insert(webhooks)
      .values({
        userId: user.sub,
        url: body.url,
        secret,
        events: body.events,
      })
      .returning();

    return reply.code(201).send({
      success: true,
      data: {
        ...webhook,
        message: "Save the webhook secret — it will not be shown again.",
      },
    });
  });

  // PUT /v1/webhooks/:id
  app.put("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const body = z
      .object({
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.userId, user.sub)),
    });
    if (!webhook) return reply.code(404).send({ success: false, error: "Webhook not found" });

    const [updated] = await db
      .update(webhooks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // DELETE /v1/webhooks/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.userId, user.sub)),
    });
    if (!webhook) return reply.code(404).send({ success: false, error: "Webhook not found" });

    await db.delete(webhooks).where(eq(webhooks.id, id));
    return reply.send({ success: true, data: { message: "Webhook deleted." } });
  });

  // GET /v1/webhooks/:id/logs
  app.get("/:id/logs", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.userId, user.sub)),
    });
    if (!webhook) return reply.code(404).send({ success: false, error: "Webhook not found" });

    const logs = await db.query.webhookLogs.findMany({
      where: eq(webhookLogs.webhookId, id),
      orderBy: desc(webhookLogs.createdAt),
      limit: 20,
    });

    return reply.send({ success: true, data: logs });
  });
}
