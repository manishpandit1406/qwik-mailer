import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql, inArray, or } from "drizzle-orm";
import { db, emails, emailEvents, users, templates, domains, domainSenders, certificates, suppressionList, contactLists, contacts, contactListMembers } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { getOwnerTeamIds, getTeamOwnerId } from "../utils/team-owner.js";
import {
  createEmailQueue,
  createAnalyticsQueue,
  createRedisConnection,
} from "@qwikmailer/queue";
import { checkAndConsumeQuota } from "../utils/quota.js";
import { isRelatedToCompany } from "../utils/validation.js";

import * as XLSX from "xlsx";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const redis = createRedisConnection();
const emailQueue = createEmailQueue(redis);
const analyticsQueue = createAnalyticsQueue(redis);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const sendEmailSchema = z.object({
  to: z.union([
    z.string().email(),
    z.object({ email: z.string().email(), name: z.string().optional() }),
    z.array(z.object({ email: z.string().email(), name: z.string().optional() })),
  ]),
  from: z.string().email().optional(),
  fromName: z.string().optional(),
  subject: z.string().min(1).max(998).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
  replyTo: z.string().email().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 string
    contentType: z.string().optional()
  })).optional(),
}).refine(data => data.subject || data.templateId, {
  message: "Either 'subject' or 'templateId' must be provided",
  path: ["subject"]
}).refine(data => data.html || data.text || data.templateId, {
  message: "Either 'html', 'text', or 'templateId' must be provided",
  path: ["html"]
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function resolveSenderDomain(teamId: string, requestedFrom?: string, requestedFromName?: string) {
  let fromEmail = "";
  let fromName = requestedFromName;
  let replyTo: string | undefined = undefined;

  const ownerId = await getTeamOwnerId(teamId);
  const ownerTeamIds = await getOwnerTeamIds(teamId);

  const userRec = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
  if (requestedFromName && !isRelatedToCompany(userRec?.companyName, requestedFromName)) {
    throw new Error("From name must be related to your company name.");
  }

  let sender: any = null;

  if (requestedFrom) {
    sender = await db.query.domainSenders.findFirst({
      where: and(
        or(
          inArray((domainSenders as any).teamId, ownerTeamIds),
          eq((domainSenders as any).userId, ownerId)
        ),
        eq(domainSenders.email, requestedFrom)
      ),
    });
    if (!sender) {
      throw new Error("Sender identity not found. Please create it first in the dashboard.");
    }
  } else {
    // If not provided, fetch the most recent sender identity
    sender = await db.query.domainSenders.findFirst({
      where: or(
        inArray((domainSenders as any).teamId, ownerTeamIds),
        eq((domainSenders as any).userId, ownerId)
      ),
      orderBy: (senders, { desc }) => [desc(senders.createdAt)],
    });
    if (!sender) {
      throw new Error("You must create a sender identity before sending emails.");
    }
  }

  // Set the resolved sender details
  fromEmail = sender.email;
  
  // Use sender identity fromName if the API didn't explicitly request one
  if (!requestedFromName && sender.fromName) {
    fromName = sender.fromName;
  }
  if (!fromName) {
    fromName = process.env.SMTP_FROM_NAME!;
  }

  if (sender.replyTo) {
    replyTo = sender.replyTo;
  }

  return { fromEmail, fromName, replyTo };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function emailRoutes(app: FastifyInstance) {
  // POST /v1/send
  app.post("/send", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string; plan: string; source?: string };
    const body = sendEmailSchema.parse(req.body);

    // Normalize "to" field
    const toList = Array.isArray(body.to)
      ? body.to
      : typeof body.to === "string"
      ? [{ email: body.to }]
      : [body.to];

    try {
      await checkAndConsumeQuota((req as any).teamId, toList.length);
    } catch (error: any) {
      return reply.code(403).send({ success: false, error: error.message });
    }

    const results = [];
    const batchId = crypto.randomUUID();

    // Fetch template if provided
    let finalSubject = body.subject;
    let finalHtml = body.html;
    let finalText = body.text;

    if (body.templateId) {
      const template = await db.query.templates.findFirst({
        where: and(eq(templates.id, body.templateId), eq((templates as any).teamId, (req as any).teamId))
      });
      if (!template) {
        return reply.code(400).send({ success: false, error: "Template not found" });
      }
      if (!finalSubject) finalSubject = template.subject;
      if (!finalHtml) finalHtml = template.htmlBody;
      if (!finalText && template.textBody) finalText = template.textBody;
    }

    const mergedMetadata = { ...body.metadata, ...body.variables, _source: user.source || "api" };

    if (body.attachments && body.attachments.length > 0) {
      const attachmentsDir = path.join(__dirname, "..", "..", "uploads", "attachments", batchId);
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }
      const savedAttachments = [];
      for (let i = 0; i < body.attachments.length; i++) {
        const att = body.attachments[i];
        const safeName = att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const savePath = path.join(attachmentsDir, `att_${i}_${safeName}`);
        try {
          fs.writeFileSync(savePath, Buffer.from(att.content, 'base64'));
          savedAttachments.push({
            filename: att.filename,
            path: savePath,
            contentType: att.contentType
          });
        } catch (e) {
          console.error("Failed to save attachment", e);
        }
      }
      if (savedAttachments.length > 0) {
        (mergedMetadata as any)._attachments = JSON.stringify(savedAttachments);
      }
    }

    for (const recipient of toList) {
      // Check suppression list
      const suppressed = await db.query.suppressionList.findFirst({
        where: eq(suppressionList.email, recipient.email),
      });
      if (suppressed) {
        results.push({
          email: recipient.email,
          status: "suppressed",
          reason: suppressed.reason,
        });
        continue;
      }

      let senderDetails;
      try {
        senderDetails = await resolveSenderDomain((req as any).teamId, body.from, body.fromName);
      } catch (err: any) {
        return reply.code(400).send({ success: false, error: err.message });
      }
      
      const { fromEmail, fromName, replyTo } = senderDetails;

      const [email] = await db
        .insert(emails)
        .values({
          teamId: (req as any).teamId,
          batchId,
          fromEmail,
          fromName,
          toEmail: recipient.email,
          toName: recipient.name,
          replyTo: body.replyTo ?? replyTo,
          subject: finalSubject!,
          htmlBody: finalHtml,
          textBody: finalText,
          tags: body.tags,
          metadata: mergedMetadata,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          status: body.scheduledAt ? "queued" : "queued",
        })
        .returning();

      // Automatically add/update contact in CRM
      if (recipient.email) {
        const teamId = (req as any).teamId;
        const [firstName, ...lastNameParts] = (recipient.name || "").split(" ");
        const lastName = lastNameParts.join(" ") || undefined;
        const apiTags = body.tags || [];
        
        let tagsSql = sql`COALESCE(${contacts.tags}, '[]'::jsonb)`;
        if (apiTags.length > 0) {
          for (const tag of apiTags) {
             tagsSql = sql`CASE WHEN ${tagsSql} @> ${JSON.stringify([tag])}::jsonb THEN ${tagsSql} ELSE ${tagsSql} || ${JSON.stringify([tag])}::jsonb END`;
          }
        }

        try {
          await db.insert(contacts).values({
            teamId,
            email: recipient.email,
            firstName: firstName || undefined,
            lastName,
            tags: apiTags,
          }).onConflictDoUpdate({
            target: [contacts.teamId, contacts.email],
            set: {
              firstName: firstName || sql`${contacts.firstName}`,
              lastName: lastName || sql`${contacts.lastName}`,
              tags: apiTags.length > 0 ? tagsSql : sql`${contacts.tags}`,
              updatedAt: new Date()
            }
          });
        } catch (e) {
          console.error("Failed to auto-create contact on send", e);
        }
      }

      // Enqueue for sending
      await emailQueue.add(
        "send",
        { emailId: email.id, teamId: (req as any).teamId },
        { delay: body.scheduledAt ? new Date(body.scheduledAt).getTime() - Date.now() : 0 }
      );

      // Record queued event for webhooks
      await analyticsQueue.add("ingest", {
        emailId: email.id,
        teamId: (req as any).teamId,
        type: "queued" as any,
      });

      results.push({ id: email.id, email: recipient.email, status: "queued" });
    }

    return reply.code(202).send({ success: true, data: results });
  });

  // POST /v1/audience-send
  app.post("/audience-send", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string; source?: string };
    const schema = z.object({
      audience: z.object({
        listId: z.string().optional(),
        tag: z.string().optional()
      }).refine(a => a.listId || a.tag, { message: "Either listId or tag must be provided" }),
      from: z.string().email().optional(),
      fromName: z.string().optional(),
      subject: z.string().min(1).max(998).optional(),
      html: z.string().optional(),
      text: z.string().optional(),
      templateId: z.string().uuid().optional(),
      scheduledAt: z.string().datetime().optional(),
      replyTo: z.string().email().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string().optional()
      })).optional(),
    });

    const body = schema.parse(req.body);
    const teamId = (req as any).teamId as string;

    // Fetch contacts
    let conditions = eq(contacts.teamId, teamId);
    if (body.audience.listId) {
      const members = await db.select({ contactId: contactListMembers.contactId })
                              .from(contactListMembers)
                              .where(eq(contactListMembers.listId, body.audience.listId));
      const memberIds = members.map(m => m.contactId);
      if (memberIds.length === 0) return reply.code(400).send({ success: false, error: "Selected list is empty" });
      conditions = and(conditions, inArray(contacts.id, memberIds))! as any;
    }
    if (body.audience.tag) {
      conditions = and(conditions, sql`${contacts.tags} @> ${JSON.stringify([body.audience.tag])}::jsonb`)! as any;
    }

    const audienceContacts = await db.query.contacts.findMany({
      where: conditions,
      columns: { email: true, firstName: true, lastName: true, customFields: true }
    });

    if (audienceContacts.length === 0) {
      return reply.code(400).send({ success: false, error: "No contacts found for the selected audience" });
    }

    try {
      await checkAndConsumeQuota(teamId, audienceContacts.length);
    } catch (error: any) {
      return reply.code(403).send({ success: false, error: error.message });
    }

    let finalSubject = body.subject;
    let finalHtml = body.html;
    let finalText = body.text;

    if (body.templateId) {
      const template = await db.query.templates.findFirst({
        where: and(eq(templates.id, body.templateId), eq((templates as any).teamId, teamId))
      });
      if (!template) return reply.code(400).send({ success: false, error: "Template not found" });
      if (!finalSubject) finalSubject = template.subject;
      if (!finalHtml) finalHtml = template.htmlBody;
      if (!finalText && template.textBody) finalText = template.textBody;
    }

    const batchId = crypto.randomUUID();

    // Attachments handling
    let attachmentsMetadata: string | undefined = undefined;
    if (body.attachments && body.attachments.length > 0) {
      const attachmentsDir = path.join(__dirname, "..", "..", "uploads", "attachments", batchId);
      if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
      const savedAttachments = [];
      for (let i = 0; i < body.attachments.length; i++) {
        const att = body.attachments[i];
        const safeName = att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const savePath = path.join(attachmentsDir, `att_${i}_${safeName}`);
        try {
          fs.writeFileSync(savePath, Buffer.from(att.content, 'base64'));
          savedAttachments.push({ filename: att.filename, path: savePath, contentType: att.contentType });
        } catch (e) {
          console.error("Failed to save attachment", e);
        }
      }
      if (savedAttachments.length > 0) attachmentsMetadata = JSON.stringify(savedAttachments);
    }

    // Process in chunks of 1000
    const CHUNK_SIZE = 1000;
    const jobIds: string[] = [];

    for (let i = 0; i < audienceContacts.length; i += CHUNK_SIZE) {
      const chunk = audienceContacts.slice(i, i + CHUNK_SIZE);
      const insertPayloads = [];

      for (const contact of chunk) {
        if (!contact.email) continue;
        const mergedMetadata = { ...contact.customFields, _source: user.source || "audience-api" };
        if (attachmentsMetadata) (mergedMetadata as any)._attachments = attachmentsMetadata;

        let senderDetails;
        try {
          senderDetails = await resolveSenderDomain(teamId, body.from, body.fromName);
        } catch (err: any) { continue; }

        const { fromEmail, fromName, replyTo } = senderDetails;

        insertPayloads.push({
          teamId,
          batchId,
          fromEmail,
          fromName,
          toEmail: contact.email,
          toName: contact.firstName ? `${contact.firstName} ${contact.lastName || ""}`.trim() : undefined,
          replyTo: body.replyTo ?? replyTo,
          subject: finalSubject!,
          htmlBody: finalHtml,
          textBody: finalText,
          metadata: mergedMetadata,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          status: "queued" as any,
        });
      }

      if (insertPayloads.length > 0) {
        const insertedRows = await db.insert(emails).values(insertPayloads).returning({ id: emails.id });
        const jobs = insertedRows.map(row => ({
          name: "send",
          data: { emailId: row.id, teamId },
          opts: body.scheduledAt ? { delay: new Date(body.scheduledAt).getTime() - Date.now() } : undefined
        }));
        await emailQueue.addBulk(jobs);
        jobIds.push(...insertedRows.map(r => r.id));
      }
    }

    return reply.code(202).send({ success: true, data: { queued: jobIds.length, ids: jobIds } });
  });

  // POST /v1/bulk-send
  app.post("/bulk-send", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string; source?: string };
    const { emails: parsedEmails, audienceTags, ...commonData } = z
      .object({
        emails: z.array(sendEmailSchema).max(50000).optional().default([]),
        audienceTags: z.array(z.string()).optional(),
        from: z.string().email().optional(),
        fromName: z.string().optional(),
        subject: z.string().min(1).max(998).optional(),
        html: z.string().optional(),
        text: z.string().optional(),
        templateId: z.string().uuid().optional(),
        scheduledAt: z.string().datetime().optional(),
        replyTo: z.string().email().optional(),
        metadata: z.record(z.string()).optional(),
        attachments: z.array(z.object({
          filename: z.string(),
          content: z.string(),
          contentType: z.string().optional()
        })).optional(),
      })
      .parse(req.body);

    const teamId = (req as any).teamId as string;
    const emailList = [...parsedEmails];

    if (audienceTags && audienceTags.length > 0) {
      let tagConditions = [];
      for (const tag of audienceTags) {
        tagConditions.push(sql`${contacts.tags} @> ${JSON.stringify([tag])}::jsonb`);
      }
      const audienceContacts = await db.query.contacts.findMany({
        where: and(eq(contacts.teamId, teamId), or(...tagConditions)) as any,
        columns: { email: true, firstName: true, lastName: true, customFields: true }
      });
      for (const contact of audienceContacts) {
        if (!contact.email) continue;
        emailList.push({
          ...commonData,
          to: contact.email,
          name: contact.firstName ? `${contact.firstName} ${contact.lastName || ""}`.trim() : undefined,
          metadata: { ...(commonData.metadata || {}), ...(contact.customFields as object || {}) }
        } as any);
      }
    }

    // Deduplicate by toEmail
    const uniqueEmails = new Map();
    for (const e of emailList) {
       const to = typeof e.to === 'string' ? e.to : Array.isArray(e.to) ? e.to[0]?.email : e.to.email;
       if (to && !uniqueEmails.has(to.toLowerCase())) uniqueEmails.set(to.toLowerCase(), e);
    }
    const finalEmailList = Array.from(uniqueEmails.values());

    if (finalEmailList.length === 0) {
      return reply.code(400).send({ success: false, error: "No recipients provided" });
    }

    try {
      await checkAndConsumeQuota(teamId, finalEmailList.length);
    } catch (error: any) {
      return reply.code(403).send({ success: false, error: error.message });
    }

    const jobIds: string[] = [];
    const batchId = crypto.randomUUID();

    // Process in chunks of 1000 to avoid DB connection limits and memory spikes
    const CHUNK_SIZE = 1000;
    
    for (let i = 0; i < finalEmailList.length; i += CHUNK_SIZE) {
      const chunk = finalEmailList.slice(i, i + CHUNK_SIZE);
      const insertPayloads = [];

      for (const emailData of chunk) {
        const toEmail = typeof emailData.to === "string"
          ? emailData.to
          : Array.isArray(emailData.to)
          ? emailData.to[0]?.email
          : emailData.to.email;

        const toName = typeof emailData.to === "string"
          ? emailData.name
          : Array.isArray(emailData.to)
          ? emailData.to[0]?.name || emailData.name
          : emailData.to.name || emailData.name;

        if (!toEmail) continue;

        let finalSubject = emailData.subject;
        let finalHtml = emailData.html;
        let finalText = emailData.text;

        if (emailData.templateId) {
          const template = await db.query.templates.findFirst({
            where: and(eq(templates.id, emailData.templateId), eq((templates as any).teamId, (req as any).teamId))
          });
          if (!template) continue;
          
          if (!finalSubject) finalSubject = template.subject;
          if (!finalHtml) finalHtml = template.htmlBody;
          if (!finalText && template.textBody) finalText = template.textBody;
        }

        const mergedMetadata = {
          email: toEmail,
          name: toName || "",
          ...emailData.metadata,
          ...emailData.variables,
          _source: user.source || "api"
        };

        let senderDetails;
        try {
          senderDetails = await resolveSenderDomain((req as any).teamId, emailData.from, emailData.fromName);
        } catch (err: any) {
          continue;
        }

        const { fromEmail, fromName, replyTo } = senderDetails;

        insertPayloads.push({
          teamId: (req as any).teamId,
          batchId,
          fromEmail,
          fromName,
          toEmail,
          toName,
          replyTo: emailData.replyTo ?? replyTo,
          subject: finalSubject!,
          htmlBody: finalHtml,
          textBody: finalText,
          tags: emailData.tags,
          metadata: mergedMetadata,
          status: "queued" as any,
        });
      }

      if (insertPayloads.length > 0) {
        // Automatically add/update contacts in CRM for this chunk
        const teamId = (req as any).teamId;
        for (const payload of insertPayloads) {
          const apiTags = payload.tags || [];
          let tagsSql = sql`COALESCE(${contacts.tags}, '[]'::jsonb)`;
          if (apiTags.length > 0) {
            for (const tag of apiTags) {
               tagsSql = sql`CASE WHEN ${tagsSql} @> ${JSON.stringify([tag])}::jsonb THEN ${tagsSql} ELSE ${tagsSql} || ${JSON.stringify([tag])}::jsonb END`;
            }
          }
          try {
            await db.insert(contacts).values({
              teamId,
              email: payload.toEmail,
              tags: apiTags,
            }).onConflictDoUpdate({
              target: [contacts.teamId, contacts.email],
              set: {
                tags: apiTags.length > 0 ? tagsSql : sql`${contacts.tags}`,
                updatedAt: new Date()
              }
            });
          } catch (e) {
            console.error("Failed to auto-create contact on bulk-send", e);
          }
        }

        const insertedRows = await db.insert(emails).values(insertPayloads).returning({ id: emails.id });
        
        const jobs = insertedRows.map(row => ({
          name: "send",
          data: { emailId: row.id, teamId: (req as any).teamId }
        }));
        
        await emailQueue.addBulk(jobs);
        jobIds.push(...insertedRows.map(r => r.id));
      }
    }

    return reply.code(202).send({
      success: true,
      data: { queued: jobIds.length, ids: jobIds },
    });
  });

  // GET /v1/logs/batches
  app.get("/logs/batches", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(20),
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(req.query);

    const offset = (query.page - 1) * query.limit;

    let havingClause = sql``;
    if (query.status && query.status !== "all") {
      const s = query.status === "scheduled" ? "queued" : query.status;
      havingClause = sql`HAVING COUNT(*) FILTER (WHERE status = ${s}) > 0`;
    }

    let whereClause = sql`team_id = ${(req as any).teamId}`;
    if (query.search) {
      whereClause = sql`${whereClause} AND (batch_id ILIKE ${'%' + query.search + '%'} OR subject ILIKE ${'%' + query.search + '%'})`;
    }
    if (query.dateFrom) {
      const from = new Date(query.dateFrom + "T00:00:00+05:30");
      if (!isNaN(from.getTime())) {
        whereClause = sql`${whereClause} AND created_at >= ${from.toISOString()}`;
      }
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo + "T23:59:59.999+05:30");
      if (!isNaN(to.getTime())) {
        whereClause = sql`${whereClause} AND created_at <= ${to.toISOString()}`;
      }
    }

    const result = await db.execute(sql`
      SELECT 
        batch_id as id,
        MAX(subject) as subject,
        MIN(created_at) as "createdAt",
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        COUNT(*) FILTER (WHERE status = 'complained') as complained,
        COUNT(*) FILTER (WHERE status = 'sending') as sending,
        SUM(open_count) as "openCount",
        SUM(click_count) as "clickCount"
      FROM emails
      WHERE ${whereClause}
      GROUP BY batch_id
      ${havingClause}
      ORDER BY MIN(created_at) DESC
      LIMIT ${query.limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT batch_id
        FROM emails
        WHERE ${whereClause}
        GROUP BY batch_id
        ${havingClause}
      ) as sub
    `);
    const total = Number(countResult[0]?.count || 0);

    const items = result.map((row: any) => ({
      ...row,
      total: Number(row.total || 0),
      delivered: Number(row.delivered || 0),
      failed: Number(row.failed || 0),
      queued: Number(row.queued || 0),
      bounced: Number(row.bounced || 0),
      complained: Number(row.complained || 0),
      sending: Number(row.sending || 0),
      openCount: Number(row.openCount || 0),
      clickCount: Number(row.clickCount || 0),
    }));

    return reply.send({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        limit: query.limit,
        hasMore: offset + items.length < total,
      },
    });
  });

  // GET /v1/logs/batches/:batchId/emails
  app.get("/logs/batches/:batchId/emails", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { batchId } = req.params as { batchId: string };
    
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(20),
        status: z.string().optional(),
        search: z.string().optional(),
        fromEmail: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        messageId: z.string().optional(),
      })
      .parse(req.query);

    const offset = (query.page - 1) * query.limit;

    let whereClause: any = and(eq((emails as any).teamId, (req as any).teamId), eq(emails.batchId, batchId));

    if (query.status && query.status !== "all") {
      whereClause = and(whereClause, eq(emails.status, query.status as any));
    }
    
    if (query.fromEmail) {
      whereClause = and(whereClause, sql`${emails.fromEmail} ILIKE ${`%${query.fromEmail}%`}`);
    }

    if (query.messageId) {
      whereClause = and(whereClause, sql`${emails.messageId} ILIKE ${`%${query.messageId}%`}`);
    }

    if (query.dateFrom) {
      whereClause = and(whereClause, sql`${emails.createdAt} >= ${new Date(query.dateFrom + "T00:00:00+05:30")}`);
    }

    if (query.dateTo) {
      whereClause = and(whereClause, sql`${emails.createdAt} <= ${new Date(query.dateTo + "T23:59:59.999+05:30")}`);
    }

    if (query.search) {
      whereClause = and(
        whereClause,
        sql`(${emails.toEmail} ILIKE ${`%${query.search}%`} OR ${emails.subject} ILIKE ${`%${query.search}%`})`
      );
    }

    const emailList = await db.query.emails.findMany({
      where: whereClause,
      orderBy: desc(emails.createdAt),
      limit: query.limit,
      offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(whereClause);

    return reply.send({
      success: true,
      data: {
        items: emailList,
        total: Number(count),
        page: query.page,
        limit: query.limit,
        hasMore: offset + emailList.length < Number(count),
      },
    });
  });

  // GET /v1/logs
  app.get("/logs", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(20),
        status: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(req.query);

    const offset = (query.page - 1) * query.limit;

    let whereClause: any = eq((emails as any).teamId, (req as any).teamId);

    if (query.status) {
      whereClause = and(whereClause, eq(emails.status, query.status as any));
    }

    if (query.search) {
      whereClause = and(
        whereClause,
        sql`${emails.toEmail} ILIKE ${`%${query.search}%`} OR ${emails.subject} ILIKE ${`%${query.search}%`}`
      );
    }

    const emailList = await db.query.emails.findMany({
      where: whereClause,
      orderBy: desc(emails.createdAt),
      limit: query.limit,
      offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(whereClause);

    return reply.send({
      success: true,
      data: {
        items: emailList,
        total: Number(count),
        page: query.page,
        limit: query.limit,
        hasMore: offset + emailList.length < Number(count),
      },
    });
  });

  // GET /v1/logs/:id
  app.get("/logs/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const email = await db.query.emails.findFirst({
      where: and(eq(emails.id, id), eq((emails as any).teamId, (req as any).teamId)),
      with: { events: true } as never,
    });

    if (!email) return reply.code(404).send({ success: false, error: "Email not found" });

    return reply.send({ success: true, data: email });
  });

  // POST /v1/logs/:id/cancel
  app.post("/logs/:id/cancel", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const email = await db.query.emails.findFirst({
      where: and(eq(emails.id, id), eq((emails as any).teamId, (req as any).teamId)),
    });

    if (!email) {
      return reply.code(404).send({ success: false, error: "Email not found" });
    }

    if (email.status !== "queued") {
      return reply.code(400).send({ success: false, error: "Only queued emails can be cancelled" });
    }

    await db.update(emails)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(emails.id, id));

    return reply.send({ success: true, data: { message: "Email cancelled successfully" } });
  });

  // POST /v1/logs/batches/:batchId/cancel
  app.post("/logs/batches/:batchId/cancel", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { batchId } = req.params as { batchId: string };

    await db.update(emails)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(emails.batchId, batchId), eq((emails as any).teamId, (req as any).teamId), eq(emails.status, "queued")));

    return reply.send({ success: true, data: { message: "Batch cancelled successfully" } });
  });

  // ─── Excel Bulk Upload ────────────────────────────────────────────────────────

  // POST /v1/bulk-preview — parse Excel and return rows without sending
  app.post("/bulk-preview", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const parts = req.parts();
    let listId = "";

    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "listId") listId = part.value as string;
    }

    if (!listId) return reply.code(400).send({ success: false, error: "listId is required." });

    const list = await db.query.contactLists.findFirst({
      where: and(eq(contactLists.id, listId), eq(contactLists.teamId, (req as any).teamId as string)),
    });

    if (!list) return reply.code(404).send({ success: false, error: "List not found." });

    // Path traversal protection
    const safeFileUrl = list.fileUrl.replace(/\.\./g, '');
    if (!safeFileUrl.startsWith('/uploads/lists/')) {
      return reply.code(400).send({ success: false, error: "Invalid file path." });
    }
    const filePath = path.join(__dirname, '..', '..', safeFileUrl);
    if (!fs.existsSync(filePath)) {
      return reply.code(400).send({ success: false, error: "File not found on server." });
    }

    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return reply.code(400).send({ success: false, error: "The file is empty or has no data rows." });
    }
    if (rows.length > 50000) {
      return reply.code(400).send({ success: false, error: "Maximum 50,000 rows allowed per upload." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: { name: string; email: string; [key: string]: string }[] = [];
    const invalid: { row: number; reason: string; data: Record<string, string> }[] = [];

    rows.forEach((row, idx) => {
      // Accept common column name variations
      const email = (row["email"] || row["Email"] || row["EMAIL"] || row["e-mail"] || "").toString().trim();
      const name = (row["name"] || row["Name"] || row["NAME"] || row["full_name"] || row["FullName"] || "").toString().trim();

      if (!email) {
        invalid.push({ row: idx + 2, reason: "Missing email", data: row });
      } else if (!emailRegex.test(email)) {
        invalid.push({ row: idx + 2, reason: `Invalid email: "${email}"`, data: row });
      } else {
        valid.push({ name, email, ...row });
      }
    });

    return reply.send({
      success: true,
      data: {
        total: rows.length,
        valid: valid.length,
        invalid: invalid.length,
        recipients: valid,
        errors: invalid.slice(0, 20), // return first 20 errors max
        columns: Object.keys(rows[0] ?? {}),
      },
    });
  });

  // POST /v1/bulk-upload — parse Excel, compose and send all emails
  app.post("/bulk-upload", { preHandler: [authenticate, requireTeamRole(["owner", "admin", "member"])] }, async (req, reply) => {
    const user = req.user as { sub: string };

    const parts = req.parts();
    let subject = "";
    let htmlBody = "";
    let textBody = "";
    let listId = "";
    let certificateId = "";

    let from = "";
    let fromName = "";
    let replyTo = "";
    let scheduledAt = "";

    let attachmentsStr = "";

    for await (const part of parts) {
      if (part.type !== "file") {
        const val = part.value as string;
        if (part.fieldname === "subject") subject = val;
        if (part.fieldname === "htmlBody") htmlBody = val;
        if (part.fieldname === "textBody") textBody = val;
        if (part.fieldname === "listId") listId = val;
        if (part.fieldname === "certificateId") certificateId = val;
        if (part.fieldname === "from") from = val;
        if (part.fieldname === "fromName") fromName = val;
        if (part.fieldname === "replyTo") replyTo = val;
        if (part.fieldname === "attachments") attachmentsStr = val;
        if (part.fieldname === "scheduledAt") scheduledAt = val;
      }
    }

    if (!listId) return reply.code(400).send({ success: false, error: "listId is required." });
    if (!subject) return reply.code(400).send({ success: false, error: "Email subject is required." });
    if (!htmlBody && !textBody) return reply.code(400).send({ success: false, error: "Email body (HTML or text) is required." });

    const list = await db.query.contactLists.findFirst({
      where: and(eq(contactLists.id, listId), eq(contactLists.teamId, (req as any).teamId as string)),
    });

    if (!list) return reply.code(404).send({ success: false, error: "List not found." });

    // Path traversal protection
    const safeFileUrl2 = list.fileUrl.replace(/\.\./g, '');
    if (!safeFileUrl2.startsWith('/uploads/lists/')) {
      return reply.code(400).send({ success: false, error: "Invalid file path." });
    }
    const filePath = path.join(__dirname, '..', '..', safeFileUrl2);
    if (!fs.existsSync(filePath)) {
      return reply.code(400).send({ success: false, error: "File not found on server." });
    }

    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

    if (rows.length === 0) return reply.code(400).send({ success: false, error: "File is empty." });
    if (rows.length > 50000) return reply.code(400).send({ success: false, error: "Maximum 50,000 rows per upload." });

    try {
      await checkAndConsumeQuota((req as any).teamId, rows.length);
    } catch (error: any) {
      return reply.code(403).send({ success: false, error: error.message });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const queued: string[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const batchId = crypto.randomUUID();

    let senderDetails;
    try {
      senderDetails = await resolveSenderDomain((req as any).teamId, from || undefined, fromName || undefined);
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }

    // Process in chunks of 1000 to avoid DB connection limits and memory spikes
    const CHUNK_SIZE = 1000;
    
    // Process attachments
    let attachmentsMetadata: string | undefined = undefined;
    if (attachmentsStr) {
      try {
        const atts = JSON.parse(attachmentsStr);
        if (Array.isArray(atts) && atts.length > 0) {
          const attachmentsDir = path.join(__dirname, "..", "..", "uploads", "attachments", batchId);
          if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
          }
          const savedAttachments = [];
          for (let i = 0; i < atts.length; i++) {
            const att = atts[i];
            const safeName = att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const savePath = path.join(attachmentsDir, `att_${i}_${safeName}`);
            try {
              fs.writeFileSync(savePath, Buffer.from(att.content, 'base64'));
              savedAttachments.push({
                filename: att.filename,
                path: savePath,
                contentType: att.contentType
              });
            } catch (e) {
              console.error("Failed to save bulk attachment", e);
            }
          }
          if (savedAttachments.length > 0) {
            attachmentsMetadata = JSON.stringify(savedAttachments);
          }
        }
      } catch (e) {
        console.error("Failed to parse attachments JSON", e);
      }
    }

    // Respond immediately to prevent the frontend request from hanging
    reply.code(202).send({
      success: true,
      data: {
        batchId,
        queued: 0,
        skipped: 0,
        total: rows.length,
        skippedDetails: [],
      },
    });

    // Background processing
    Promise.resolve().then(async () => {
      try {
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const validEmailsInChunk = new Map<string, any>();
      
      for (const row of chunk) {
        const toEmail = (row["email"] || row["Email"] || row["EMAIL"] || row["e-mail"] || "").toString().trim();
        const toName = (row["name"] || row["Name"] || row["NAME"] || row["full_name"] || "").toString().trim();

        if (!toEmail || !emailRegex.test(toEmail)) {
          skipped.push({ email: toEmail || "(empty)", reason: "Invalid or missing email" });
          continue;
        }
        validEmailsInChunk.set(toEmail, { toEmail, toName, row });
      }

      const emailAddresses = Array.from(validEmailsInChunk.keys());
      if (emailAddresses.length === 0) continue;

      // Bulk check suppression
      const suppressedRecords = await db.select({ email: suppressionList.email, reason: suppressionList.reason })
        .from(suppressionList)
        .where(inArray(suppressionList.email, emailAddresses));
        
      const suppressedMap = new Map(suppressedRecords.map(s => [s.email, s.reason]));

      const insertPayloads = [];

      for (const { toEmail, toName, row } of validEmailsInChunk.values()) {
        if (suppressedMap.has(toEmail)) {
          skipped.push({ email: toEmail, reason: `Suppressed: ${suppressedMap.get(toEmail)}` });
          continue;
        }

        const vars: Record<string, string> = { name: toName, email: toEmail, ...row };
        const personalisedHtml = htmlBody.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
        const personalisedText = textBody.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

        insertPayloads.push({
          teamId: (req as any).teamId,
          batchId,
          fromEmail: senderDetails.fromEmail,
          fromName: senderDetails.fromName,
          replyTo: replyTo || senderDetails.replyTo,
          toEmail,
          toName: toName || null,
          subject,
          htmlBody: personalisedHtml,
          textBody: personalisedText || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          status: "queued" as any,
          tags: ["bulk-upload"],
          metadata: { ...(req as any).baseMetadata, ...vars } as any,
        });
      }

      if (insertPayloads.length > 0) {
        const insertedRows = await db.insert(emails).values(insertPayloads).returning({ id: emails.id });
        
        const delay = scheduledAt ? new Date(scheduledAt).getTime() - Date.now() : 0;
        
        const jobs = insertedRows.map(row => ({
          name: "send",
          data: { emailId: row.id, teamId: (req as any).teamId },
          opts: { delay: delay > 0 ? delay : 0 }
        }));
        
        await emailQueue.addBulk(jobs);
        queued.push(...insertedRows.map(r => r.id));
      }
      }
      } catch (err) {
        console.error("[BulkUpload] Background processing error:", err);
      }
    });
  });
}

