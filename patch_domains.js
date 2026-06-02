const fs = require('fs');

const path = './apps/api/src/routes/domains.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import
code = code.replace(
  'import { generateDkimKeys, checkDnsRecord } from "../services/dns.service.js";',
  'import { generateDkimKeys, checkDnsRecord } from "../services/dns.service.js";\nimport { isRelatedToCompany } from "../utils/validation.js";\nimport { sendSharedSenderOtpEmail } from "../services/email.service.js";\nimport crypto from "crypto";'
);

const routesToAdd = `

  // POST /v1/domains/shared/setup
  app.post("/shared/setup", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { username, displayName, replyTo } = z.object({
      username: z.string().min(3),
      displayName: z.string().min(1),
      replyTo: z.string().email(),
    }).parse(req.body);

    const userRec = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (!userRec) return reply.code(404).send({ success: false, error: "User not found" });

    if (!isRelatedToCompany(userRec.companyName, username)) {
      return reply.code(400).send({ success: false, error: "Sender username must be related to your company name." });
    }
    if (!isRelatedToCompany(userRec.companyName, displayName)) {
      return reply.code(400).send({ success: false, error: "From name must be related to your company name." });
    }

    const email = \`\${username.toLowerCase()}@mail.qwikmailer.in\`;
    const existing = await db.query.domainSenders.findFirst({ where: eq(domainSenders.email, email) });
    if (existing) {
      return reply.code(400).send({ success: false, error: "This username is already taken on the shared domain." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = (app as any).redis;
    if (redis) {
      await redis.set(\`shared_otp:\${user.sub}:\${replyTo}\`, otp, "EX", 600);
      await redis.set(\`shared_data:\${user.sub}:\${replyTo}\`, JSON.stringify({ username, displayName }), "EX", 600);
    }

    await sendSharedSenderOtpEmail(replyTo, otp);
    return reply.send({ success: true, message: "OTP sent" });
  });

  // POST /v1/domains/shared/verify
  app.post("/shared/verify", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { otp, replyTo } = z.object({ otp: z.string(), replyTo: z.string().email() }).parse(req.body);

    const redis = (app as any).redis;
    if (!redis) return reply.code(500).send({ success: false, error: "Redis not available" });

    const storedOtp = await redis.get(\`shared_otp:\${user.sub}:\${replyTo}\`);
    if (!storedOtp || storedOtp !== otp) {
      return reply.code(400).send({ success: false, error: "Invalid or expired OTP" });
    }

    const storedDataRaw = await redis.get(\`shared_data:\${user.sub}:\${replyTo}\`);
    if (!storedDataRaw) return reply.code(400).send({ success: false, error: "Session expired" });

    const { username, displayName } = JSON.parse(storedDataRaw);

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

    const email = \`\${username.toLowerCase()}@mail.qwikmailer.in\`;

    const existingSenders = await db.query.domainSenders.findMany({
      where: and(eq(domainSenders.userId, user.sub), eq(domainSenders.domainId, sharedDomain.id))
    });
    if (existingSenders.length >= 1) {
      return reply.code(400).send({ success: false, error: "You can only create one sender identity on the shared domain." });
    }

    const [newSender] = await db.insert(domainSenders).values({
      userId: user.sub,
      domainId: sharedDomain.id,
      email,
      fromName: displayName,
      replyTo,
    }).returning();

    await redis.del(\`shared_otp:\${user.sub}:\${replyTo}\`);
    await redis.del(\`shared_data:\${user.sub}:\${replyTo}\`);

    return reply.code(201).send({ success: true, data: newSender });
  });

  // PATCH /v1/domains/:id/senders/:senderId
  app.patch("/:id/senders/:senderId", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, senderId } = req.params as { id: string, senderId: string };
    const { username, fromName, nickname } = z.object({
      username: z.string().min(3).optional(),
      fromName: z.string().optional(),
      nickname: z.string().optional(),
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

      newEmail = \`\${username.toLowerCase()}@\${domain.domain.toLowerCase()}\`;
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
      usernameEditCount: editCount,
      usernameLastEditedAt: lastEditedAt,
    }).where(eq(domainSenders.id, senderId)).returning();

    return reply.send({ success: true, data: updatedSender });
  });
`;

code = code.replace(/}\n$/, routesToAdd + '\n}\n');

fs.writeFileSync(path, code);
console.log('Patched domains.ts');
