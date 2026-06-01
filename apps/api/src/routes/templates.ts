import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, templates } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function templateRoutes(app: FastifyInstance) {
  const templateSchema = z.object({
    name: z.string().min(1).max(255),
    subject: z.string().min(1),
    htmlBody: z.string().min(1),
    textBody: z.string().optional(),
    variables: z.array(z.string()).optional(),
  });

  // GET /v1/templates
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.userId, user.sub),
    });
    return reply.send({ success: true, data: userTemplates });
  });

  // GET /v1/templates/:id
  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.userId, user.sub)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: template });
  });

  // POST /v1/templates
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const body = templateSchema.parse(req.body);

    // Extract variables from HTML: {{variableName}}
    const varMatches = body.htmlBody.match(/\{\{(\w+)\}\}/g) ?? [];
    const extractedVars = [...new Set(varMatches.map((m) => m.replace(/\{\{|\}\}/g, "")))];

    const [template] = await db
      .insert(templates)
      .values({
        userId: user.sub,
        name: body.name,
        subject: body.subject,
        htmlBody: body.htmlBody,
        textBody: body.textBody,
        variables: body.variables ?? extractedVars,
      })
      .returning();

    return reply.code(201).send({ success: true, data: template });
  });

  // PUT /v1/templates/:id
  app.put("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const body = templateSchema.partial().parse(req.body);

    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.userId, user.sub)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });

    const [updated] = await db
      .update(templates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // DELETE /v1/templates/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.userId, user.sub)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });

    await db.delete(templates).where(eq(templates.id, id));
    return reply.send({ success: true, data: { message: "Template deleted." } });
  });
}
