import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import IORedis from "ioredis";
import path from "path";
import { fileURLToPath } from "url";

import { authRoutes } from "./routes/auth.js";
import passkeysRoutes from "./routes/passkeys.js";
import { emailRoutes } from "./routes/emails.js";
import { domainRoutes } from "./routes/domains.js";
import { senderRoutes } from "./routes/senders.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { templateRoutes } from "./routes/templates.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { adminRoutes } from "./routes/admin.js";
import { trackRoutes } from "./routes/track.js";
import { suppressionRoutes } from "./routes/suppression.js";
import { certificateRoutes } from "./routes/certificates.js";
import { aiRoutes } from "./routes/ai.js";
import { securityLogRoutes } from "./routes/security-logs.js";
import { teamRoutes } from "./routes/teams.js";
import { inboundRoutes } from "./routes/inbound.js";
import { listRoutes } from "./routes/lists.js";
import { marketingRoutes } from "./routes/marketing.js";
import { supportRoutes } from "./routes/support.js";
import { sesWebhookRoutes } from "./routes/ses-webhooks.js";
import { formRoutes } from "./routes/forms.js";
import { contactRoutes } from "./routes/contacts.js";
import { errorHandler } from "./middleware/error-handler.js";

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Redis Connection (Resilient) ─────────────────────────────────────────────

async function createResilientRedis(): Promise<IORedis | null> {
  if (!process.env.REDIS_URL) return null;

  const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts on startup
      if (times > 3) return null;
      return Math.min(times * 500, 2000);
    },
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.ping();
    console.log("✅ Redis connected successfully");
    return redis;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  Redis unavailable (${msg}) — rate limiting will use in-memory store`);
    redis.disconnect();
    return null;
  }
}

export async function buildApp() {
  const app = Fastify({
    bodyLimit: 104857600, // 100MB body limit for bulk-send payloads
    logger: {
      level: process.env.NODE_ENV === "production" ? "warn" : "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Redis (optional — graceful fallback) ────────────────────────────────
  const redis = await createResilientRedis();

  // Decorate fastify with redis for use in routes (can be null)
  app.decorate("redis", redis);

  // ─── Plugins ────────────────────────────────────────────────────────────
  await app.register(helmet, { global: true });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server, mobile apps)
      if (!origin) return cb(null, true);

      const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) ?? [];

      // Always allow the dashboard itself
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // Allow any origin for API-key-authenticated requests (server-to-server & external websites)
      // This is safe because the X-API-Key provides authentication
      return cb(null, true);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Team-ID"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(cookie);

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // Serve static uploads
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "uploads"),
    prefix: "/uploads/",
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "15m" },
  });

  // Rate limiting — uses Redis if available, otherwise in-memory store
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: "1 minute",
    ...(redis ? { redis } : {}),
    keyGenerator: (req) => {
      return req.headers["x-api-key"] as string ?? req.ip;
    },
  });

  // ─── Error Handler ───────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ─── Health Check ────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    redis: redis ? "connected" : "unavailable (using memory store)",
  }));

  // ─── Routes ──────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(passkeysRoutes, { prefix: "/v1/auth/passkey" });
  await app.register(emailRoutes, { prefix: "/v1" });
  await app.register(domainRoutes, { prefix: "/v1/domains" });
  await app.register(senderRoutes, { prefix: "/v1/senders" });
  await app.register(apiKeyRoutes, { prefix: "/v1/api-keys" });
  await app.register(templateRoutes, { prefix: "/v1/templates" });
  await app.register(analyticsRoutes, { prefix: "/v1/analytics" });
  await app.register(webhookRoutes, { prefix: "/v1/webhooks" });
  await app.register(adminRoutes, { prefix: "/v1/admin" });
  await app.register(trackRoutes, { prefix: "/v1/track" });
  await app.register(suppressionRoutes, { prefix: "/v1/suppression-list" });
  await app.register(certificateRoutes, { prefix: "/v1/certificates" });
  await app.register(aiRoutes, { prefix: "/v1/ai" });
  await app.register(securityLogRoutes, { prefix: "/v1/security-logs" });
  await app.register(teamRoutes, { prefix: "/v1/teams" });
  app.register(inboundRoutes, { prefix: "/v1/inbound" });
  await app.register(listRoutes, { prefix: "/v1/lists" });
  await app.register(marketingRoutes, { prefix: "/v1/marketing" });
  await app.register(supportRoutes, { prefix: "/v1/support" });
  await app.register(sesWebhookRoutes, { prefix: "/v1/webhooks" });
  await app.register(formRoutes, { prefix: "/v1/forms" });
  await app.register(contactRoutes, { prefix: "/v1/contacts" });

  return app;
}
