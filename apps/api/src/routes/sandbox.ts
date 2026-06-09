import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, lt, count } from "drizzle-orm";
import { db, sandboxEmails, teams } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function sandboxRoutes(app: FastifyInstance) {

  // GET /v1/sandbox/settings — get sandbox on/off + unread count
  app.get("/settings", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) return reply.code(404).send({ success: false, error: "Team not found" });

    const [unreadResult] = await db
      .select({ count: count() })
      .from(sandboxEmails)
      .where(and(eq(sandboxEmails.teamId, teamId), eq(sandboxEmails.isRead, false)));

    return reply.send({
      success: true,
      data: {
        sandboxMode: team.sandboxMode,
        unreadCount: Number(unreadResult?.count ?? 0),
      },
    });
  });

  // PATCH /v1/sandbox/settings — toggle sandbox mode
  app.patch("/settings", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { sandboxMode } = z.object({ sandboxMode: z.boolean() }).parse(req.body);

    await db.update(teams).set({ sandboxMode }).where(eq(teams.id, teamId));

    return reply.send({
      success: true,
      data: { sandboxMode, message: sandboxMode ? "🧪 Sandbox mode enabled — emails will not be delivered" : "✅ Sandbox mode disabled — emails will be delivered normally" },
    });
  });

  // GET /v1/sandbox/emails — list sandbox inbox (paginated)
  app.get("/emails", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const [items, [totalResult]] = await Promise.all([
      db.query.sandboxEmails.findMany({
        where: eq(sandboxEmails.teamId, teamId),
        orderBy: [desc(sandboxEmails.createdAt)],
        limit: query.limit,
        offset,
        columns: {
          id: true,
          fromEmail: true,
          fromName: true,
          toEmail: true,
          toName: true,
          subject: true,
          isRead: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      db.select({ count: count() }).from(sandboxEmails).where(eq(sandboxEmails.teamId, teamId)),
    ]);

    return reply.send({
      success: true,
      data: {
        items,
        total: Number(totalResult?.count ?? 0),
        page: query.page,
        limit: query.limit,
      },
    });
  });

  // GET /v1/sandbox/emails/:id — get full email detail
  app.get("/emails/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { id } = req.params as { id: string };

    const email = await db.query.sandboxEmails.findFirst({
      where: and(eq(sandboxEmails.id, id), eq(sandboxEmails.teamId, teamId)),
    });

    if (!email) return reply.code(404).send({ success: false, error: "Email not found" });

    // Mark as read
    if (!email.isRead) {
      await db.update(sandboxEmails).set({ isRead: true }).where(eq(sandboxEmails.id, id));
    }

    return reply.send({ success: true, data: { ...email, isRead: true } });
  });

  // PATCH /v1/sandbox/emails/:id/read — mark as read
  app.patch("/emails/:id/read", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { id } = req.params as { id: string };

    await db.update(sandboxEmails)
      .set({ isRead: true })
      .where(and(eq(sandboxEmails.id, id), eq(sandboxEmails.teamId, teamId)));

    return reply.send({ success: true });
  });

  // DELETE /v1/sandbox/emails/:id — delete single email
  app.delete("/emails/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { id } = req.params as { id: string };

    await db.delete(sandboxEmails)
      .where(and(eq(sandboxEmails.id, id), eq(sandboxEmails.teamId, teamId)));

    return reply.send({ success: true });
  });

  // DELETE /v1/sandbox/emails — clear entire inbox
  app.delete("/emails", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;

    await db.delete(sandboxEmails).where(eq(sandboxEmails.teamId, teamId));

    return reply.send({ success: true, data: { message: "Inbox cleared" } });
  });

  // Internal cleanup job: delete expired sandbox emails (called from cron or on request)
  app.delete("/cleanup", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const now = new Date();

    await db.delete(sandboxEmails)
      .where(and(eq(sandboxEmails.teamId, teamId), lt(sandboxEmails.expiresAt, now)));

    return reply.send({ success: true, data: { message: "Expired emails cleaned up" } });
  });
}
