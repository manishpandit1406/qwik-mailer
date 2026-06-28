import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db, users, emails, suppressionList } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function adminRoutes(app: FastifyInstance) {
  // Admin-only preHandler
  const adminOnly = async (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as { role: string };
      if (!["admin", "abuse_team"].includes(payload.role)) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
    } catch {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
  };

  // GET /v1/admin/users
  app.get("/users", { preHandler: adminOnly }, async (req, reply) => {
    const { page, limit } = z
      .object({ page: z.coerce.number().default(1), limit: z.coerce.number().max(100).default(20) })
      .parse(req.query);

    const offset = (page - 1) * limit;
    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        role: users.role,
        emailVerified: users.emailVerified,
        isSuspended: users.isSuspended,
        suspendReason: users.suspendReason,
        reputationScore: users.reputationScore,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return reply.send({ success: true, data: userList });
  });

  // POST /v1/admin/users/:id/suspend
  app.post("/users/:id/suspend", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);

    await db.update(users).set({ isSuspended: true, suspendReason: reason, updatedAt: new Date() })
      .where(eq(users.id, id));

    return reply.send({ success: true, data: { message: "User suspended." } });
  });

  // POST /v1/admin/users/:id/unsuspend
  app.post("/users/:id/unsuspend", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.update(users)
      .set({ isSuspended: false, suspendReason: null, updatedAt: new Date() })
      .where(eq(users.id, id));
    return reply.send({ success: true, data: { message: "User unsuspended." } });
  });

  // GET /v1/admin/stats
  app.get("/stats", { preHandler: adminOnly }, async (_req, reply) => {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [emailCount] = await db.select({ count: sql<number>`count(*)` }).from(emails);
    const [suppressionCount] = await db.select({ count: sql<number>`count(*)` }).from(suppressionList);

    return reply.send({
      success: true,
      data: {
        totalUsers: Number(userCount.count),
        totalEmails: Number(emailCount.count),
        suppressedAddresses: Number(suppressionCount.count),
      },
    });
  });

  // POST /v1/admin/suppression
  app.post("/suppression", { preHandler: adminOnly }, async (req, reply) => {
    const { email, reason, userId } = z
      .object({ email: z.string().email(), reason: z.string(), userId: z.string().uuid() })
      .parse(req.body);

    await db.insert(suppressionList).values({ teamId: userId, email, reason }).onConflictDoNothing();
    return reply.send({ success: true, data: { message: "Address added to suppression list." } });
  });
  // GET /v1/admin/domains
  app.get("/domains", { preHandler: adminOnly }, async (req, reply) => {
    const { page, limit } = z
      .object({ page: z.coerce.number().default(1), limit: z.coerce.number().max(100).default(20) })
      .parse(req.query);

    const offset = (page - 1) * limit;
    
    // Using simple query string to get user email along with domain
    const { domains } = await import("@qwikmailer/db");
    
    // Try to get domains with user info
    const domainList = await db
      .select({
        id: domains.id,
        domain: domains.domain,
        status: domains.status,
        provider: domains.provider,
        createdAt: domains.createdAt,
        teamId: domains.teamId
      })
      .from(domains)
      .orderBy(desc(domains.createdAt))
      .limit(limit)
      .offset(offset);

    return reply.send({ success: true, data: domainList });
  });

  // GET /v1/admin/tickets
  app.get("/tickets", { preHandler: adminOnly }, async (req, reply) => {
    const { page, limit } = z
      .object({ page: z.coerce.number().default(1), limit: z.coerce.number().max(100).default(20) })
      .parse(req.query);
      
    const offset = (page - 1) * limit;
    const { supportTickets } = await import("@qwikmailer/db");
    
    const ticketsList = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        teamId: supportTickets.teamId,
        subject: supportTickets.subject,
        description: supportTickets.description,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt
      })
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);
      
    return reply.send({ success: true, data: ticketsList });
  });

  // GET /v1/admin/suppression (List suppressions)
  app.get("/suppression", { preHandler: adminOnly }, async (req, reply) => {
    const { page, limit } = z
      .object({ page: z.coerce.number().default(1), limit: z.coerce.number().max(100).default(20) })
      .parse(req.query);
      
    const offset = (page - 1) * limit;
    
    const list = await db
      .select({
        id: suppressionList.id,
        email: suppressionList.email,
        reason: suppressionList.reason,
        createdAt: suppressionList.createdAt,
        teamId: suppressionList.teamId
      })
      .from(suppressionList)
      .orderBy(desc(suppressionList.createdAt))
      .limit(limit)
      .offset(offset);
      
    return reply.send({ success: true, data: list });
  });

  // DELETE /v1/admin/suppression/:id
  app.delete("/suppression/:id", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.delete(suppressionList).where(eq(suppressionList.id, id));
    return reply.send({ success: true, data: { message: "Removed from suppression list." } });
  });
}
