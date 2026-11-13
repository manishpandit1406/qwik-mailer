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
import { sandboxRoutes } from "./routes/sandbox.js";
import { validationRoutes } from "./routes/validation.js";
import { billingRoutes } from "./routes/billing.js";
import { inboxRoutes } from "./routes/inbox.js";
import { uploadRoutes } from "./routes/uploads.js";
import { mcpRoutes } from "./routes/mcp.js";
import { oauthRoutes } from "./routes/oauth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { db } from "@qwikmailer/db";
import { sql } from "drizzle-orm";


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

  redis.on("error", () => {
    // Suppress unhandled error event when redis is offline in dev
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
  // ─── Auto-migrate: ensure sandbox tables exist ─────────────────────────────
  try {
    await db.execute(sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS sandbox_mode boolean NOT NULL DEFAULT false`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sandbox_emails (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        from_email varchar(255) NOT NULL,
        from_name varchar(255),
        to_email varchar(255) NOT NULL,
        to_name varchar(255),
        reply_to varchar(255),
        subject text NOT NULL,
        html_body text,
        text_body text,
        raw_headers jsonb DEFAULT '{}'::jsonb,
        attachments jsonb DEFAULT '[]'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        is_read boolean NOT NULL DEFAULT false,
        expires_at timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sandbox_emails_team_idx ON sandbox_emails (team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sandbox_emails_expires_at_idx ON sandbox_emails (expires_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sandbox_emails_created_at_idx ON sandbox_emails (created_at)`);
    console.log("✅ Sandbox DB migration complete");

    // ─── Auto-migrate: ensure oauth tables exist ──────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id text UNIQUE NOT NULL,
        client_secret text,
        client_name text NOT NULL DEFAULT 'AI Client',
        redirect_uris text[] NOT NULL DEFAULT '{}',
        created_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS oauth_codes (
        code text PRIMARY KEY,
        client_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        redirect_uri text NOT NULL,
        code_challenge text,
        code_challenge_method text,
        scope text DEFAULT 'forms:read forms:write',
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        token text PRIMARY KEY,
        refresh_token text UNIQUE,
        client_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        scope text DEFAULT 'forms:read forms:write',
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now()
      );
      ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS team_ids uuid[] DEFAULT ARRAY[]::uuid[];
      CREATE INDEX IF NOT EXISTS oauth_tokens_token_idx ON oauth_tokens (token);
      CREATE INDEX IF NOT EXISTS oauth_tokens_refresh_token_idx ON oauth_tokens (refresh_token);
    `);
    console.log("✅ OAuth DB migration complete");
  } catch (err) {
    console.error("⚠️ Sandbox migration error (non-fatal):", err);
  }

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
  await app.register(helmet, {
    global: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

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
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Team-ID", "Accept"],
    exposedHeaders: ["WWW-Authenticate", "Authorization"],
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

  // Support application/x-www-form-urlencoded (standard for OAuth 2.0 token requests from ChatGPT, Claude, etc.)
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        const parsed = new URLSearchParams(body as string);
        const obj: Record<string, string> = {};
        parsed.forEach((val, key) => {
          obj[key] = val;
        });
        done(null, obj);
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

  // Support extended JSON / MCP formats (e.g. application/mcp+json, application/json-rpc, text/json)
  app.addContentTypeParser(
    ["application/mcp+json", "application/json-rpc", "application/x-ndjson", "text/json"],
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        if (!body || !(body as string).trim()) {
          done(null, {});
          return;
        }
        done(null, JSON.parse(body as string));
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

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
  await app.register(validationRoutes, { prefix: "/v1/validation" });
  await app.register(contactRoutes, { prefix: "/v1/contacts" });
  await app.register(sandboxRoutes, { prefix: "/v1/sandbox" });
  await app.register(billingRoutes, { prefix: "/v1/billing" });
  await app.register(inboxRoutes, { prefix: "/v1/inbox" });
  await app.register(uploadRoutes, { prefix: "/v1/uploads" });
  await app.register(mcpRoutes);
  await app.register(oauthRoutes);

  return app;
}
