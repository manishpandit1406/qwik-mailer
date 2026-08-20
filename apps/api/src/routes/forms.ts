import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db, forms, formSubmissions, contacts, contactListMembers } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { safeFetch } from "../utils/ssrf.js";

export async function formRoutes(app: FastifyInstance) {
  const formSchema = z.object({
    name: z.string().min(1).max(255),
    status: z.enum(["active", "draft", "inactive"]).default("draft"),
    schema: z.array(z.any()).default([]),
    design: z.record(z.any()).default({}),
    settings: z.record(z.any()).default({}),
  });

  // GET /v1/forms
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userForms = await db.query.forms.findMany({
      where: eq(forms.teamId, teamId),
      orderBy: [desc(forms.createdAt)],
    });
    return reply.send({ success: true, data: userForms });
  });

  // POST /v1/forms
  app.post("/", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const body = formSchema.parse(req.body);
    const [newForm] = await db.insert(forms).values({
      teamId,
      ...body,
    }).returning();
    return reply.code(201).send({ success: true, data: newForm });
  });

  // GET /v1/forms/:id
  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.teamId, teamId)),
    });
    if (!form) return reply.code(404).send({ success: false, error: "Form not found" });
    return reply.send({ success: true, data: form });
  });

  // PUT /v1/forms/:id
  app.put("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const body = formSchema.partial().parse(req.body);
    
    const [updatedForm] = await db
      .update(forms)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(forms.id, id), eq(forms.teamId, teamId)))
      .returning();
      
    if (!updatedForm) return reply.code(404).send({ success: false, error: "Form not found" });
    return reply.send({ success: true, data: updatedForm });
  });

  // DELETE /v1/forms/:id
  app.delete("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const [deletedForm] = await db.delete(forms)
      .where(and(eq(forms.id, id), eq(forms.teamId, teamId)))
      .returning();
      
    if (!deletedForm) return reply.code(404).send({ success: false, error: "Form not found" });
    return reply.send({ success: true, message: "Form deleted" });
  });

  // ─── Submissions ──────────────────────────────────────────────────────────

  // GET /v1/forms/:id/submissions — paginated
  app.get("/:id/submissions", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };
    const { page = "1", limit = "50" } = req.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Verify form belongs to team
    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.teamId, teamId))
    });
    if (!form) return reply.code(404).send({ success: false, error: "Form not found" });

    // Total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(formSubmissions)
      .where(and(eq(formSubmissions.formId, id), eq(formSubmissions.teamId, teamId)));

    const data = await db.query.formSubmissions.findMany({
      where: and(eq(formSubmissions.formId, id), eq(formSubmissions.teamId, teamId)),
      orderBy: [desc(formSubmissions.createdAt)],
      limit: limitNum,
      offset,
    });

    return reply.send({
      success: true,
      data,
      total: Number(total),
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(Number(total) / limitNum),
    });
  });

  // GET /v1/forms/:id/submissions/export — CSV download
  // NOTE: This route must be registered BEFORE /:id/submissions/:subId to avoid routing conflict
  app.get("/:id/submissions/export", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id } = req.params as { id: string };

    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.teamId, teamId))
    });
    if (!form) return reply.code(404).send({ success: false, error: "Form not found" });

    const allSubmissions = await db.query.formSubmissions.findMany({
      where: and(eq(formSubmissions.formId, id), eq(formSubmissions.teamId, teamId)),
      orderBy: [desc(formSubmissions.createdAt)],
    });

    if (allSubmissions.length === 0) {
      // Return an empty CSV with just a header row
      const safeFormName = (form.name || "submissions").replace(/[^a-z0-9_-]/gi, "_");
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${safeFormName}_submissions.csv"`);
      return reply.send("id,submitted_at,ip\n");
    }

    // Collect all unique data keys across all submissions (preserve insertion order)
    const dataKeySet = new Set<string>();
    for (const sub of allSubmissions) {
      Object.keys(sub.data ?? {}).forEach(k => dataKeySet.add(k));
    }
    const dataKeys = Array.from(dataKeySet);

    // Build CSV
    const escape = (val: any): string => {
      const str = val === null || val === undefined ? "" : String(val);
      // Wrap in quotes if it contains comma, newline or quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ["id", "submitted_at", "ip", ...dataKeys];
    const rows = allSubmissions.map(sub => [
      escape(sub.id),
      escape(sub.createdAt ? new Date(sub.createdAt).toISOString() : ""),
      escape(sub.ip ?? ""),
      ...dataKeys.map(k => escape((sub.data as any)?.[k] ?? "")),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const safeFormName = (form.name || "submissions").replace(/[^a-z0-9_-]/gi, "_");

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="${safeFormName}_submissions.csv"`);
    return reply.send(csv);
  });

  // DELETE /v1/forms/:id/submissions/:subId
  app.delete("/:id/submissions/:subId", {
    preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])],
  }, async (req, reply) => {
    const teamId = req.teamId!;
    const { id, subId } = req.params as { id: string; subId: string };

    // Verify form belongs to team
    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.teamId, teamId))
    });
    if (!form) return reply.code(404).send({ success: false, error: "Form not found" });

    const [deleted] = await db
      .delete(formSubmissions)
      .where(
        and(
          eq(formSubmissions.id, subId),
          eq(formSubmissions.formId, id),
          eq(formSubmissions.teamId, teamId)
        )
      )
      .returning();

    if (!deleted) return reply.code(404).send({ success: false, error: "Submission not found" });

    // Decrement submissions counter on the form
    await db.execute(sql`UPDATE forms SET submissions = GREATEST(submissions - 1, 0) WHERE id = ${id}`);

    return reply.send({ success: true, message: "Submission deleted" });
  });

  // ─── Public ────────────────────────────────────────────────────────────────

  // GET /v1/forms/:id/public (No Auth)
  app.get("/:id/public", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { preview, sessionId } = req.query as { preview?: string, sessionId?: string };
    const form = await db.query.forms.findFirst({
      where: preview === 'true' ? eq(forms.id, id) : and(eq(forms.id, id), eq(forms.status, "active")),
      columns: {
        id: true,
        name: true,
        schema: true,
        design: true,
        settings: true,
      }
    });
    
    if (!form) return reply.code(404).send({ success: false, error: "Form not found or inactive" });

    // Increment views (Unique per IP per 24 hours)
    if (preview !== 'true') {
      const redis = (app as any).redis;
      if (redis) {
        const viewerId = sessionId || req.ip || "unknown";
        const viewKey = `form_view:${id}:${viewerId}`;
        const hasViewed = await redis.get(viewKey);
        
        if (!hasViewed) {
          await redis.set(viewKey, "1", "EX", 86400); // 24 hours TTL
          db.execute(sql`UPDATE forms SET views = views + 1 WHERE id = ${id}`).catch(console.error);
        }
      } else {
        // Fallback if no redis
        db.execute(sql`UPDATE forms SET views = views + 1 WHERE id = ${id}`).catch(console.error);
      }
    }

    return reply.send({ success: true, data: form });
  });

  // POST /v1/forms/:id/submit (No Auth)
  const submitSchema = z.object({
    data: z.record(z.any()),
    recaptchaToken: z.string().optional(),
  });

  app.post("/:id/submit", {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { data, recaptchaToken } = submitSchema.parse(req.body);

    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, id), eq(forms.status, "active")),
    });

    if (!form) return reply.code(404).send({ success: false, error: "Form not found or inactive" });

    const settings = form.settings as any;
    // Process Contacts
    let contactId = null;
    const schema = (form.schema || []) as any[];
    
    let emailField = schema.find((f: any) => f.type === "email")?.name;
    if (!emailField) {
      emailField = schema.find((f: any) => f.label?.toLowerCase().includes("email"))?.name;
    }
    let emailValue = emailField ? data[emailField] : undefined;
    if (!emailValue) {
      emailValue = data["email"] || data["Email"] || Object.entries(data).find(([k]) => k.toLowerCase().includes("email"))?.[1];
    }

    const nameField = schema.find((f: any) => f.label?.toLowerCase().includes("name") || f.label?.toLowerCase().includes("first"))?.name;
    const lastNameField = schema.find((f: any) => f.label?.toLowerCase().includes("last"))?.name;
    const phoneField = schema.find((f: any) => f.type === "tel" || f.label?.toLowerCase().includes("phone") || f.label?.toLowerCase().includes("mobile"))?.name;

    let firstNameVal = data["first_name"] || data["firstName"] || data["Name"] || data["name"];
    if (!firstNameVal && nameField) firstNameVal = data[nameField];

    let lastNameVal = data["last_name"] || data["lastName"];
    if (!lastNameVal && lastNameField) lastNameVal = data[lastNameField];

    let phoneVal = data["phone"] || data["Phone"];
    if (!phoneVal && phoneField) phoneVal = data[phoneField];

    if (emailValue) {
      const formTag = `Form: ${form.name}`;
      
      // Create or update contact
      const [contact] = await db.insert(contacts).values({
        teamId: form.teamId,
        email: emailValue,
        firstName: firstNameVal || null,
        lastName: lastNameVal || null,
        phone: phoneVal || null,
        customFields: data,
        tags: [formTag],
      }).onConflictDoUpdate({
        target: [contacts.teamId, contacts.email],
        set: {
          firstName: firstNameVal ? firstNameVal : sql`${contacts.firstName}`,
          lastName: lastNameVal ? lastNameVal : sql`${contacts.lastName}`,
          phone: phoneVal ? phoneVal : sql`${contacts.phone}`,
          customFields: sql`${contacts.customFields} || ${JSON.stringify(data)}::jsonb`,
          tags: sql`CASE WHEN ${contacts.tags} @> ${JSON.stringify([formTag])}::jsonb THEN ${contacts.tags} ELSE COALESCE(${contacts.tags}, '[]'::jsonb) || ${JSON.stringify([formTag])}::jsonb END`,
          updatedAt: new Date(),
        }
      }).returning();
      
      contactId = contact.id;

      // Add to contact lists if configured
      if (settings?.targetLists && Array.isArray(settings.targetLists) && settings.targetLists.length > 0) {
        for (const listId of settings.targetLists) {
          try {
            await db.insert(contactListMembers).values({
              listId,
              contactId: contact.id,
            }).onConflictDoNothing();
          } catch (e) {
             console.error("Error adding to contact list:", e);
          }
        }
      }
    }

    // Store submission
    await db.insert(formSubmissions).values({
      formId: form.id,
      teamId: form.teamId,
      contactId,
      data,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Increment submissions count
    await db.execute(sql`UPDATE forms SET submissions = submissions + 1 WHERE id = ${form.id}`);

    // Clear the view cache so if the same IP views the form again to submit another response, it counts as a new view
    const redis = (app as any).redis;
    if (redis) {
      await redis.del(`form_view:${form.id}:${req.ip || "unknown"}`);
    }

    // Fire webhook if configured
    if (settings?.webhookUrl) {
      safeFetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, formName: form.name, contactId, data, submittedAt: new Date() })
      }).catch(err => console.error("Webhook failed:", err));
    }

    return reply.send({ success: true, message: "Form submitted successfully" });
  });
}
