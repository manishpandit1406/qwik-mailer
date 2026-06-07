import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, supportTickets } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  description: z.string().min(1, "Description is required"),
});

export async function supportRoutes(app: FastifyInstance) {
  // GET /v1/support/tickets - Get user's support tickets
  app.get("/tickets", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    try {
      const tickets = await db.query.supportTickets.findMany({
        where: eq((supportTickets as any).teamId || (supportTickets as any).userId, teamId),
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
    const teamId = req.teamId!;
    
    try {
      const { subject, description } = supportTicketSchema.parse(req.body);

      const [ticket] = await db.insert(supportTickets).values({
        userId: teamId!,
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
}
