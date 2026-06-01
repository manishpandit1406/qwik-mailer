import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, domains, domainSenders } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { generateDkimKeys, checkDnsRecord } from "../services/dns.service.js";

export async function domainRoutes(app: FastifyInstance) {
  // GET /v1/domains
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const userDomains = await db.query.domains.findMany({
      where: eq(domains.userId, user.sub),
    });
    return reply.send({ success: true, data: userDomains });
  });

  // POST /v1/domains
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { domain } = z.object({ domain: z.string().min(4) }).parse(req.body);

    const existing = await db.query.domains.findFirst({
      where: and(eq(domains.userId, user.sub), eq(domains.domain, domain)),
    });
    if (existing) return reply.code(409).send({ success: false, error: "Domain already added." });

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
        spfRecord: `v=spf1 include:_spf.qwikmailer.in ~all`,
        dmarcRecord: `v=DMARC1; p=quarantine; rua=mailto:dmarc@qwikmailer.in`,
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
      {
        type: "TXT",
        host: `@`,
        value: domain.spfRecord,
        purpose: "SPF",
        verified: domain.spfVerified,
      },
      {
        type: "TXT",
        host: `${domain.dkimSelector}._domainkey`,
        value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
        purpose: "DKIM",
        verified: domain.dkimVerified,
      },
      {
        type: "TXT",
        host: `_dmarc`,
        value: domain.dmarcRecord,
        purpose: "DMARC",
        verified: domain.dmarcVerified,
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
  app.post("/:id/verify", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    const spfOk = await checkDnsRecord(domain.domain, "TXT", domain.spfRecord!);
    const dkimOk = await checkDnsRecord(`${domain.dkimSelector}._domainkey.${domain.domain}`, "TXT", `p=${domain.dkimPublicKey}`);
    const dmarcOk = await checkDnsRecord(`_dmarc.${domain.domain}`, "TXT", "v=DMARC1");
    
    let cnameOk = true;
    if (domain.isTrackingDomain && domain.trackingCname) {
      cnameOk = await checkDnsRecord(domain.trackingCname, "CNAME", "track.qwikmailer.in");
    }

    const allVerified = spfOk && dkimOk && dmarcOk && cnameOk;
    
    // We have up to 4 checks. Each check is worth 25 points if Link Branding is enabled.
    // If Link Branding is not enabled, we have 3 checks, each worth 33 points.
    let healthScore = 0;
    if (domain.isTrackingDomain) {
      healthScore = [spfOk, dkimOk, dmarcOk, cnameOk].filter(Boolean).length * 25;
    } else {
      healthScore = [spfOk, dkimOk, dmarcOk].filter(Boolean).length * 33 + (allVerified ? 1 : 0);
    }

    await db.update(domains).set({
      spfVerified: spfOk,
      dkimVerified: dkimOk,
      dmarcVerified: dmarcOk,
      cnameVerified: cnameOk,
      status: allVerified ? "verified" : "pending",
      healthScore,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(domains.id, id));

    return reply.send({
      success: true,
      data: {
        spf: spfOk,
        dkim: dkimOk,
        dmarc: dmarcOk,
        cname: cnameOk,
        allVerified,
        healthScore,
      },
    });
  });

  // DELETE /v1/domains/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    await db.delete(domains).where(eq(domains.id, id));
    return reply.send({ success: true, data: { message: "Domain deleted." } });
  });

  // POST /v1/domains/:id/link-branding
  app.post("/:id/link-branding", { preHandler: authenticate }, async (req, reply) => {
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

  // ─── Senders ─────────────────────────────────────────────────────────────────

  // GET /v1/domains/all-senders
  app.get("/all-senders", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const allSenders = await db.query.domainSenders.findMany({
      where: eq(domainSenders.userId, user.sub),
      orderBy: (senders, { desc }) => [desc(senders.createdAt)],
    });
    return reply.send({ success: true, data: allSenders });
  });

  // GET /v1/domains/:id/senders
  app.get("/:id/senders", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const senders = await db.query.domainSenders.findMany({
      where: and(eq(domainSenders.domainId, id), eq(domainSenders.userId, user.sub)),
    });
    return reply.send({ success: true, data: senders });
  });

  // POST /v1/domains/:id/senders
  app.post("/:id/senders", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const { 
      prefix,
      fromName,
      replyTo,
      companyAddress,
      companyAddress2,
      city,
      state,
      zipCode,
      country,
      nickname
    } = z.object({ 
      prefix: z.string().min(1).max(100),
      fromName: z.string().max(255).optional(),
      replyTo: z.string().email().optional().or(z.literal("")),
      companyAddress: z.string().optional(),
      companyAddress2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
      nickname: z.string().max(255).optional(),
    }).parse(req.body);

    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.sub)),
    });
    if (!domain) return reply.code(404).send({ success: false, error: "Domain not found" });

    if (domain.status !== "verified") {
      return reply.code(400).send({ success: false, error: "Domain must be verified first" });
    }

    const email = `${prefix.toLowerCase()}@${domain.domain.toLowerCase()}`;

    // Fuzzy match name against domain root
    if (fromName) {
      const domainRoot = domain.domain.split(".")[0].toLowerCase();
      if (!fromName.toLowerCase().includes(domainRoot)) {
        return reply.code(400).send({ success: false, error: `Sender name must include your domain name '${domainRoot}' (e.g., '${fromName} | ${domainRoot.charAt(0).toUpperCase() + domainRoot.slice(1)}')` });
      }
    }

    const existing = await db.query.domainSenders.findFirst({
      where: eq(domainSenders.email, email),
    });
    if (existing) return reply.code(409).send({ success: false, error: "Sender email already exists" });

    const [newSender] = await db.insert(domainSenders).values({
      userId: user.sub,
      domainId: domain.id,
      email,
      fromName,
      replyTo: replyTo || undefined,
      companyAddress,
      companyAddress2,
      city,
      state,
      zipCode,
      country,
      nickname,
    }).returning();

    return reply.code(201).send({ success: true, data: newSender });
  });

  // DELETE /v1/domains/:id/senders/:senderId
  app.delete("/:id/senders/:senderId", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, senderId } = req.params as { id: string, senderId: string };

    const sender = await db.query.domainSenders.findFirst({
      where: and(eq(domainSenders.id, senderId), eq(domainSenders.domainId, id), eq(domainSenders.userId, user.sub)),
    });
    if (!sender) return reply.code(404).send({ success: false, error: "Sender not found" });

    await db.delete(domainSenders).where(eq(domainSenders.id, senderId));
    return reply.send({ success: true, data: { message: "Sender deleted." } });
  });
}
