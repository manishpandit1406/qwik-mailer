import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, desc, and, or } from "drizzle-orm";
import { db, users, refreshTokens, reputationLogs, teams, teamMembers } from "@qwikmailer/db";
import { nanoid } from "nanoid";
import UAParser from "ua-parser-js";
import { sendNewLoginAlertEmail, send2FAEnabledEmail, send2FADisabledEmail } from "../services/email.service.js";
import crypto from "crypto";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordResetSuccessEmail,
} from "../services/email.service.js";
import { authenticate } from "../middleware/auth.js";
import { PLAN_LIMITS, getUserLimits } from "../utils/quota.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  agreeTerms: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

const onboardingSchema = z.object({
  companyName: z.string().min(2).max(255),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  phoneNumber: z.string().min(5).max(50),
  useCase: z.string().min(2).max(100),
  companyAddress: z.string().optional(),
  companyAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTokens(app: FastifyInstance, userId: string, email: string, plan: string, role: string) {
  const accessToken = app.jwt.sign({ sub: userId, email, plan, role });
  const refreshToken = nanoid(64);
  return { accessToken, refreshToken };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/register — tighter rate limit: 10/hour per IP
  app.post("/register", {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (req, reply) => {
    const body = registerSchema.parse(req.body);

    // Check for disposable email (simple domain blocklist)
    const disposableDomains = ["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com"];
    const emailDomain = body.email.split("@")[1];
    if (disposableDomains.includes(emailDomain)) {
      return reply.code(400).send({ success: false, error: "Disposable email addresses are not allowed." });
    }

    if (!body.agreeTerms) {
      return reply.code(400).send({ success: false, error: "You must agree to the Terms of Service and Privacy Policy to create an account." });
    }

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });
    if (existing) {
      return reply.code(409).send({ success: false, error: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const verificationToken = nanoid(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
        passwordHash,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: "v1.0",
        registrationIpAddress: req.ip,
      })
      .returning({ id: users.id, email: users.email, name: users.name, plan: users.plan });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(user.email, body.name, verificationToken).catch((err) => {
      console.error(`[Auth] Failed to send verification email to ${user.email}:`, err.message);
    });

    return reply.code(201).send({
      success: true,
      data: { user, message: "Account created! Check your email for a verification link." },
    });
  });

  // POST /v1/auth/verify-email
  app.post("/verify-email", async (req, reply) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return reply.code(400).send({ success: false, error: "Invalid or expired verification token." });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name ?? "").catch((err) => {
      console.error(`[Auth] Failed to send welcome email to ${user.email}:`, err.message);
    });

    return reply.send({ success: true, data: { message: "Email verified successfully! Welcome to Qwik Mailer." } });
  });

  // POST /v1/auth/login — strict rate limit: 10 attempts per 15 min per IP
  app.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ success: false, error: "Invalid email or password." });
    }

    if (!user.emailVerified) {
      return reply.code(403).send({ success: false, error: "Please verify your email before logging in." });
    }

    if (user.isSuspended) {
      return reply.code(403).send({ success: false, error: `Account suspended: ${user.suspendReason}` });
    }

    // TOTP check
    if (user.totpEnabled) {
      if (!body.totpCode) {
        return reply.code(200).send({ success: true, data: { requires2FA: true } });
      }
      // using top-level import
      const isValid = authenticator.verify({ token: body.totpCode, secret: user.totpSecret! });
      if (!isValid) {
        return reply.code(401).send({ success: false, error: "Invalid 2FA code." });
      }
    }

    const { accessToken, refreshToken } = generateTokens(app, user.id, user.email, user.plan, user.role);

    // Store refresh token hash
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(',')[0] || req.ip || "Unknown IP";
    const parser = new (UAParser as any)(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
    const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
    const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";

    const existingSession = await db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.userId, user.id), or(eq(refreshTokens.ipAddress, ipAddress), eq(refreshTokens.userAgent, userAgent))),
    });

    if (!existingSession) {
      sendNewLoginAlertEmail(user.email, user.name || "", deviceName, deviceOs, browserName, ipAddress, new Date().toLocaleString()).catch(err => console.error("Failed to send login alert", err));
    }

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress,
      userAgent,
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          role: user.role,
          reputationScore: user.reputationScore,
          onboardingCompleted: user.onboardingCompleted,
        },
      },
    });
  });

  // POST /v1/auth/refresh
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const stored = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, tokenHash),
    });

    if (!stored || stored.expiresAt < new Date()) {
      return reply.code(401).send({ success: false, error: "Invalid or expired refresh token." });
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, stored.userId) });
    if (!user) return reply.code(401).send({ success: false, error: "User not found." });

    const tokens = generateTokens(app, user.id, user.email, user.plan, user.role);

    // Rotate refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    const newHash = crypto.createHash("sha256").update(tokens.refreshToken).digest("hex");
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return reply.send({ success: true, data: tokens });
  });

  // POST /v1/auth/resend-verification
  app.post("/resend-verification", {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } }
  }, async (req, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    // Always return success to prevent email enumeration
    if (user && !user.emailVerified) {
      const verificationToken = nanoid(32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.update(users).set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      sendVerificationEmail(user.email, user.name ?? "", verificationToken).catch((err) => {
        console.error(`[Auth] Failed to resend verification email to ${user.email}:`, err.message);
      });
    }

    return reply.send({ success: true, data: { message: "If that email is unverified, a new verification link has been sent." } });
  });

  // POST /v1/auth/forgot-password — prevent email enumeration + brute force
  app.post("/forgot-password", {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (req, reply) => {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    // Always return success (prevents email enumeration)
    if (user) {
      const token = nanoid(32);
      await db.update(users).set({
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1h
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      sendPasswordResetEmail(user.email, user.name ?? "", token).catch((err) => {
        console.error(`[Auth] Failed to send password reset email to ${user.email}:`, err.message);
      });
    }

    return reply.send({ success: true, data: { message: "If that email exists, a reset link was sent." } });
  });

  // POST /v1/auth/reset-password
  app.post("/reset-password", async (req, reply) => {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({ where: eq(users.passwordResetToken, token) });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return reply.code(400).send({ success: false, error: "Invalid or expired reset token." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    sendPasswordResetSuccessEmail(user.email, user.name ?? "").catch((err) => {
      console.error(`[Auth] Failed to send password reset success email to ${user.email}:`, err.message);
    });

    return reply.send({ success: true, data: { message: "Password reset successfully. You can now log in." } });
  });

  // GET /v1/auth/me/reputation-logs
  app.get("/me/reputation-logs", { preHandler: authenticate }, async (req, reply) => {
    const payload = req.user as { sub: string };
    const logs = await db.query.reputationLogs.findMany({
      where: eq(reputationLogs.userId, payload.sub),
      orderBy: [desc(reputationLogs.createdAt)],
    });
    return reply.send({ success: true, data: logs });
  });

  // GET /v1/auth/me
  app.get("/me", {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify(); } catch { return reply.code(401).send({ success: false, error: "Unauthorized" }); }
    },
  }, async (req, reply) => {
    const payload = req.user as { sub: string };
    const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!user) return reply.code(404).send({ success: false, error: "User not found" });

    return reply.send({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        companyName: user.companyName,
        websiteUrl: user.websiteUrl,
        phoneNumber: user.phoneNumber,
        useCase: user.useCase,
        emailVerified: user.emailVerified,
        totpEnabled: user.totpEnabled,
        reputationScore: user.reputationScore,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        monthlyEmailCount: user.monthlyEmailCount,
        billingPeriodStart: user.billingPeriodStart,
        dailyEmailCount: user.dailyEmailCount,
        dailyPeriodStart: user.dailyPeriodStart,
        planLimit: getUserLimits(user).monthlyLimit,
        dailyLimit: getUserLimits(user).dailyLimit,
        companyAddress: user.companyAddress,
        companyAddress2: user.companyAddress2,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        country: user.country,
      },
    });
  });

  // PUT /v1/auth/me — update profile
  app.put("/me", {
    preHandler: authenticate,
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (req, reply) => {
    const user = req.user as { sub: string };
    const body = z.object({ 
      name: z.string().min(2).max(100).optional(),
      companyAddress: z.string().optional(),
      companyAddress2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    }).parse(req.body);

    await db.update(users).set({ 
      ...body, 
      updatedAt: new Date() 
    }).where(eq(users.id, user.sub));

    return reply.send({ success: true, data: { message: "Profile updated." } });
  });

  // POST /v1/auth/onboarding
  app.post("/onboarding", {
    preHandler: authenticate,
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } }
  }, async (req, reply) => {
    const user = req.user as { sub: string };
    const body = onboardingSchema.parse(req.body);

    await db.update(users).set({
      companyName: body.companyName,
      websiteUrl: body.websiteUrl || null,
      phoneNumber: body.phoneNumber,
      useCase: body.useCase,
      companyAddress: body.companyAddress,
      companyAddress2: body.companyAddress2,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country,
      onboardingCompleted: true,
      updatedAt: new Date(),
    }).where(eq(users.id, user.sub));

    return reply.send({ success: true, data: { message: "Onboarding completed successfully." } });
  });

  // POST /v1/auth/change-password
  app.post("/change-password", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(100),
    }).parse(req.body);

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (!dbUser) return reply.code(404).send({ success: false, error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash!);
    if (!valid) return reply.code(400).send({ success: false, error: "Current password is incorrect." });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.sub));

    return reply.send({ success: true, data: { message: "Password changed successfully." } });
  });

  // ─── TOTP (2FA) ─────────────────────────────────────────────────────────────

  // GET /v1/auth/totp/setup
  app.get("/totp/setup", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string, email: string };
    // using top-level imports

    const secret = authenticator.generateSecret();
    
    // Store temporarily
    await db.update(users).set({ tempTotpSecret: secret }).where(eq(users.id, user.sub));

    const otpauth = authenticator.keyuri(user.email, "Qwik Mailer", secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    return reply.send({ success: true, data: { secret, qrCodeUrl } });
  });

  // POST /v1/auth/totp/verify
  app.post("/totp/verify", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { token } = z.object({ secret: z.string().optional(), token: z.string() }).parse(req.body);

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (!dbUser || !dbUser.tempTotpSecret) {
      return reply.code(400).send({ success: false, error: "TOTP setup not initialized." });
    }

    // using top-level import
    const isValid = authenticator.verify({ token, secret: dbUser.tempTotpSecret });

    if (!isValid) {
      return reply.code(400).send({ success: false, error: "Invalid 2FA code." });
    }

    await db.update(users)
      .set({ totpEnabled: true, totpSecret: dbUser.tempTotpSecret, tempTotpSecret: null, updatedAt: new Date() })
      .where(eq(users.id, user.sub));
    if (dbUser) {
      const userAgent = req.headers["user-agent"] || "";
      const parser = new (UAParser as any)(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();
      const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
      const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
      const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";
      
      send2FAEnabledEmail(dbUser.email, dbUser.name || "", deviceName, deviceOs, browserName).catch(console.error);
    }

    return reply.send({ success: true, data: { message: "2FA enabled successfully." } });
  });

  // POST /v1/auth/totp/disable
  app.post("/totp/disable", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (!dbUser || !dbUser.totpEnabled) {
      return reply.code(400).send({ success: false, error: "2FA is not enabled." });
    }

    // using top-level import
    const isValid = authenticator.verify({ token, secret: dbUser.totpSecret! });

    if (!isValid) {
      return reply.code(400).send({ success: false, error: "Invalid 2FA code." });
    }

    await db.update(users)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(users.id, user.sub));

    const userAgent = req.headers["user-agent"] || "";
    const parser = new (UAParser as any)(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
    const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
    const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";
    
    send2FADisabledEmail(dbUser.email, dbUser.name || "", deviceName, deviceOs, browserName).catch(console.error);

    return reply.send({ success: true, data: { message: "2FA disabled successfully." } });
  });
}
