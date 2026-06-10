import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { ADD_ON_PRICES } from "../config/plans.js";

export async function billingRoutes(app: FastifyInstance) {
  // POST /v1/billing/add-on
  // Note: For now, this is a direct endpoint. In production, it should be protected by admin roles 
  // or triggered via Stripe/Razorpay Webhooks.
  app.post("/add-on", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string; id?: string };
    const userId = user.sub || user.id;

    if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const body = z.object({
      emailsToAdd: z.number().int().positive().multipleOf(1000),
    }).parse(req.body);

    const userRec = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!userRec) return reply.code(404).send({ success: false, error: "User not found" });

    if (userRec.plan === "free") {
      return reply.code(400).send({ success: false, error: "Add-ons are not available for the Free plan." });
    }

    // Example calculation (not charging here, just acknowledging the logic)
    // const priceConfig = ADD_ON_PRICES[userRec.plan as keyof typeof ADD_ON_PRICES];
    // const price = (body.emailsToAdd / 1000) * priceConfig.pricePer1k;

    await db.execute(`UPDATE users SET extra_email_quota = extra_email_quota + ${body.emailsToAdd} WHERE id = '${userId}'`);

    return reply.send({
      success: true,
      data: {
        added: body.emailsToAdd,
        message: `Successfully added ${body.emailsToAdd} emails to your quota.`
      }
    });
  });
}
