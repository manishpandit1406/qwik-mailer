import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, emails, contacts, contactListMembers, templates, users } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { PLAN_LIMITS, PlanType } from "../config/plans.js";
import { checkAndConsumeQuota } from "../utils/quota.js";
import { createEmailQueue, createRedisConnection } from "@qwikmailer/queue";
import { resolveSenderDomain } from "./emails.js";
import crypto from "crypto";

const redis = createRedisConnection();
const emailQueue = createEmailQueue(redis);

export async function broadcastRoutes(app: FastifyInstance) {
  // GET /v1/broadcasts - List all broadcasts with aggregated Resend-style metrics
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    try {
      const broadcastsResult = await db.execute(sql`
        SELECT 
          batch_id,
          MAX(subject) as subject,
          MAX(from_email) as from_email,
          MAX(from_name) as from_name,
          MIN(created_at) as created_at,
          MAX(scheduled_at) as scheduled_at,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'sent') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as failed,
          COUNT(*) FILTER (WHERE status = 'queued' OR status = 'sending') as pending,
          SUM(open_count) as total_opens,
          SUM(click_count) as total_clicks
        FROM emails
        WHERE team_id = ${teamId} AND batch_id IS NOT NULL
        GROUP BY batch_id
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const rows = (broadcastsResult as any).rows || broadcastsResult;

      const broadcasts = rows.map((b: any) => {
        const total = Number(b.total || 0);
        const delivered = Number(b.delivered || 0);
        const pending = Number(b.pending || 0);
        const opens = Number(b.total_opens || 0);
        const clicks = Number(b.total_clicks || 0);

        let status = "sent";
        if (b.scheduled_at && new Date(b.scheduled_at) > new Date()) {
          status = "scheduled";
        } else if (pending > 0) {
          status = "sending";
        }

        const openRate = delivered > 0 ? Math.min(100, Math.round((opens / delivered) * 100)) : 0;
        const clickRate = delivered > 0 ? Math.min(100, Math.round((clicks / delivered) * 100)) : 0;

        return {
          id: b.batch_id,
          name: b.subject || "Untitled Broadcast",
          subject: b.subject || "Untitled Broadcast",
          fromEmail: b.from_email,
          fromName: b.from_name,
          status,
          totalRecipients: total,
          deliveredCount: delivered,
          pendingCount: pending,
          failedCount: Number(b.failed || 0),
          openCount: opens,
          clickCount: clicks,
          openRate,
          clickRate,
          createdAt: b.created_at,
          scheduledAt: b.scheduled_at,
        };
      });

      return reply.send({ success: true, data: broadcasts });
    } catch (err: any) {
      console.error("[Broadcasts List]", err);
      return reply.code(500).send({ success: false, error: "Failed to fetch broadcasts" });
    }
  });

  // GET /v1/broadcasts/:batchId - Get broadcast details and recipient list
  app.get("/:batchId", { preHandler: authenticate }, async (req, reply) => {
    const teamId = (req as any).teamId as string;
    const { batchId } = req.params as { batchId: string };

    try {
      const summaryResult = await db.execute(sql`
        SELECT 
          batch_id,
          MAX(subject) as subject,
          MAX(from_email) as from_email,
          MAX(from_name) as from_name,
          MAX(html_body) as html_body,
          MAX(text_body) as text_body,
          MIN(created_at) as created_at,
          MAX(scheduled_at) as scheduled_at,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'sent') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as failed,
          COUNT(*) FILTER (WHERE status = 'queued' OR status = 'sending') as pending,
          SUM(open_count) as total_opens,
          SUM(click_count) as total_clicks
        FROM emails
        WHERE team_id = ${teamId} AND batch_id = ${batchId}
        GROUP BY batch_id
      `);

      const rows = (summaryResult as any).rows || summaryResult;
      if (!rows.length) {
        return reply.code(404).send({ success: false, error: "Broadcast not found" });
      }

      const b = rows[0];
      const total = Number(b.total || 0);
      const delivered = Number(b.delivered || 0);
      const opens = Number(b.total_opens || 0);
      const clicks = Number(b.total_clicks || 0);

      const recipientLogs = await db.select({
        id: emails.id,
        toEmail: emails.toEmail,
        toName: emails.toName,
        status: emails.status,
        openCount: emails.openCount,
        clickCount: emails.clickCount,
        sentAt: emails.sentAt,
        deliveredAt: emails.deliveredAt,
      })
      .from(emails)
      .where(and(eq(emails.teamId, teamId), eq(emails.batchId, batchId)))
      .limit(300);

      return reply.send({
        success: true,
        data: {
          id: b.batch_id,
          subject: b.subject,
          fromEmail: b.from_email,
          fromName: b.from_name,
          htmlBody: b.html_body,
          textBody: b.text_body,
          createdAt: b.created_at,
          scheduledAt: b.scheduled_at,
          totalRecipients: total,
          deliveredCount: delivered,
          pendingCount: Number(b.pending || 0),
          failedCount: Number(b.failed || 0),
          openCount: opens,
          clickCount: clicks,
          openRate: delivered > 0 ? Math.round((opens / delivered) * 100) : 0,
          clickRate: delivered > 0 ? Math.round((clicks / delivered) * 100) : 0,
          recipients: recipientLogs,
        }
      });
    } catch (err: any) {
      console.error("[Broadcast Detail]", err);
      return reply.code(500).send({ success: false, error: "Failed to fetch broadcast details" });
    }
  });

  // POST /v1/broadcasts - Create and dispatch a broadcast
  app.post("/", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string; source?: string };
    const schema = z.object({
      subject: z.string().min(1, "Subject is required").max(998),
      from: z.string().email().optional(),
      fromName: z.string().optional(),
      replyTo: z.string().email().optional(),
      html: z.string().optional(),
      text: z.string().optional(),
      templateId: z.string().uuid().optional(),
      scheduledAt: z.string().datetime().optional(),
      // Either audience (listId/tag) OR direct recipients array
      audience: z.object({
        listId: z.string().optional(),
        tag: z.string().optional(),
      }).optional(),
      recipients: z.array(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        variables: z.record(z.any()).optional(),
      })).optional(),
    });

    const body = schema.parse(req.body);
    const teamId = (req as any).teamId as string;

    if (!body.audience && (!body.recipients || body.recipients.length === 0)) {
      return reply.code(400).send({ success: false, error: "Please select an audience or provide recipients." });
    }

    if (body.scheduledAt) {
      const userRec = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
      const plan = userRec?.plan || "free";
      const limits = PLAN_LIMITS[plan as PlanType];
      if (!limits || !limits.features.scheduling) {
        return reply.code(402).send({ success: false, error: `Scheduling is not supported on the ${plan} plan.` });
      }
    }

    // Resolve recipients list
    let targetRecipients: { email: string; name?: string; variables?: Record<string, any> }[] = [];

    if (body.recipients && body.recipients.length > 0) {
      targetRecipients = body.recipients;
    } else if (body.audience) {
      let conditions = eq(contacts.teamId, teamId);
      if (body.audience.listId) {
        const members = await db.select({ contactId: contactListMembers.contactId })
          .from(contactListMembers)
          .where(eq(contactListMembers.listId, body.audience.listId));
        const memberIds = members.map((m) => m.contactId);
        if (memberIds.length === 0) {
          return reply.code(400).send({ success: false, error: "Selected audience list is empty." });
        }
        conditions = and(conditions, inArray(contacts.id, memberIds))! as any;
      }
      if (body.audience.tag) {
        conditions = and(conditions, sql`${contacts.tags} @> ${JSON.stringify([body.audience.tag])}::jsonb`)! as any;
      }

      const audienceContacts = await db.query.contacts.findMany({
        where: conditions,
        columns: { email: true, firstName: true, lastName: true, customFields: true },
      });

      targetRecipients = audienceContacts.map((c) => ({
        email: c.email,
        name: c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : undefined,
        variables: (c.customFields as Record<string, any>) || {},
      }));
    }

    if (targetRecipients.length === 0) {
      return reply.code(400).send({ success: false, error: "No recipients found for this broadcast." });
    }

    try {
      await checkAndConsumeQuota(teamId, targetRecipients.length);
    } catch (error: any) {
      return reply.code(403).send({ success: false, error: error.message });
    }

    let finalSubject = body.subject;
    let finalHtml = body.html;
    let finalText = body.text;

    if (body.templateId) {
      const template = await db.query.templates.findFirst({
        where: and(eq(templates.id, body.templateId), eq((templates as any).teamId, teamId)),
      });
      if (!template) return reply.code(400).send({ success: false, error: "Template not found" });
      if (!finalSubject) finalSubject = template.subject;
      if (!finalHtml) finalHtml = template.htmlBody;
      if (!finalText && template.textBody) finalText = template.textBody;
    }

    let senderDetails;
    try {
      senderDetails = await resolveSenderDomain(teamId, body.from, body.fromName);
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message || "Invalid sender domain" });
    }

    const { fromEmail, fromName, replyTo } = senderDetails;
    const batchId = crypto.randomUUID();

    const CHUNK_SIZE = 1000;
    const jobIds: string[] = [];

    for (let i = 0; i < targetRecipients.length; i += CHUNK_SIZE) {
      const chunk = targetRecipients.slice(i, i + CHUNK_SIZE);
      const insertPayloads = [];

      for (const recipient of chunk) {
        if (!recipient.email) continue;

        // Personalize body with variables if template tags are used
        let personalizedHtml = finalHtml;
        let personalizedText = finalText;
        const vars = recipient.variables || {};
        const allVars: Record<string, string> = {
          email: recipient.email,
          name: recipient.name || "",
          firstName: recipient.name?.split(" ")[0] || "",
          ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v ?? "")])),
        };

        if (personalizedHtml) {
          for (const [k, v] of Object.entries(allVars)) {
            personalizedHtml = personalizedHtml.replace(new RegExp(`{{${k}}}`, "gi"), v);
          }
        }
        if (personalizedText) {
          for (const [k, v] of Object.entries(allVars)) {
            personalizedText = personalizedText.replace(new RegExp(`{{${k}}}`, "gi"), v);
          }
        }

        insertPayloads.push({
          teamId,
          batchId,
          fromEmail,
          fromName,
          toEmail: recipient.email,
          toName: recipient.name,
          replyTo: body.replyTo ?? replyTo,
          subject: finalSubject,
          htmlBody: personalizedHtml,
          textBody: personalizedText,
          metadata: { ...vars, _source: "broadcast", broadcastId: batchId },
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          status: "queued" as any,
        });
      }

      if (insertPayloads.length > 0) {
        const insertedRows = await db.insert(emails).values(insertPayloads).returning({ id: emails.id });
        const jobs = insertedRows.map((row) => ({
          name: "send",
          data: { emailId: row.id, teamId },
          opts: body.scheduledAt ? { delay: new Date(body.scheduledAt).getTime() - Date.now() } : undefined,
        }));
        await emailQueue.addBulk(jobs);
        jobIds.push(...insertedRows.map((r) => r.id));
      }
    }

    return reply.code(202).send({
      success: true,
      data: {
        broadcastId: batchId,
        queued: jobIds.length,
        scheduledAt: body.scheduledAt || null,
      },
    });
  });

  // POST /v1/broadcasts/:batchId/cancel
  app.post("/:batchId/cancel", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const { batchId } = req.params as { batchId: string };
    const teamId = (req as any).teamId as string;

    const result = await db.update(emails)
      .set({ status: "cancelled" as any })
      .where(and(eq(emails.batchId, batchId), eq(emails.teamId, teamId), eq(emails.status, "queued")))
      .returning({ id: emails.id });

    return reply.send({ success: true, cancelledCount: result.length });
  });
}
