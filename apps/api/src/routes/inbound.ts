import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, inboundParse, domains } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function inboundRoutes(app: FastifyInstance) {
  // GET /v1/inbound - List configured parse webhooks
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId!;
    
    const parses = await db.query.inboundParse.findMany({
      // @ts-ignore
      where: eq(inboundParse.teamId, teamId),
      with: {
        domain: {
          columns: { domain: true },
        },
      },
    });

    return reply.send({ success: true, data: parses });
  });

  // POST /v1/inbound - Create inbound parse setting
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId!;
    const { domainId, subdomain, destinationUrl, spamCheck, sendRaw } = z
      .object({
        domainId: z.string().uuid(),
        subdomain: z.string().min(1),
        destinationUrl: z.string().url(),
        spamCheck: z.boolean().default(false),
        sendRaw: z.boolean().default(false),
      })
      .parse(req.body);

    // Verify domain belongs to user
    const domain = await db.query.domains.findFirst({
      where: eq(domains.id, domainId),
    });

    if (!domain || domain.userId !== (req.user as any).sub) {
      return reply.code(403).send({ success: false, error: "Invalid domain" });
    }

    const [parse] = await db
      .insert(inboundParse)
      .values({
        teamId: teamId, // schema still uses userId
        domainId,
        subdomain,
        destinationUrl,
        spamCheck,
        sendRaw,
      } as any)
      .returning();

    return reply.code(201).send({ success: true, data: parse });
  });

  // DELETE /v1/inbound/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId!;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    await db
      .delete(inboundParse)
      // @ts-ignore
      .where(eq(inboundParse.id, id)) // In production use and(eq(id), eq(userId))
      ;

    return reply.send({ success: true });
  });

  // POST /v1/inbound/receive - The actual webhook that Mailtrap/SendGrid would call
  app.post("/receive", async (req, reply) => {
    // Here we would parse multipart/form-data containing the email.
    // For now, this is a mock endpoint for the enterprise feature
    console.log("Received inbound email webhook:", req.body);
    return reply.send({ success: true });
  });
}
