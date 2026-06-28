import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { db, supportTickets } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  description: z.string().min(1, "Description is required"),
});

export async function supportRoutes(app: FastifyInstance) {
  // GET /v1/support/tickets - Get user's support tickets
  app.get("/tickets", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    try {
      const tickets = await db.query.supportTickets.findMany({
        where: eq(supportTickets.userId, user.sub),
        orderBy: [desc(supportTickets.createdAt)],
      });
      return reply.send({ success: true, data: tickets });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // POST /v1/support/tickets - Create a new support ticket
  app.post("/tickets", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const teamId = req.teamId;
    
    try {
      const { subject, description } = supportTicketSchema.parse(req.body);

      const [ticket] = await db.insert(supportTickets).values({
        userId: user.sub,
        teamId: teamId || null,
        subject,
        description,
        status: "open",
      } as any).returning();

      return reply.code(201).send({ success: true, data: ticket });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: "Validation failed",
          details: err.errors,
        });
      }
      app.log.error(err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // GET /v1/support/tickets/:id/messages - Get messages for a specific ticket
  app.get("/tickets/:id/messages", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { supportTicketMessages } = await import("@qwikmailer/db");

    try {
      // Verify ticket belongs to user
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
      if (!ticket || ticket.userId !== user.sub) {
        return reply.code(404).send({ success: false, error: "Ticket not found" });
      }

      const messages = await db
        .select({
          id: supportTicketMessages.id,
          senderType: supportTicketMessages.senderType,
          message: supportTicketMessages.message,
          createdAt: supportTicketMessages.createdAt,
        })
        .from(supportTicketMessages)
        .where(eq(supportTicketMessages.ticketId, id))
        .orderBy(asc(supportTicketMessages.createdAt));

      return reply.send({ success: true, data: messages });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // POST /v1/support/tickets/:id/reply - User replies to a ticket
  app.post("/tickets/:id/reply", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    
    try {
      const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
      const { supportTicketMessages } = await import("@qwikmailer/db");

      // Verify ticket belongs to user
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
      if (!ticket || ticket.userId !== user.sub) {
        return reply.code(404).send({ success: false, error: "Ticket not found" });
      }

      // Insert message
      await db.insert(supportTicketMessages).values({
        ticketId: id,
        senderType: "user",
        message,
      });

      // Update ticket status to open if it was resolved
      if (ticket.status === "resolved") {
        await db.update(supportTickets).set({ status: "open" }).where(eq(supportTickets.id, id));
      }

      return reply.code(201).send({ success: true, message: "Reply sent successfully" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: "Validation failed" });
      }
      app.log.error(err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });
}
