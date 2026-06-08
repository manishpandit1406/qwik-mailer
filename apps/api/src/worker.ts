import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { eq, sql } from "drizzle-orm";
import { db, domains, emails, emailEvents, suppressionList, users, webhooks, webhookLogs, reputationLogs, certificates, workflows, workflowRuns, dedicatedIps, ipPools } from "@qwikmailer/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_ROOT = path.join(__dirname, "..");
import {
  createRedisConnection,
  QUEUE_NAMES,
  createWebhookQueue,
  createAnalyticsQueue,
} from "@qwikmailer/queue";
import type { SendEmailJobData } from "@qwikmailer/types";

const redis = createRedisConnection();
const webhookQueue = createWebhookQueue(redis);
const analyticsQueue = createAnalyticsQueue(redis);

// ─── SMTP Transport ───────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

// ─── Template Variable Renderer ───────────────────────────────────────────────

type Token =
  | { type: 'text', value: string }
  | { type: 'if', condition: string }
  | { type: 'elseif', condition: string }
  | { type: 'else' }
  | { type: 'endif' }
  | { type: 'var', key: string, fallback?: string };

function tokenizeTemplate(html: string): Token[] {
  const regex = /\{\{([\s\S]+?)\}\}/g;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: html.substring(lastIndex, match.index) });
    }
    const inner = match[1].trim();
    if (inner.startsWith('if ')) {
      tokens.push({ type: 'if', condition: inner.substring(3).trim() });
    } else if (inner.startsWith('elseif ')) {
      tokens.push({ type: 'elseif', condition: inner.substring(7).trim() });
    } else if (inner === 'else') {
      tokens.push({ type: 'else' });
    } else if (inner === 'endif') {
      tokens.push({ type: 'endif' });
    } else {
      if (inner.includes('|')) {
        const parts = inner.split('|');
        tokens.push({ type: 'var', key: parts[0].trim(), fallback: parts[1].trim().replace(/^["']|["']$/g, "") });
      } else {
        tokens.push({ type: 'var', key: inner });
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < html.length) {
    tokens.push({ type: 'text', value: html.substring(lastIndex) });
  }
  return tokens;
}

function evaluateCondition(condStr: string, variables: Record<string, string>): boolean {
  const match = condStr.match(/^\s*(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+?)\s*$/);
  if (match) {
    const varName = match[1];
    const op = match[2];
    const compareVal = match[3].replace(/^["']|["']$/g, "");
    const val = variables[varName] ?? "";

    const numVal = parseFloat(val);
    const numCmp = parseFloat(compareVal);
    switch (op) {
      case "==": return val === compareVal;
      case "!=": return val !== compareVal;
      case ">": return !isNaN(numVal) && !isNaN(numCmp) && numVal > numCmp;
      case "<": return !isNaN(numVal) && !isNaN(numCmp) && numVal < numCmp;
      case ">=": return !isNaN(numVal) && !isNaN(numCmp) && numVal >= numCmp;
      case "<=": return !isNaN(numVal) && !isNaN(numCmp) && numVal <= numCmp;
    }
  }
  const val = variables[condStr.trim()] ?? "";
  return Boolean(val && val !== "0" && val.toLowerCase() !== "false");
}

function renderTemplate(html: string, variables: Record<string, string> = {}): string {
  const tokens = tokenizeTemplate(html);
  let i = 0;

  function parseBlock(stopTokens: string[], skip: boolean): string {
    let blockResult = "";
    while (i < tokens.length) {
      const token = tokens[i];
      if (stopTokens.includes(token.type)) {
        break;
      }

      if (token.type === 'text') {
        if (!skip) blockResult += token.value;
        i++;
      } else if (token.type === 'var') {
        if (!skip) {
          const val = variables[token.key];
          blockResult += (val && val.trim()) ? val : (token.fallback ?? `{{${token.key}}}`);
        }
        i++;
      } else if (token.type === 'if') {
        const conditionMet = evaluateCondition((token as any).condition, variables);
        let foundTrueBranch = conditionMet;
        i++; // Consume 'if'

        const ifContent = parseBlock(['elseif', 'else', 'endif'], skip || !conditionMet);
        if (!skip && conditionMet) blockResult += ifContent;

        while (i < tokens.length && tokens[i].type === 'elseif') {
          const elseIfCond = evaluateCondition((tokens[i] as any).condition, variables);
          const branchActive = !foundTrueBranch && elseIfCond;
          if (branchActive) foundTrueBranch = true;
          i++; // Consume 'elseif'

          const elseIfContent = parseBlock(['elseif', 'else', 'endif'], skip || !branchActive);
          if (!skip && branchActive) blockResult += elseIfContent;
        }

        if (i < tokens.length && tokens[i].type === 'else') {
          const branchActive = !foundTrueBranch;
          i++; // Consume 'else'
          const elseContent = parseBlock(['endif'], skip || !branchActive);
          if (!skip && branchActive) blockResult += elseContent;
        }

        if (i < tokens.length && tokens[i].type === 'endif') {
          i++; // Consume 'endif'
        }
      } else {
        // unmatched else/endif/elseif outside of block
        i++;
      }
    }
    return blockResult;
  }

  return parseBlock([], false);
}

// ─── Anti-Abuse: Bounce Rate Check ───────────────────────────────────────────

async function checkBounceRate(teamId: string): Promise<boolean> {
  const { teams } = await import("@qwikmailer/db");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) return false;
  
  const user = await db.query.users.findFirst({ where: eq(users.id, team.ownerId) });
  if (!user) return false;

  // Auto-suspend if reputation < 20
  if (user.reputationScore < 20) {
    await db.update(users)
      .set({ isSuspended: true, suspendReason: "Automatic suspension: low reputation score", updatedAt: new Date() })
      .where(eq(users.id, team.ownerId));
    return false;
  }
  return true;
}

// ─── Webhook Dispatcher ────────────────────────────────────────────────────────

async function dispatchWebhooks(teamId: string, emailId: string, event: string, toEmail: string, subject: string) {
  const userWebhooks = await db.query.webhooks.findMany({
    where: eq(webhooks.teamId, teamId),
  });

  for (const webhook of userWebhooks) {
    if (!webhook.isActive) continue;
    const events = webhook.events as string[];
    if (!events.includes(event)) continue;

    await webhookQueue.add("dispatch", {
      webhookId: webhook.id,
      teamId,
      payload: {
        event: event as never,
        emailId,
        to: toEmail,
        subject,
        occurredAt: new Date().toISOString(),
      },
    });
  }
}

// ─── Tracking Helpers ────────────────────────────────────────────────────────
function prepareHtmlBody(html: string, emailId: string, plan: string = "free"): string {
  const apiRoot = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const publicUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // 1. Rewrite Links for Click Tracking
  const clickUrlPrefix = `${apiRoot}/v1/track/click/${emailId}?url=`;
  let processedHtml = html.replace(/href="([^"]+)"/g, (match, url) => {
    if (url.startsWith("http") && !url.includes("/v1/track/")) {
      return `href="${clickUrlPrefix}${encodeURIComponent(url)}"`;
    }
    return match;
  });

  // 2. Add Open Tracking Pixel
  const pixelUrl = `${apiRoot}/v1/track/open/${emailId}`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

  // 3. Inject Unsubscribe Link
  // const publicUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const unsubscribeUrl = `${publicUrl}/unsubscribe?id=${emailId}`;

  let usedCustomUnsubscribe = false;
  if (processedHtml.includes("{{unsubscribe_url}}")) {
    processedHtml = processedHtml.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
    usedCustomUnsubscribe = true;
  }

  const unsubscribeHtml = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #666; text-align: center;">
    <p>You received this email because you are subscribed to our updates.</p>
    <p><a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a> to stop receiving these emails.</p>
  </div>`;

  const poweredByHtml = plan === "free" ? `<div style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">Powered by <a href="${publicUrl}" style="color: #6366f1; text-decoration: none; font-weight: bold;">Qwik Mailer</a></div>` : "";

  const shouldAppendFooter = plan === "free" || !usedCustomUnsubscribe;

  if (shouldAppendFooter) {
    if (processedHtml.includes("</body>")) {
      processedHtml = processedHtml.replace("</body>", `${unsubscribeHtml}${poweredByHtml}${pixelHtml}</body>`);
    } else {
      processedHtml += `${unsubscribeHtml}${poweredByHtml}${pixelHtml}`;
    }
  } else {
    if (processedHtml.includes("</body>")) {
      processedHtml = processedHtml.replace("</body>", `${pixelHtml}</body>`);
    } else {
      processedHtml += `${pixelHtml}`;
    }
  }

  return processedHtml;
}

// ─── Mail Worker ──────────────────────────────────────────────────────────────

const worker = new Worker<SendEmailJobData>(
  QUEUE_NAMES.EMAIL_SEND,
  async (job) => {
    const { emailId, teamId } = job.data;

    const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
    if (!email) throw new Error(`Email ${emailId} not found`);

    // Anti-abuse check
    const canSend = await checkBounceRate(teamId);
    if (!canSend) {
      await db.update(emails).set({ status: "failed", updatedAt: new Date() }).where(eq(emails.id, emailId));
      await analyticsQueue.add("ingest", {
        emailId,
        teamId,
        type: "failed",
        metadata: { error: "Automatic suspension: low reputation score" },
      });
      return;
    }

    // Check suppression
    const suppressed = await db.query.suppressionList.findFirst({
      where: eq(suppressionList.email, email.toEmail),
    });
    if (suppressed) {
      await db.update(emails).set({ status: "failed", updatedAt: new Date() }).where(eq(emails.id, emailId));
      await analyticsQueue.add("ingest", {
        emailId,
        teamId,
        type: "failed",
        metadata: { error: "Recipient in suppression list" },
      });
      return;
    }

    // Update status to "sending"
    await db.update(emails).set({ status: "sending", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(emails.id, emailId));

    console.log(`[Worker] Processing email ${emailId}. Metadata:`, email.metadata);

    try {
      const { teams } = await import("@qwikmailer/db");
      const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
      if (!team) throw new Error("Team not found");
      const user = await db.query.users.findFirst({ where: eq(users.id, team.ownerId) });
      const userPlan = user?.plan ?? "free";

      const renderedTextBody = email.textBody
        ? renderTemplate(email.textBody, email.metadata as Record<string, string>)
        : undefined;

      let baseHtml = email.htmlBody
        ? renderTemplate(email.htmlBody, email.metadata as Record<string, string>)
        : undefined;

      if (!baseHtml && renderedTextBody) {
        baseHtml = `<p style="white-space: pre-wrap;">${renderedTextBody}</p>`;
      }

      const htmlBody = baseHtml
        ? prepareHtmlBody(baseHtml, emailId, userPlan)
        : undefined;

      const publicUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const unsubscribeUrl = `${publicUrl}/unsubscribe?id=${emailId}`;

      const renderedSubject = renderTemplate(email.subject, email.metadata as Record<string, string>);

      // Certificate handling
      const attachments: nodemailer.SendMailOptions["attachments"] = [];
      let metadataObj = email.metadata as any;
      if (typeof metadataObj === 'string') {
        try { metadataObj = JSON.parse(metadataObj); } catch (e) { }
      }

      if (metadataObj?._attachments) {
        try {
          const parsedAttachments = JSON.parse(metadataObj._attachments);
          for (const att of parsedAttachments) {
            if (fs.existsSync(att.path)) {
              attachments.push({
                filename: att.filename,
                path: att.path,
                contentType: att.contentType
              });
            }
          }
        } catch (e) {
          console.error("[Worker] Failed to parse _attachments", e);
        }
      }

      if (metadataObj?.certificateId) {
        // ... certificate code remains exactly the same
        console.log(`[Worker] Fetching cert for ID: ${metadataObj.certificateId}`);
        const cert = await db.query.certificates.findFirst({
          where: eq(certificates.id, metadataObj.certificateId)
        });

        console.log(`[Worker] Found cert:`, !!cert);
        if (cert) {
          const certPath = path.join(API_ROOT, cert.fileUrl.replace(/^\//, ""));
          console.log(`[Worker] Attempting to attach certificate at: ${certPath}`);

          if (fs.existsSync(certPath)) {
            console.log(`[Worker] Certificate file found.`);
            const pdfBytes = fs.readFileSync(certPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
            let config = cert.config as any;
            if (typeof config === 'string') {
              try { config = JSON.parse(config); } catch (e) { }
            }
            if (!Array.isArray(config)) config = [];

            for (const field of config) {
              const val = metadataObj[field.name] || "";

              let yRemaining = Number(field.y);
              let targetPageIndex = 0;
              while (targetPageIndex < pages.length - 1 && yRemaining > pages[targetPageIndex].getHeight()) {
                yRemaining -= pages[targetPageIndex].getHeight();
                targetPageIndex++;
              }
              const targetPage = pages[targetPageIndex];
              const localY = yRemaining;

              if (field.type === "qr") {
                try {
                  const qrDataUrl = await QRCode.toDataURL(String(val) || "https://qwikmailer.in", {
                    width: Number(field.size || 100),
                    margin: 1,
                  });
                  const base64Data = qrDataUrl.split(",")[1];
                  const qrBytes = Buffer.from(base64Data, "base64");
                  const qrImage = await pdfDoc.embedPng(qrBytes);
                  const size = Number(field.size || 100);
                  targetPage.drawImage(qrImage, {
                    x: Number(field.x),
                    y: targetPage.getHeight() - localY - size,
                    width: size,
                    height: size,
                  });
                } catch (qrErr) {
                  console.error("[Worker] QR code generation failed:", qrErr);
                }
                continue;
              }

              let r = 0, g = 0, b = 0;
              if (field.color && field.color.startsWith('#')) {
                const hex = field.color.substring(1);
                r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
                g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
                b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
              }

              const isBold = field.font === "HelveticaBold";
              const selectedFont = isBold ? fontBold : fontNormal;
              const fSize = Number(field.fontSize || 24);
              const textWidth = selectedFont.widthOfTextAtSize(String(val), fSize);

              let adjustedX = Number(field.x);
              if (field.align === "center") {
                adjustedX -= textWidth / 2;
              } else if (field.align === "right") {
                adjustedX -= textWidth;
              }

              targetPage.drawText(String(val), {
                x: adjustedX,
                y: targetPage.getHeight() - localY - fSize,
                size: fSize,
                font: selectedFont,
                color: rgb(r, g, b),
              });
            }

            const modifiedPdfBytes = await pdfDoc.save();
            attachments.push({
              filename: `${cert.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_certificate.pdf`,
              content: Buffer.from(modifiedPdfBytes),
              contentType: "application/pdf"
            });
          }
        }
      }

      // Look up domain to get private key for DKIM signing
      let dkimConfig = undefined;
      if (email.fromEmail.includes("@")) {
        const domainPart = email.fromEmail.split("@")[1];
        const domainData = await db.query.domains.findFirst({
          where: eq(domains.domain, domainPart)
        });
        
        if (domainData && domainData.dkimPrivateKey && domainData.dkimSelector && domainData.status === "verified") {
          dkimConfig = {
            domainName: domainData.domain,
            keySelector: domainData.dkimSelector,
            privateKey: domainData.dkimPrivateKey
          };
        }
      }

      // Configuration set is no longer used for dedicated IPs as we use shared pool
      let configurationSetName: string | undefined = undefined;

      const info = await transporter.sendMail({
        from: `"${email.fromName ?? "Qwik Mailer"}" <${email.fromEmail}>`,
        to: email.toName ? { name: email.toName, address: email.toEmail } : email.toEmail,
        replyTo: email.replyTo ?? undefined,
        subject: renderedSubject,
        html: htmlBody,
        text: renderedTextBody ? `${renderedTextBody}\n\nUnsubscribe: ${unsubscribeUrl}` : undefined,
        messageId: `${emailId}@qwikmailer.in`,
        attachments,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          ...(configurationSetName ? { "X-SES-CONFIGURATION-SET": configurationSetName } : {}),
        } as any,
        dkim: dkimConfig,
      });


      // Mark delivered
      await db.update(emails)
        .set({ status: "delivered", deliveredAt: new Date(), messageId: (info as any).messageId, updatedAt: new Date() })
        .where(eq(emails.id, emailId));

      // Ingest analytics
      await analyticsQueue.add("ingest", { emailId, teamId, type: "sent" as any });
      await analyticsQueue.add("ingest", { emailId, teamId, type: "delivered" });

      console.log(`[Worker] ✅ Sent email ${emailId} → ${email.toEmail}`);

      // Delay removed to allow maximum throughput for heavy user loads
      // await new Promise(r => setTimeout(r, 1100));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      await db.update(emails)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(emails.id, emailId));

      const isBounce = errMsg.includes("550") || errMsg.includes("invalid");

      // Ingest failed or bounced event
      await analyticsQueue.add("ingest", {
        emailId,
        teamId,
        type: isBounce ? "bounced" : "failed",
        metadata: { error: errMsg },
      });

      // If bounce-like error, update suppression + reduce reputation
      if (isBounce) {
        await db.insert(suppressionList)
          .values({ email: email.toEmail, reason: "bounce", teamId } as any)
          .onConflictDoNothing();

        // Reduce reputation score by 10
        await db.execute(
          sql`UPDATE users SET reputation_score = reputation_score - 10 FROM teams WHERE users.id = teams.owner_id AND teams.id = ${teamId}`
        );

        // Log the deduction
        await db.insert(reputationLogs).values({
          teamId,
          points: -10,
          reason: `Bounce penalty for ${email.toEmail}`,
        } as any);
      }

      console.error(`[Worker] ❌ Failed email ${emailId}:`, errMsg);
      throw err; // BullMQ will retry
    }
  },
  {
    connection: redis as any,
    concurrency: 100, // Scales parallel processing to handle massive traffic blasts without bottleneck
    limiter: {
      max: 1, // Limit to 1 email
      duration: 1000, // per 1 second
    }
  }
);

// ─── Analytics Ingestion Worker ────────────────────────────────────────────────

const analyticsWorker = new Worker(
  QUEUE_NAMES.ANALYTICS_INGEST,
  async (job) => {
    const { emailId, teamId, type, ip, userAgent, url, metadata } = job.data;

    const email = await db.query.emails.findFirst({ where: eq(emails.id, emailId) });
    if (!email) return;

    // Log raw event in database
    await db.insert(emailEvents).values({
      emailId,
      teamId,
      type,
      ip: ip || null,
      userAgent: userAgent || null,
      url: url || null,
      metadata: metadata || {},
      occurredAt: new Date(),
    } as any);

    // Update email status/counts
    if (type === "opened") {
      await db.update(emails)
        .set({ openCount: sql`open_count + 1`, updatedAt: new Date() })
        .where(eq(emails.id, emailId));
    } else if (type === "clicked") {
      await db.update(emails)
        .set({ clickCount: sql`click_count + 1`, updatedAt: new Date() })
        .where(eq(emails.id, emailId));
    } else if (["delivered", "bounced", "failed"].includes(type)) {
      // Sync status
      await db.update(emails)
        .set({ status: type as any, updatedAt: new Date() })
        .where(eq(emails.id, emailId));
    }

    // Dispatch webhooks (handles open, click, delivered, bounced, failed, sent, queued, etc.)
    if (["delivered", "bounced", "opened", "clicked", "unsubscribed", "complained", "failed", "sent", "queued"].includes(type)) {
      await dispatchWebhooks(teamId, emailId, type, email.toEmail, email.subject);
    }
  },
  { connection: redis as any, concurrency: 25 }
);


// ─── Webhook Dispatch Worker ──────────────────────────────────────────────────

const webhookWorker = new Worker(
  QUEUE_NAMES.WEBHOOK_DISPATCH,
  async (job) => {
    const { webhookId, payload } = job.data;

    const webhook = await db.query.webhooks.findFirst({ where: eq(webhooks.id, webhookId) });
    if (!webhook || !webhook.isActive) return;

    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qwik-Mailer-Signature": `sha256=${signature}`,
        "X-Qwik-Mailer-Event": payload.event,
      },
      body: JSON.stringify(payload),
    });

    let responseText = "";
    try {
      responseText = await res.text();
    } catch {
      responseText = "Could not read response";
    }

    await db.insert(webhookLogs).values({
      webhookId,
      payload,
      responseStatus: res.status,
      responseBody: responseText.slice(0, 5000), // Max 5000 chars
    });

    if (!res.ok) {
      await db.update(webhooks)
        .set({ failureCount: webhook.failureCount + 1, updatedAt: new Date() })
        .where(eq(webhooks.id, webhookId));

      if (webhook.failureCount + 1 >= 10) {
        await db.update(webhooks)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(webhooks.id, webhookId));
        console.log(`[Worker] ⚠️ Webhook ${webhookId} auto-disabled after 10 failures`);
      }
      throw new Error(`Webhook returned ${res.status}`);
    }

    await db.update(webhooks)
      .set({ lastFiredAt: new Date(), failureCount: 0, updatedAt: new Date() })
      .where(eq(webhooks.id, webhookId));
  },
  { connection: redis as any, concurrency: 20 }
);


worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log("🔧 Qwik Mailer Mail Worker started");
console.log(`📬 Listening on queue: ${QUEUE_NAMES.EMAIL_SEND}`);
console.log(`🔔 Webhook worker listening on: ${QUEUE_NAMES.WEBHOOK_DISPATCH}`);


