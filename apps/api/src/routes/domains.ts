import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, domains, domainSenders, users } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { generateDkimKeys, checkDnsRecord } from "../services/dns.service.js";
import { isRelatedToCompany } from "../utils/validation.js";
import { sendSharedSenderOtpEmail } from "../services/email.service.js";
import crypto from "crypto";

export async function domainRoutes(app: FastifyInstance) {
  // GET /v1/domains
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const userDomains = await db.query.domains.findMany({
      where: eq(domains.userId, user.sub),
    });

    const hasSharedDomain = userDomains.some(d => d.domain === "mail.qwikmailer.in");
    if (!hasSharedDomain) {
      const [sharedDomain] = await db.insert(domains).values({
        userId: user.sub,
        domain: "mail.qwikmailer.in",
        status: "verified",
        healthScore: 100,
        dkimVerified: true,
        dmarcVerified: true,
        mailFromVerified: true,
        cnameVerified: true,
      }).returning();
      userDomains.push(sharedDomain);
    }

    return reply.send({ success: true, data: userDomains });
  });

  // POST /v1/domains
  app.post("/", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { domain } = z.object({ domain: z.string().min(4) }).parse(req.body);

    const existing = await db.query.domains.findFirst({
      where: and(eq(domains.userId, user.sub), eq(domains.domain, domain)),
    });
    if (existing) return reply.code(409).send({ success: false, error: "Domain already added." });

    const { addDomainToSes } = await import("../services/aws.service.js");
    let sesDkimTokens: string[] = [];
    try {
      sesDkimTokens = await addDomainToSes(domain);
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: "Failed to provision domain in AWS SES. Please check your AWS credentials." });
    }

    const { publicKey, privateKey } = await generateDkimKeys();
    const selector = "qwikmailer";

    const [newDomain] = await db
      .insert(domains)
      .values({
        userId: user.sub,
        domain,
        dkimPublicKey: publicKey,
        dkimPrivateKey: privateKey,
        dkimSelector: selector,
        sesDkimTokens,
        spfRecord: `v=spf1 include:_spf.qwikmailer.in ~all`,
        dmarcRecord: `v=DMARC1; p=quarantine; rua=mailto:dmarc@qwikmailer.in`,
        isTrackingDomain: true,
        trackingCname: `track.${domain}`,
      })
      .returning();

    return reply.code(201).send({ success: true, data: newDomain });
  });

  // GET /v1/domains/:id/dns-records
  app.get("/:id/dns-records", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    const records = [
      ...((domain.sesDkimTokens && domain.sesDkimTokens.length > 0)
        ? domain.sesDkimTokens.map((token: string) => ({
            type: "CNAME",
            host: `${token}._domainkey`,
            value: `${token}.dkim.amazonses.com`,
            purpose: "DKIM",
            verified: domain.dkimVerified,
          }))
        : [
            {
              type: "TXT",
              host: `${domain.dkimSelector}._domainkey`,
              value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
              purpose: "DKIM",
              verified: domain.dkimVerified,
            }
          ]),
      {
        type: "TXT",
        host: `_dmarc`,
        value: domain.dmarcRecord,
        purpose: "DMARC",
        verified: domain.dmarcVerified,
      },
      {
        type: "MX",
        host: `bounces`,
        value: `feedback-smtp.${process.env.AWS_REGION || 'us-east-1'}.amazonses.com`,
        priority: 10,
        purpose: "Return-Path MX",
        verified: domain.mailFromVerified,
      },
      {
        type: "TXT",
        host: `bounces`,
        value: `v=spf1 include:amazonses.com ~all`,
        purpose: "Return-Path SPF",
        verified: domain.mailFromVerified,
      },
    ];

    if (domain.isTrackingDomain && domain.trackingCname) {
      records.push({
        type: "CNAME",
        host: domain.trackingCname.split('.')[0],
        value: "track.qwikmailer.in",
        purpose: "Link Branding",
        verified: domain.cnameVerified, // Fetch directly from db column
      });
    }

    return reply.send({ success: true, data: { domain: domain.domain, records } });
  });

  // POST /v1/domains/:id/verify
  app.post("/:id/verify", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    const { getDomainSesStatus } = await import("../services/aws.service.js");

    const { dkimVerified: dkimOk, mailFromVerified: mailFromOk } = await getDomainSesStatus(domain.domain);
    const dmarcOk = await checkDnsRecord(`_dmarc.${domain.domain}`, "TXT", "v=DMARC1");
    
    let cnameOk = true;
    if (domain.isTrackingDomain && domain.trackingCname) {
      cnameOk = await checkDnsRecord(
        domain.trackingCname.split('.')[0] + `.${domain.domain}`,
        "CNAME",
        "track.qwikmailer.in"
      );
    }

    const allOk = dkimOk && dmarcOk && cnameOk && mailFromOk;

    const calculateHealth = (hasTracking: boolean, dkim: boolean, dmarc: boolean, cname: boolean) => {
      const checks = [dkim, dmarc, mailFromOk];
      if (hasTracking) checks.push(cname);
      return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    };

    await db.update(domains).set({
      dkimVerified: dkimOk,
      dmarcVerified: dmarcOk,
      mailFromVerified: mailFromOk,
      cnameVerified: cnameOk,
      status: allOk ? "verified" : "pending",
      healthScore: calculateHealth(domain.isTrackingDomain, dkimOk, dmarcOk, cnameOk),
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(domains.id, id));

    if (allOk && domain.status !== "verified") {
      const userDb = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
      if (userDb) {
        const { sendDomainVerifiedEmail } = await import("../services/email.service.js");
        sendDomainVerifiedEmail(userDb.email, userDb.name ?? "", domain.domain).catch((err) => {
          console.error(`[Domains] Failed to send domain verification email:`, err.message);
        });
      }
    }

    return reply.send({
      success: true,
      data: {
        spf: true,
        dkim: dkimOk,
        mailFrom: mailFromOk,
        dmarc: dmarcOk,
        cname: cnameOk,
        allVerified: allOk,
        healthScore: calculateHealth(domain.isTrackingDomain, dkimOk, dmarcOk, cnameOk),
      },
    });
  });

  // DELETE /v1/domains/:id
  app.delete("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    if (domain.domain === "mail.qwikmailer.in") {
      return reply.code(400).send({ success: false, error: "Cannot delete the shared domain." });
    }

    const { removeDomainFromSes } = await import("../services/aws.service.js");
    await removeDomainFromSes(domain.domain);

    await db.delete(domains).where(eq(domains.id, id));
    return reply.send({ success: true, data: { message: "Domain deleted." } });
  });

  // POST /v1/domains/:id/link-branding
  app.post("/:id/link-branding", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    // In a real implementation this would register the CNAME on our reverse proxy/load balancer
    const trackingCname = `track.${domain.domain}`;
    
    await db.update(domains)
      .set({ isTrackingDomain: true, trackingCname, updatedAt: new Date() })
      .where(eq(domains.id, id));

    return reply.send({ success: true, data: { trackingCname } });
  });


  // POST /v1/domains/shared/setup
  app.post("/shared/setup", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { username, displayName, replyTo, companyAddress, companyAddress2, city, state, zipCode, country, teamId } = z.object({
      username: z.string().min(3),
      displayName: z.string().min(1),
      replyTo: z.string().email(),
      companyAddress: z.string().optional(),
      companyAddress2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
      teamId: z.string().optional(),
    }).parse(req.body);

    const userRec = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (!userRec) return reply.code(404).send({ success: false, error: "User not found" });

    if (!isRelatedToCompany(userRec.companyName, username)) {
      return reply.code(400).send({ success: false, error: "Sender username must be related to your company name." });
    }
    if (!isRelatedToCompany(userRec.companyName, displayName)) {
      return reply.code(400).send({ success: false, error: "From name must be related to your company name." });
    }

    const email = `${username.toLowerCase()}@mail.qwikmailer.in`;
    const existing = await db.query.domainSenders.findFirst({ where: eq(domainSenders.email, email) });
    if (existing) {
      return reply.code(400).send({ success: false, error: "This username is already taken on the shared domain." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = (app as any).redis;
    if (redis) {
      await redis.set(`shared_otp:${user.sub}:${replyTo}`, otp, "EX", 600);
      await redis.set(`shared_data:${user.sub}:${replyTo}`, JSON.stringify({ 
        username, displayName, companyAddress, companyAddress2, city, state, zipCode, country, teamId 
      }), "EX", 600);
    }

    await sendSharedSenderOtpEmail(replyTo, otp);
    return reply.send({ success: true, message: "OTP sent" });
  });

  // POST /v1/domains/shared/verify
  app.post("/shared/verify", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { otp, replyTo } = z.object({ otp: z.string(), replyTo: z.string().email() }).parse(req.body);

    const redis = (app as any).redis;
    if (!redis) return reply.code(500).send({ success: false, error: "Redis not available" });

    const storedOtp = await redis.get(`shared_otp:${user.sub}:${replyTo}`);
    if (!storedOtp || storedOtp !== otp) {
      return reply.code(400).send({ success: false, error: "Invalid or expired OTP" });
    }

    const storedDataRaw = await redis.get(`shared_data:${user.sub}:${replyTo}`);
    if (!storedDataRaw) return reply.code(400).send({ success: false, error: "Session expired" });

    const { username, displayName, companyAddress, companyAddress2, city, state, zipCode, country, teamId } = JSON.parse(storedDataRaw);

    let sharedDomain = await db.query.domains.findFirst({
      where: and(eq(domains.userId, user.sub), eq(domains.domain, "mail.qwikmailer.in"))
    });

    if (!sharedDomain) {
      [sharedDomain] = await db.insert(domains).values({
        userId: user.sub,
        domain: "mail.qwikmailer.in",
        status: "verified",
        healthScore: 100,
        dkimVerified: true,
        dmarcVerified: true,
        mailFromVerified: true,
        cnameVerified: true,
      }).returning();
    }

    const email = `${username.toLowerCase()}@mail.qwikmailer.in`;

    const existingSendersQuery = teamId 
      ? and(eq((domainSenders as any).teamId, teamId), eq(domainSenders.domainId, sharedDomain.id))
      : and(eq(domainSenders.userId, user.sub), eq(domainSenders.domainId, sharedDomain.id));

    const existingSenders = await db.query.domainSenders.findMany({
      where: existingSendersQuery
    });
    if (existingSenders.length >= 1) {
      return reply.code(400).send({ success: false, error: "You can only create one sender identity on the shared domain per project." });
    }

    const [newSender] = await db.insert(domainSenders).values({
      userId: user.sub,
      domainId: sharedDomain.id,
      email,
      fromName: displayName,
      replyTo,
      companyAddress,
      companyAddress2,
      city,
      state,
      zipCode,
      country,
      teamId: teamId || undefined,
    }).returning();

    await redis.del(`shared_otp:${user.sub}:${replyTo}`);
    await redis.del(`shared_data:${user.sub}:${replyTo}`);

    return reply.code(201).send({ success: true, data: newSender });
  });

  // PATCH /v1/domains/:id/senders/:senderId
  app.patch("/:id/senders/:senderId", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, senderId } = req.params as { id: string, senderId: string };
    const { username, fromName, nickname, companyAddress, companyAddress2, city, state, zipCode, country } = z.object({
      username: z.string().min(3).optional(),
      fromName: z.string().optional(),
      nickname: z.string().optional(),
      companyAddress: z.string().optional(),
      companyAddress2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    }).parse(req.body);

    const sender = await db.query.domainSenders.findFirst({
      where: and(eq(domainSenders.id, senderId), eq(domainSenders.domainId, id), eq(domainSenders.userId, user.sub)),
    });
    if (!sender) return reply.code(404).send({ success: false, error: "Sender not found" });

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    const userRec = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    
    let newEmail = sender.email;
    let editCount = sender.usernameEditCount || 0;
    let lastEditedAt = sender.usernameLastEditedAt;

    if (username) {
      if (!isRelatedToCompany(userRec?.companyName, username)) {
        return reply.code(400).send({ success: false, error: "Sender username must be related to your company name." });
      }
      
      const now = new Date();
      if (editCount > 0) {
        if (!lastEditedAt) lastEditedAt = new Date(0);
        const diffMs = now.getTime() - lastEditedAt.getTime();
        
        if (editCount === 1) {
          // 1 week cooldown
          if (diffMs < 7 * 24 * 60 * 60 * 1000) {
            return reply.code(400).send({ success: false, error: "You can only edit the username once a week after the first edit." });
          }
        } else {
          // 1 month cooldown (approx 30 days)
          if (diffMs < 30 * 24 * 60 * 60 * 1000) {
            return reply.code(400).send({ success: false, error: "You can only edit the username once a month." });
          }
        }
      }

      newEmail = `${username.toLowerCase()}@${domain.domain.toLowerCase()}`;
      const existing = await db.query.domainSenders.findFirst({ where: eq(domainSenders.email, newEmail) });
      if (existing && existing.id !== senderId) {
        return reply.code(409).send({ success: false, error: "This username is already taken." });
      }
      
      editCount++;
      lastEditedAt = now;
    }

    if (fromName) {
      if (!isRelatedToCompany(userRec?.companyName, fromName)) {
        return reply.code(400).send({ success: false, error: "From name must be related to your company name." });
      }
    }

    const [updatedSender] = await db.update(domainSenders).set({
      email: newEmail,
      fromName: fromName !== undefined ? fromName : sender.fromName,
      nickname: nickname !== undefined ? nickname : sender.nickname,
      companyAddress: companyAddress !== undefined ? companyAddress : sender.companyAddress,
      companyAddress2: companyAddress2 !== undefined ? companyAddress2 : sender.companyAddress2,
      city: city !== undefined ? city : sender.city,
      state: state !== undefined ? state : sender.state,
      zipCode: zipCode !== undefined ? zipCode : sender.zipCode,
      country: country !== undefined ? country : sender.country,
      usernameEditCount: editCount,
      usernameLastEditedAt: lastEditedAt,
    }).where(eq(domainSenders.id, senderId)).returning();

    return reply.send({ success: true, data: updatedSender });
  });

  // POST /v1/domains/:id/senders/:senderId/reply-to/setup
  app.post("/:id/senders/:senderId/reply-to/setup", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, senderId } = req.params as { id: string, senderId: string };
    const { replyTo } = z.object({ replyTo: z.string().email() }).parse(req.body);

    const sender = await db.query.domainSenders.findFirst({
      where: and(eq(domainSenders.id, senderId), eq(domainSenders.domainId, id), eq(domainSenders.userId, user.sub)),
    });
    if (!sender) return reply.code(404).send({ success: false, error: "Sender not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = (app as any).redis;
    if (redis) {
      await redis.set(`edit_reply_to_otp:${user.sub}:${senderId}:${replyTo}`, otp, "EX", 600);
    }

    await sendSharedSenderOtpEmail(replyTo, otp);
    return reply.send({ success: true, message: "OTP sent" });
  });

  // POST /v1/domains/:id/senders/:senderId/reply-to/verify
  app.post("/:id/senders/:senderId/reply-to/verify", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, senderId } = req.params as { id: string, senderId: string };
    const { otp, replyTo } = z.object({ otp: z.string(), replyTo: z.string().email() }).parse(req.body);

    const sender = await db.query.domainSenders.findFirst({
      where: and(eq(domainSenders.id, senderId), eq(domainSenders.domainId, id), eq(domainSenders.userId, user.sub)),
    });
    if (!sender) return reply.code(404).send({ success: false, error: "Sender not found" });

    const redis = (app as any).redis;
    if (!redis) return reply.code(500).send({ success: false, error: "Redis not available" });

    const storedOtp = await redis.get(`edit_reply_to_otp:${user.sub}:${senderId}:${replyTo}`);
    if (!storedOtp || storedOtp !== otp) {
      return reply.code(400).send({ success: false, error: "Invalid or expired OTP" });
    }

    const [updatedSender] = await db.update(domainSenders).set({
      replyTo,
    }).where(eq(domainSenders.id, senderId)).returning();

    await redis.del(`edit_reply_to_otp:${user.sub}:${senderId}:${replyTo}`);

    return reply.send({ success: true, data: updatedSender });
  });

}
