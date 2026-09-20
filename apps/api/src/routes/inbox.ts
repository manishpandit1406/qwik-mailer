import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db, connectedMailAccounts, emailTrackingLogs, emailClickLogs } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { ImapFlow } from "imapflow";
import * as nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const imapClients = new Map<string, ImapFlow>();

async function getImapClient(account: any): Promise<ImapFlow> {
  const cacheKey = account.id;
  let client = imapClients.get(cacheKey);

  if (client && client.usable) {
    return client;
  }

  // Cleanup old dead client if exists
  if (client) {
    try { await client.logout(); } catch (e) {}
    imapClients.delete(cacheKey);
  }

  client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.appPassword
    },
    logger: false,
    tls: { rejectUnauthorized: false }
  });

  await client.connect();
  imapClients.set(cacheKey, client);
  
  client.on('close', () => imapClients.delete(cacheKey));
  client.on('error', () => {
    imapClients.delete(cacheKey);
    try { client!.close(); } catch(e) {}
  });

  return client;
}

export async function inboxRoutes(app: FastifyInstance) {
  // 1. Connect a new account
  app.post("/connect", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userId = (req.user as any).sub || (req.user as any).id;
    const { provider, emailAddress, imapHost, imapPort, smtpHost, smtpPort, appPassword } = req.body as any;

    if (!provider || !emailAddress || !appPassword) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    try {
      // Test IMAP connection
      if (imapHost) {
        const client = new ImapFlow({
          host: imapHost,
          port: imapPort || 993,
          secure: true,
          auth: {
            user: emailAddress,
            pass: appPassword
          },
          logger: false
        });
        await client.connect();
        await client.logout();
      }

      // Store in DB
      const [account] = await db.insert(connectedMailAccounts).values({
        teamId,
        userId,
        provider,
        emailAddress,
        imapHost,
        imapPort: imapPort || 993,
        smtpHost,
        smtpPort: smtpPort || 465,
        appPassword, // Note: In production this should be encrypted
      }).returning();

      return { success: true, account };
    } catch (err: any) {
      req.log.error(err);
      
      let errorMessage = err.message;
      if (errorMessage === "Command failed" || errorMessage.includes("Authentication")) {
        errorMessage = "Authentication failed. Please ensure you are using a valid App Password (16 characters for Gmail) and IMAP is enabled in your settings.";
      }
      
      return reply.code(500).send({ 
        error: "Failed to connect account: " + errorMessage,
        details: err.responseText || err.responseStatus 
      });
    }
  });

  // 2. List connected accounts
  app.get("/accounts", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userId = (req.user as any).sub || (req.user as any).id;

    const accounts = await db.select({
      id: connectedMailAccounts.id,
      provider: connectedMailAccounts.provider,
      emailAddress: connectedMailAccounts.emailAddress,
      isActive: connectedMailAccounts.isActive,
    }).from(connectedMailAccounts)
      .where(and(eq(connectedMailAccounts.teamId, teamId), eq(connectedMailAccounts.userId, userId)));

    return { accounts };
  });

  // 3. Fetch emails for an account
  app.get("/emails", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const userId = (req.user as any).sub || (req.user as any).id;
    const { accountId, folder = "INBOX" } = req.query as { accountId: string; folder?: string };

    if (!accountId) {
      return reply.code(400).send({ error: "Missing accountId" });
    }

    const [account] = await db.select().from(connectedMailAccounts).where(and(
      eq(connectedMailAccounts.id, accountId),
      eq(connectedMailAccounts.userId, userId)
    ));

    if (!account || !account.imapHost || !account.appPassword) {
      return reply.code(404).send({ error: "Account not found or missing IMAP config" });
    }

    const client = await getImapClient(account);

    try {
      const lock = await client.getMailboxLock(folder);
      
      const emails = [];
      try {
        const total = client.mailbox.exists;
        if (total > 0) {
          const start = Math.max(1, total - 19);
          for await (let message of client.fetch(`${start}:*`, { envelope: true, flags: true }, { uid: true })) {
              emails.push({
                uid: message.uid,
                subject: message.envelope.subject,
                from: message.envelope.from[0]?.address,
                fromName: message.envelope.from[0]?.name,
                to: message.envelope.to ? message.envelope.to.map(t => t.address).join(', ') : '',
                date: message.envelope.date,
                flags: Array.from(message.flags || []),
              });
          }
        }
      } finally {
        lock.release();
      }

      // Reverse to get newest first
      return { emails: emails.reverse() };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch emails" });
    }
  });

  // 4. Send an email
  app.post("/send", { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub || (req.user as any).id;
    const { accountId, to, subject, text, html } = req.body as any;

    if (!accountId || !to || !subject) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const [account] = await db.select().from(connectedMailAccounts).where(and(
      eq(connectedMailAccounts.id, accountId),
      eq(connectedMailAccounts.userId, userId)
    ));

    if (!account || !account.smtpHost || !account.appPassword) {
      return reply.code(404).send({ error: "Account not found or missing SMTP config" });
    }

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: account.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: account.emailAddress,
        pass: account.appPassword,
      },
    });

    try {
      const isProd = process.env.NODE_ENV === 'production';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || (isProd ? 'https://api.qwikmailer.in' : 'http://localhost:4000');
      
      const generatedMessageId = require('crypto').randomUUID();
      const trackingUrl = `${baseUrl}/v1/inbox/track/${generatedMessageId}.png`;
      const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
      
      let baseHtml = html;
      if (!baseHtml && text) {
        baseHtml = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\n/g, "<br>");
          
        // Auto-linkify raw URLs in text-only emails so they can be tracked
        baseHtml = baseHtml.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
          return `<a href="${url}">${url}</a>`;
        });
      }

      // Rewrite links for click tracking
      const clickTrackingUrlBase = `${baseUrl}/v1/inbox/click/${generatedMessageId}?url=`;
      if (baseHtml) {
        baseHtml = baseHtml.replace(/href=["'](https?:\/\/[^"']+)["']/gi, (match, url) => {
          return `href="${clickTrackingUrlBase}${encodeURIComponent(url)}"`;
        });
      }

      const finalHtml = baseHtml ? `${baseHtml}${trackingPixel}` : trackingPixel;

      const info = await transporter.sendMail({
        from: `"${account.emailAddress}" <${account.emailAddress}>`,
        to,
        subject,
        text,
        html: finalHtml,
        messageId: `${generatedMessageId}@qwikmailer.in`,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to send email" });
    }
  });

  // 5. Fetch a specific email's body
  app.get("/email", { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub || (req.user as any).id;
    const { accountId, uid, folder = "INBOX" } = req.query as { accountId: string; uid: string; folder?: string };

    if (!accountId || !uid) {
      return reply.code(400).send({ error: "Missing accountId or uid" });
    }

    const [account] = await db.select().from(connectedMailAccounts).where(and(
      eq(connectedMailAccounts.id, accountId),
      eq(connectedMailAccounts.userId, userId)
    ));

    if (!account || !account.imapHost || !account.appPassword) {
      return reply.code(404).send({ error: "Account not found or missing IMAP config" });
    }

    const client = await getImapClient(account);

    try {
      const lock = await client.getMailboxLock(folder);
      
      let parsedMessage = null;
      try {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        if (message && message.source) {
          parsedMessage = await simpleParser(message.source);
        }
      } finally {
        lock.release();
      }

      if (!parsedMessage) {
        return reply.code(404).send({ error: "Email not found" });
      }

      let trackingLogs: any[] = [];
      let clickLogs: any[] = [];
      
      let msgId = parsedMessage.messageId ? parsedMessage.messageId.replace('@qwikmailer.in', '').replace(/<|>/g, '') : null;
      
      let finalHtml = parsedMessage.html || parsedMessage.textAsHtml;
      let toField = parsedMessage.to ? (Array.isArray(parsedMessage.to) ? parsedMessage.to.map(t => t.text).join(', ') : parsedMessage.to.text) : '';
      
      // Try to extract from pixel if present
      const rawHtml = finalHtml || '';
      const pixelMatch = rawHtml.match(/\/track\/([a-z0-9-]+)\.png/);
      if (pixelMatch) {
        msgId = pixelMatch[1];
      }
      
      req.log.info({
        originalMessageId: parsedMessage.messageId,
        rawHtmlLength: rawHtml.length,
        pixelMatchFound: !!pixelMatch,
        extractedMsgId: msgId
      });

      if (msgId) {
        trackingLogs = await db.select().from(emailTrackingLogs).where(eq(emailTrackingLogs.messageId, msgId));
        clickLogs = await db.select().from(emailClickLogs).where(eq(emailClickLogs.messageId, msgId));
        
        // Strip tracking pixel so the sender viewing their own email doesn't trigger an open
        if (finalHtml) {
          const pixelRegex = new RegExp(`<img[^>]*src=["'][^"']*\\/track\\/${msgId}\\.png["'][^>]*>`, "gi");
          finalHtml = finalHtml.replace(pixelRegex, "");

          // Revert click URLs so the sender doesn't trigger a click log when testing links
          const clickUrlPrefixRegex = new RegExp(`href=["'][^"']*\\/click\\/${msgId}\\?url=([^"']+)["']`, "gi");
          finalHtml = finalHtml.replace(clickUrlPrefixRegex, (match, encodedUrl) => {
            try {
              return `href="${decodeURIComponent(encodedUrl)}"`;
            } catch(e) {
              return match;
            }
          });
        }
      }

      if (!finalHtml) {
        finalHtml = parsedMessage.text ? `<pre style="white-space: pre-wrap; font-family: inherit;">${parsedMessage.text}</pre>` : "<i>No content</i>";
      }

      return { 
        success: true,
        email: {
          uid,
          html: finalHtml,
          text: parsedMessage.text,
          to: toField,
          attachments: parsedMessage.attachments?.map((a: any) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size
          })),
          trackingLogs,
          clickLogs
        }
      };
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch email" });
    }
  });

  // 6. Download Attachment
  app.get("/attachment", { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub || (req.user as any).id;
    const { accountId, uid, folder = "INBOX", index } = req.query as { accountId: string; uid: string; folder?: string; index: string };

    if (!accountId || !uid || index === undefined) {
      return reply.code(400).send({ error: "Missing accountId, uid, or index" });
    }

    const [account] = await db.select().from(connectedMailAccounts).where(and(
      eq(connectedMailAccounts.id, accountId),
      eq(connectedMailAccounts.userId, userId)
    ));

    if (!account || !account.imapHost || !account.appPassword) {
      return reply.code(404).send({ error: "Account not found" });
    }

    const client = await getImapClient(account);

    try {
      const lock = await client.getMailboxLock(folder);
      let parsedMessage = null;
      try {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        if (message && message.source) {
          parsedMessage = await simpleParser(message.source);
        }
      } finally {
        lock.release();
      }

      if (!parsedMessage || !parsedMessage.attachments || !parsedMessage.attachments[parseInt(index)]) {
        return reply.code(404).send({ error: "Attachment not found" });
      }

      const attachment = parsedMessage.attachments[parseInt(index)];
      reply.header("Content-Type", attachment.contentType);
      reply.header("Content-Disposition", `attachment; filename="${attachment.filename || 'attachment'}"`);
      return reply.send(attachment.content);
    } catch (err: any) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch attachment" });
    }
  });

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

  // 7. Link Click Tracking Endpoint
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

  // 7. QwikAI - Summarize Email
  app.post("/ai/summarize", { preHandler: authenticate }, async (req, reply) => {
    const { text } = req.body as { text: string };
    if (!text) return reply.code(400).send({ error: "Missing text" });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize the following email in exactly 3 bullet points. Be concise and professional:\n\n${text}`
      });
      return { success: true, summary: response.text };
    } catch (e: any) {
      req.log.error(e);
      return reply.code(500).send({ error: "Failed to generate summary" });
    }
  });

  // 8. QwikAI - Smart Reply
  app.post("/ai/reply", { preHandler: authenticate }, async (req, reply) => {
    const { text } = req.body as { text: string };
    if (!text) return reply.code(400).send({ error: "Missing text" });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant helping a professional reply to an email. Generate 3 short, distinct, professional reply options to this email. Format them as a JSON array of strings.\n\nEmail:\n${text}`
      });
      
      const jsonText = response.text?.replace(/```json/g, '').replace(/```/g, '') || "[]";
      let replies = [];
      try { replies = JSON.parse(jsonText); } catch (e) { replies = [response.text]; }

      return { success: true, replies };
    } catch (e: any) {
      req.log.error(e);
      return reply.code(500).send({ error: "Failed to generate replies" });
    }
  });
}
