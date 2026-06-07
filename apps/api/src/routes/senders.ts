import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, domains, domainSenders, users } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { isRelatedToCompany } from "../utils/validation.js";

export async function senderRoutes(app: FastifyInstance) {
  // GET /v1/senders
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    
    if (!teamId) {
      return reply.send({ success: true, data: [] });
    }

    const senders = await db.query.domainSenders.findMany({
      where: eq((domainSenders as any).teamId, teamId),
      orderBy: (senders, { desc }) => [desc(senders.createdAt)],
      with: {
        domain: true
      } as any
    });
    
    return reply.send({ success: true, data: senders });
  });

  // POST /v1/senders
  app.post("/", { 
    preHandler: authenticate,
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } }
  }, async (req, reply) => {
    const user = req.user as { sub: string };
    const teamId = (req as any).teamId as string;
    
    if (!teamId) {
      return reply.code(400).send({ success: false, error: "Project context is required. Please select a project." });
    }

    const { 
      domainId,
      prefix,
      fromName,
      replyTo,
      companyAddress,
      companyAddress2,
      city,
      state,
      zipCode,
      country,
      nickname
    } = z.object({ 
      domainId: z.string().uuid(),
      prefix: z.string().min(1).max(100),
      fromName: z.string().max(255).optional(),
      replyTo: z.string().email().optional().or(z.literal("")),
      companyAddress: z.string().optional(),
      companyAddress2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
      nickname: z.string().max(255).optional(),
    }).parse(req.body);

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, domainId), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found or you don't own it" });

    if (domain.status !== "verified") {
      return reply.code(400).send({ success: false, error: "Domain must be verified first" });
    }

    const email = `${prefix.toLowerCase()}@${domain.domain.toLowerCase()}`;

    if (domain.domain === "mail.qwikmailer.in") {
      if (!replyTo) {
        return reply.code(400).send({ success: false, error: "Reply-To email is strictly required when using the shared domain." });
      }

      const userRec = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
      if (!isRelatedToCompany(userRec?.companyName, prefix)) {
        return reply.code(400).send({ success: false, error: "Sender username must be related to your company name." });
      }
      if (fromName && !isRelatedToCompany(userRec?.companyName, fromName)) {
        return reply.code(400).send({ success: false, error: "From name must be related to your company name." });
      }
      
      const existingSenders = await db.query.domainSenders.findMany({
        where: and(eq((domainSenders as any).teamId, teamId), eq(domainSenders.domainId, domain.id))
      });
      if (existingSenders.length >= 1) {
        return reply.code(400).send({ success: false, error: "You can only create one sender identity on the shared domain per project." });
      }
    }

    const existing = await db.query.domainSenders.findFirst({
      where: eq(domainSenders.email, email),
    });
    if (existing) return reply.code(409).send({ success: false, error: "Sender email already exists globally" });

    const [newSender] = await db.insert(domainSenders).values({
      userId: user.sub,
      teamId,
      domainId: domain.id,
      email,
      fromName,
      replyTo: replyTo || undefined,
      companyAddress,
      companyAddress2,
      city,
      state,
      zipCode,
      country,
      nickname,
    }).returning();

    return reply.code(201).send({ success: true, data: newSender });
  });

  // DELETE /v1/senders/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { id } = req.params as { id: string };

    const sender = await db.query.domainSenders.findFirst({
      where: and(eq(domainSenders.id, id), eq((domainSenders as any).teamId, teamId)),
    });
    if (!sender) return reply.code(404).send({ success: false, error: "Sender not found" });

    await db.delete(domainSenders).where(eq(domainSenders.id, id));
    return reply.send({ success: true, data: { message: "Sender deleted." } });
  });
}
