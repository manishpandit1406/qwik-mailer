import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, templates } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { checkSpamScore } from "./ai.js";

export async function templateRoutes(app: FastifyInstance) {
  const templateSchema = z.object({
    name: z.string().min(1).max(255),
    subject: z.string().min(1),
    htmlBody: z.string().optional().or(z.literal("")),
    textBody: z.string().optional().or(z.literal("")),
    variables: z.array(z.string()).optional(),
  });

  // GET /v1/templates
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.teamId, teamId),
    });
    return reply.send({ success: true, data: userTemplates });
  });

  // GET /v1/templates/:id
  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.teamId, teamId)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: template });
  });

  // POST /v1/templates
  app.post("/", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const body = templateSchema.parse(req.body);

    // Extract variables from HTML: {{variableName}}
    const varMatches = (body.htmlBody || "").match(/\{\{(\w+)\}\}/g) ?? [];
    const extractedVars = [...new Set(varMatches.map((m) => m.replace(/\{\{|\}\}/g, "")))];

    try {
      const spamCheck = await checkSpamScore(body.subject, body.htmlBody || body.textBody || "");
      if (spamCheck.score >= 7 || spamCheck.level === "high" || spamCheck.level === "critical") {
        return reply.code(400).send({ 
          success: false, 
          error: "Spam detected in template content.", 
          issues: spamCheck.issues,
          suggestions: spamCheck.suggestions,
          spamScore: spamCheck.score
        });
      }
    } catch (e) {
      console.warn("[Template Spam Check Error]:", e);
    }

    const [template] = await db
      .insert(templates)
      .values({
        teamId,
        name: body.name,
        subject: body.subject,
        htmlBody: body.htmlBody || "",
        textBody: body.textBody,
        variables: body.variables ?? extractedVars,
      })
      .returning();

    return reply.code(201).send({ success: true, data: template });
  });

  // PUT /v1/templates/:id
  app.put("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const body = templateSchema.partial().parse(req.body);

    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.teamId, teamId)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });

    const updatedSubject = body.subject ?? template.subject;
    const updatedHtml = body.htmlBody ?? template.htmlBody;

    try {
      const spamCheck = await checkSpamScore(updatedSubject, updatedHtml || body.textBody || "");
      if (spamCheck.score >= 7 || spamCheck.level === "high" || spamCheck.level === "critical") {
        return reply.code(400).send({ 
          success: false, 
          error: "Spam detected in template content.", 
          issues: spamCheck.issues,
          suggestions: spamCheck.suggestions,
          spamScore: spamCheck.score
        });
      }
    } catch (e) {
      console.warn("[Template Update Spam Check Error]:", e);
    }

    const [updated] = await db
      .update(templates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // DELETE /v1/templates/:id
  app.delete("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };

    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.teamId, teamId)),
    });
    if (!template) return reply.code(404).send({ success: false, error: "Template not found" });

    await db.delete(templates).where(eq(templates.id, id));
    return reply.send({ success: true, data: { message: "Template deleted." } });
  });
}
