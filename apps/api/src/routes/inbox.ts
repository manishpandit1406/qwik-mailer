import type { FastifyInstance } from "fastify";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { db, domainSenders, emailTrackingLogs, emailClickLogs, emails } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { GoogleGenAI } from "@google/genai";
import { createEmailQueue, createRedisConnection } from "@qwikmailer/queue";
import { resolveSenderDomain } from "./emails.js";
import { getOwnerTeamIds, getTeamOwnerId } from "../utils/team-owner.js";
import crypto from "crypto";

const redis = createRedisConnection();
const emailQueue = createEmailQueue(redis);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function inboxRoutes(app: FastifyInstance) {
  // 1. List Sender Identities for the active team (used as Inbox mailboxes)
  app.get("/identities", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    if (!teamId) return reply.send({ identities: [] });

    try {
      const ownerId = await getTeamOwnerId(teamId);
      const ownerTeamIds = await getOwnerTeamIds(teamId);

      const senders = await db.query.domainSenders.findMany({
        where: or(
          inArray((domainSenders as any).teamId, ownerTeamIds),
          eq((domainSenders as any).userId, ownerId)
        ),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
        with: {
          domain: true,
        } as any,
      });

      return reply.send({
        identities: senders.map((s) => ({
          id: s.id,
          email: s.email,
          fromName: s.fromName || s.nickname || "Sender Identity",
          replyTo: s.replyTo || s.email,
          nickname: s.nickname,
          domain: (s as any).domain?.domain || "",
          isVerified: (s as any).domain?.status === "verified",
          createdAt: s.createdAt,
        })),
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch identities", identities: [] });
    }
  });

  // 2. Fetch emails for a specific sender identity (or team fallback)
  app.get("/emails", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { identityId, senderId, accountId, folder = "INBOX" } = req.query as {
      identityId?: string;
      senderId?: string;
      accountId?: string;
      folder?: string;
    };

    const targetId = identityId || senderId || accountId;

    try {
      let targetEmail = "";
      if (targetId && targetId !== "team") {
        const sender = await db.query.domainSenders.findFirst({
          where: or(
            eq(domainSenders.id, targetId),
            eq(domainSenders.email, targetId)
          ),
        });
        if (sender) {
          targetEmail = sender.email.toLowerCase().trim();
        }
      }

      let whereSql;
      if (targetEmail) {
        const altEmail = targetEmail.endsWith("@mail.qwikmailer.in")
          ? targetEmail.replace(/@mail\.qwikmailer\.in$/i, "@qwikmailer.in")
          : targetEmail.endsWith("@qwikmailer.in")
          ? targetEmail.replace(/@qwikmailer\.in$/i, "@mail.qwikmailer.in")
          : targetEmail;

        if (folder.toLowerCase() === "sent") {
          whereSql = sql`
            team_id = ${teamId}
            AND (
              LOWER(from_email) = ${targetEmail} OR LOWER(from_email) = ${altEmail}
            )
          `;
        } else if (folder.toLowerCase() === "received") {
          whereSql = sql`
            team_id = ${teamId}
            AND (
              LOWER(to_email) = ${targetEmail} OR LOWER(to_email) = ${altEmail}
              OR LOWER(reply_to) = ${targetEmail} OR LOWER(reply_to) = ${altEmail}
            )
          `;
        } else if (folder.toLowerCase() === "starred") {
          whereSql = sql`
            team_id = ${teamId}
            AND (
              LOWER(from_email) = ${targetEmail} OR LOWER(from_email) = ${altEmail}
              OR LOWER(to_email) = ${targetEmail} OR LOWER(to_email) = ${altEmail}
              OR LOWER(reply_to) = ${targetEmail} OR LOWER(reply_to) = ${altEmail}
            )
            AND metadata->>'starred' = 'true'
          `;
        } else {
          // Default: all conversations for this identity
          whereSql = sql`
            team_id = ${teamId}
            AND (
              LOWER(from_email) = ${targetEmail} OR LOWER(from_email) = ${altEmail}
              OR LOWER(to_email) = ${targetEmail} OR LOWER(to_email) = ${altEmail}
              OR LOWER(reply_to) = ${targetEmail} OR LOWER(reply_to) = ${altEmail}
            )
          `;
        }
      } else {
        if (folder.toLowerCase() === "sent") {
          whereSql = sql`team_id = ${teamId} AND status IN ('delivered', 'sent', 'queued')`;
        } else if (folder.toLowerCase() === "starred") {
          whereSql = sql`team_id = ${teamId} AND metadata->>'starred' = 'true'`;
        } else {
          whereSql = sql`team_id = ${teamId}`;
        }
      }

      const rowsResult = await db.execute(sql`
        SELECT id as uid, subject, from_email as "from", from_name as "fromName",
               to_email as "to", created_at as date, status, html_body as html, text_body as text,
               open_count, click_count, reply_to as "replyTo", metadata
        FROM emails
        WHERE ${whereSql}
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const rows = (rowsResult as any).rows || rowsResult || [];

      return {
        emails: rows.map((r: any) => ({
          uid: r.uid,
          subject: r.subject || "No Subject",
          from: r.from,
          fromName: r.fromName,
          to: r.to,
          replyTo: r.replyTo,
          date: r.date,
          flags: r.status === "delivered" ? ["\\Seen"] : [],
          status: r.status,
          openCount: r.open_count,
          clickCount: r.click_count,
          isStarred: r.metadata?.starred === "true",
          direction:
            targetEmail && (r.from?.toLowerCase() === targetEmail || r.from?.toLowerCase().includes("qwikmailer"))
              ? "outbound"
              : "inbound",
        })),
      };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch emails", emails: [] });
    }
  });

  // 3. Send an email using the selected Sender Identity
  app.post("/send", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { identityId, senderId, accountId, to, subject, text, html } = req.body as any;

    if (!to || !subject) {
      return reply.code(400).send({ error: "Missing required fields (to, subject)" });
    }

    const sid = identityId || senderId || accountId;
    let sender: any = null;

    if (sid && sid !== "team") {
      sender = await db.query.domainSenders.findFirst({
        where: or(
          eq(domainSenders.id, sid),
          eq(domainSenders.email, sid)
        ),
      });
    }

    if (!sender) {
      try {
        const resolved = await resolveSenderDomain(teamId);
        sender = {
          id: "",
          email: resolved.fromEmail,
          fromName: resolved.fromName,
          replyTo: resolved.replyTo,
        };
      } catch (err: any) {
        return reply.code(400).send({
          error: "No verified sender identity found. Please create one in Sender Identities.",
        });
      }
    }

    const fromEmail = sender.email;
    const fromName = sender.fromName || sender.nickname;
    const replyTo = sender.replyTo || sender.email;
    const batchId = crypto.randomUUID();

    let finalHtml = html;
    if (!finalHtml && text) {
      finalHtml = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
    }

    try {
      const [emailRecord] = await db
        .insert(emails)
        .values({
          teamId,
          batchId,
          fromEmail,
          fromName,
          toEmail: to,
          replyTo,
          subject,
          htmlBody: finalHtml || "",
          textBody: text || "",
          metadata: { _source: "inbox", identityId: sender.id || "" },
          status: "queued" as any,
        })
        .returning();

      await emailQueue.add("send", { emailId: emailRecord.id, teamId });
      return { success: true, messageId: emailRecord.id };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: err.message || "Failed to send email" });
    }
  });

  // 4. Fetch a specific email details
  app.get("/email", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { uid } = req.query as { uid: string };

    if (!uid) {
      return reply.code(400).send({ error: "Missing uid" });
    }

    try {
      const [emailRow] = await db
        .select()
        .from(emails)
        .where(and(eq(emails.id, uid), eq(emails.teamId, teamId)));

      if (!emailRow) return reply.code(404).send({ error: "Email not found" });

      const trackingLogs = await db
        .select()
        .from(emailTrackingLogs)
        .where(eq(emailTrackingLogs.messageId, emailRow.id));

      const clickLogs = await db
        .select()
        .from(emailClickLogs)
        .where(eq(emailClickLogs.messageId, emailRow.id));

      let finalHtml =
        emailRow.htmlBody ||
        (emailRow.textBody
          ? `<pre style="white-space: pre-wrap; font-family: inherit;">${emailRow.textBody}</pre>`
          : "<i>No content</i>");

      return {
        success: true,
        email: {
          uid: emailRow.id,
          html: finalHtml,
          text: emailRow.textBody,
          to: emailRow.toEmail,
          from: emailRow.fromEmail,
          fromName: emailRow.fromName,
          replyTo: emailRow.replyTo,
          subject: emailRow.subject,
          status: emailRow.status,
          date: emailRow.createdAt,
          openCount: emailRow.openCount,
          clickCount: emailRow.clickCount,
          attachments: [],
          trackingLogs,
          clickLogs,
        },
      };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch email" });
    }
  });

  // 5. Toggle Star on Email
  app.post("/star", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { uid, starred } = req.body as { uid: string; starred: boolean };

    if (!uid) return reply.code(400).send({ error: "Missing uid" });

    try {
      const [emailRow] = await db
        .select()
        .from(emails)
        .where(and(eq(emails.id, uid), eq(emails.teamId, teamId)));

      if (!emailRow) return reply.code(404).send({ error: "Email not found" });

      const currentMeta = (emailRow.metadata as any) || {};
      const updatedMeta = { ...currentMeta, starred: starred ? "true" : "false" };

      await db
        .update(emails)
        .set({ metadata: updatedMeta, updatedAt: new Date() })
        .where(eq(emails.id, uid));

      return { success: true };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to star email" });
    }
  });

  // 6. Tracking Endpoints
  app.get("/track/:messageId.png", async (req, reply) => {
    const { messageId } = req.params as { messageId: string };
    const ipAddress = req.ip || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"] || "";

    try {
      await db.insert(emailTrackingLogs).values({
        messageId,
        ipAddress,
        userAgent,
      });
    } catch (e) {
      req.log.error(e);
    }

    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );
    reply.header("Content-Type", "image/png");
    reply.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return reply.send(pixel);
  });

  app.get("/click/:messageId", async (req, reply) => {
    const { messageId } = req.params as { messageId: string };
    const { url } = req.query as { url: string };
    const ipAddress = req.ip || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"] || "";

    if (!url) {
      return reply.code(400).send({ error: "Missing redirect URL" });
    }

    try {
      await db.insert(emailClickLogs).values({
        messageId,
        url,
        ipAddress,
        userAgent,
      });
    } catch (e) {
      req.log.error(e);
    }

    return reply.redirect(url);
  });

  // 7. QwikAI - Summarize Email (supports both /ai-summary and /ai/summarize)
  const handleAiSummary = async (req: any, reply: any) => {
    const { text, content } = req.body as { text?: string; content?: string };
    const input = text || content;
    if (!input) return reply.code(400).send({ error: "Missing content" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Summarize the following email in exactly 3 bullet points. Be concise and professional:\n\n${input}`,
      });
      return { success: true, summary: response.text };
    } catch (e: any) {
      req.log.error(e);
      return reply.code(500).send({ error: "Failed to generate summary" });
    }
  };

  app.post("/ai-summary", { preHandler: authenticate }, handleAiSummary);
  app.post("/ai/summarize", { preHandler: authenticate }, handleAiSummary);

  // 8. QwikAI - Smart Reply (supports both /ai-reply and /ai/reply)
  const handleAiReply = async (req: any, reply: any) => {
    const { text, content } = req.body as { text?: string; content?: string };
    const input = text || content;
    if (!input) return reply.code(400).send({ error: "Missing content" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an AI assistant helping a professional reply to an email. Generate 3 short, distinct, professional reply options to this email. Format them as a JSON array of strings.\n\nEmail:\n${input}`,
      });

      const jsonText = response.text?.replace(/```json/g, "").replace(/```/g, "") || "[]";
      let replies = [];
      try {
        replies = JSON.parse(jsonText);
      } catch (e) {
        replies = [response.text];
      }

      return { success: true, replies };
    } catch (e: any) {
      req.log.error(e);
      return reply.code(500).send({ error: "Failed to generate replies" });
    }
  };

  app.post("/ai-reply", { preHandler: authenticate }, handleAiReply);
  app.post("/ai/reply", { preHandler: authenticate }, handleAiReply);
}
