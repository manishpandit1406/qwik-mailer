import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, sql, like, and } from "drizzle-orm";
import { db, suppressionList } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function suppressionRoutes(app: FastifyInstance) {
  // GET /v1/suppression-list — paginated list of suppressed emails
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const { page, limit, search, type } = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(20),
        search: z.string().optional(),
        type: z.string().optional(),
      })
      .parse(req.query);

    const offset = (page - 1) * limit;
    
    const teamId = req.teamId!;
    const conditions = [eq(suppressionList.teamId, teamId)];
    
    if (search) {
      conditions.push(like(suppressionList.email, `%${search.trim().toLowerCase()}%`));
    }
    
    if (type && type !== "all") {
      conditions.push(eq(suppressionList.type, type));
    }
    
    const whereClause = and(...conditions);

    const items = await db.query.suppressionList.findMany({
      where: whereClause,
      orderBy: desc(suppressionList.addedAt),
      limit,
      offset,
    });

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppressionList)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    return reply.send({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
      },
    });
  });

  // POST /v1/suppression-list — manually add email to suppression list
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const { email, type, reason } = z
      .object({
        email: z.string().email(),
        type: z.string().default("unsubscribe"),
        reason: z.string().max(255).optional(),
      })
      .parse(req.body);

    const normalizedEmail = email.trim().toLowerCase();

    const teamId = req.teamId!;
    // Check if already suppressed
    const existing = await db.query.suppressionList.findFirst({
      where: and(
        eq(suppressionList.teamId, teamId),
        eq(suppressionList.email, normalizedEmail)
      ),
    });

    if (existing) {
      return reply.code(409).send({
        success: false,
        error: "Email is already in the suppression list.",
      });
    }

    const [newItem] = await db
      .insert(suppressionList)
      .values({
        teamId,
        email: normalizedEmail,
        type,
        reason,
        addedAt: new Date(),
      } as any)
      .returning();

    return reply.code(201).send({ success: true, data: newItem });
  });

  // DELETE /v1/suppression-list/:email — remove email from suppression list
  app.delete("/:email", { preHandler: authenticate }, async (req, reply) => {
    const { email } = req.params as { email: string };
    const normalizedEmail = email.trim().toLowerCase();

    const teamId = req.teamId!;
    const existing = await db.query.suppressionList.findFirst({
      where: and(
        eq(suppressionList.teamId, teamId),
        eq(suppressionList.email, normalizedEmail)
      ),
    });

    if (!existing) {
      return reply.code(404).send({
        success: false,
        error: "Email not found in suppression list.",
      });
    }

    await db.delete(suppressionList).where(
      and(
        eq(suppressionList.teamId, teamId),
        eq(suppressionList.email, normalizedEmail)
      )
    );

    return reply.send({
      success: true,
      data: { message: "Email removed from suppression list." },
    });
  });
}
