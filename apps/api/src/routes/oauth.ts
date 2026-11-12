import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db, users, teams } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qwikmailer.in";

export async function oauthRoutes(app: FastifyInstance) {
  // ─── 1. RFC 9728: OAuth Protected Resource Metadata ────────────────────────
  const protectedResourceMetadata = {
    resource: `${API_URL}/mcp`,
    authorization_servers: [API_URL],
    scopes_supported: ["forms:read", "forms:write"],
    bearer_methods_supported: ["header"],
  };

  app.get("/.well-known/oauth-protected-resource", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(protectedResourceMetadata);
  });

  // Also handle sub-path for /mcp
  app.get("/mcp/.well-known/oauth-protected-resource", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(protectedResourceMetadata);
  });

  // ─── 2. RFC 8414: OAuth 2.0 Authorization Server Metadata ─────────────────
  const authorizationServerMetadata = {
    issuer: API_URL,
    authorization_endpoint: `${APP_URL}/oauth/authorize`,
    token_endpoint: `${API_URL}/v1/oauth/token`,
    registration_endpoint: `${API_URL}/v1/oauth/register`,
    userinfo_endpoint: `${API_URL}/v1/oauth/userinfo`,
    scopes_supported: ["forms:read", "forms:write", "offline_access"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256", "plain"],
  };

  app.get("/.well-known/oauth-authorization-server", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  app.get("/oauth/.well-known/oauth-authorization-server", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  // ─── 3. RFC 7591: Dynamic Client Registration (Claude / AI Clients) ───────
  app.options("/v1/oauth/register", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "*");
    reply.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    return reply.status(204).send();
  });

  app.post("/v1/oauth/register", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const body = (req.body || {}) as any;
    const clientName = body.client_name || "AI Assistant";
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];

    const clientId = `qm_client_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = `qm_sec_${crypto.randomBytes(24).toString("hex")}`;

    await db.execute(sql`
      INSERT INTO oauth_clients (client_id, client_secret, client_name, redirect_uris)
      VALUES (${clientId}, ${clientSecret}, ${clientName}, ${redirectUris}::text[])
    `);

    return reply.status(201).send({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    });
  });

  // ─── 4. Client Info Lookup (For consent UI) ───────────────────────────────
  app.get("/v1/oauth/client-info", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const clientId = (req.query as any)?.client_id;
    if (!clientId) {
      return reply.code(400).send({ error: "missing client_id" });
    }

    // Known static clients (ChatGPT / Claude / QwikForms)
    if (clientId === "chatgpt" || clientId === "claude" || clientId === "qwikforms") {
      return reply.send({
        client_name: clientId === "chatgpt" ? "ChatGPT" : clientId === "claude" ? "Claude" : "QwikForms Connector",
        client_id: clientId,
      });
    }

    const res = await db.execute(sql`SELECT client_name, client_id FROM oauth_clients WHERE client_id = ${clientId}`);
    if (!res.length) {
      // Default fallback info so user flow never breaks
      return reply.send({
        client_name: "AI Connector",
        client_id: clientId,
      });
    }

    return reply.send(res[0]);
  });

  // ─── 5. Consent & Code Issuance (Called by Web Authorization Page) ──────────
  app.options("/v1/oauth/consent", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "*");
    reply.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    return reply.status(204).send();
  });

  app.post("/v1/oauth/consent", { preHandler: authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    const body = (req.body || {}) as any;

    const {
      client_id: clientId,
      redirect_uri: redirectUri,
      team_id: requestedTeamId,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope,
    } = body;

    if (!clientId || !redirectUri) {
      return reply.code(400).send({ success: false, error: "Missing client_id or redirect_uri" });
    }

    // Default to req.teamId if not explicitly passed
    const teamId = requestedTeamId || req.teamId;
    if (!teamId) {
      return reply.code(400).send({ success: false, error: "Active team context is required" });
    }

    const code = `qmc_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    await db.execute(sql`
      INSERT INTO oauth_codes (
        code, client_id, user_id, team_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at
      ) VALUES (
        ${code}, ${clientId}, ${userId}, ${teamId}, ${redirectUri}, ${codeChallenge || null}, ${codeChallengeMethod || null}, ${scope || "forms:read forms:write"}, ${expiresAt}
      )
    `);

    return reply.send({
      success: true,
      code,
      redirect_uri: redirectUri,
    });
  });

  // ─── 6. RFC 6749: Token Exchange Endpoint ──────────────────────────────────
  app.options("/v1/oauth/token", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "*");
    reply.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    return reply.status(204).send();
  });

  app.post("/v1/oauth/token", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Content-Type", "application/json");

    // RFC 6749 allows body as application/x-www-form-urlencoded or application/json
    const body = (req.body || {}) as any;
    const grantType = body.grant_type;

    if (grantType === "authorization_code") {
      const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = body;

      if (!code) {
        return reply.code(400).send({ error: "invalid_request", error_description: "Missing code" });
      }

      const codeRes = await db.execute(sql`
        SELECT * FROM oauth_codes WHERE code = ${code} AND expires_at > now()
      `);

      if (!codeRes.length) {
        return reply.code(400).send({ error: "invalid_grant", error_description: "Authorization code invalid or expired" });
      }

      const codeRow = codeRes[0] as any;

      // Verify PKCE if present
      if (codeRow.code_challenge) {
        if (!codeVerifier) {
          return reply.code(400).send({ error: "invalid_grant", error_description: "Missing code_verifier for PKCE" });
        }

        const method = (codeRow.code_challenge_method || "S256").toUpperCase();
        let computedChallenge = "";
        if (method === "S256") {
          computedChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
        } else {
          computedChallenge = codeVerifier;
        }

        if (computedChallenge !== codeRow.code_challenge) {
          return reply.code(400).send({ error: "invalid_grant", error_description: "PKCE verification failed" });
        }
      }

      // Delete code (one-time use)
      await db.execute(sql`DELETE FROM oauth_codes WHERE code = ${code}`);

      // Generate Access Token and Refresh Token
      const accessToken = `qm_at_${crypto.randomBytes(32).toString("hex")}`;
      const refreshToken = `qm_rt_${crypto.randomBytes(32).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days validity

      await db.execute(sql`
        INSERT INTO oauth_tokens (token, refresh_token, client_id, user_id, team_id, scope, expires_at)
        VALUES (${accessToken}, ${refreshToken}, ${codeRow.client_id}, ${codeRow.user_id}, ${codeRow.team_id}, ${codeRow.scope || "forms:read forms:write"}, ${expiresAt})
      `);

      return reply.send({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 90 * 24 * 60 * 60,
        refresh_token: refreshToken,
        scope: codeRow.scope || "forms:read forms:write",
      });
    }

    if (grantType === "refresh_token") {
      const { refresh_token: refreshToken } = body;
      if (!refreshToken) {
        return reply.code(400).send({ error: "invalid_request", error_description: "Missing refresh_token" });
      }

      const tokenRes = await db.execute(sql`
        SELECT * FROM oauth_tokens WHERE refresh_token = ${refreshToken} AND expires_at > now()
      `);

      if (!tokenRes.length) {
        return reply.code(400).send({ error: "invalid_grant", error_description: "Invalid or expired refresh token" });
      }

      const existing = tokenRes[0] as any;
      const newAccessToken = `qm_at_${crypto.randomBytes(32).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await db.execute(sql`
        UPDATE oauth_tokens
        SET token = ${newAccessToken}, expires_at = ${expiresAt}
        WHERE refresh_token = ${refreshToken}
      `);

      return reply.send({
        access_token: newAccessToken,
        token_type: "Bearer",
        expires_in: 90 * 24 * 60 * 60,
        refresh_token: refreshToken,
        scope: existing.scope,
      });
    }

    return reply.code(400).send({ error: "unsupported_grant_type" });
  });

  // ─── 7. Userinfo Endpoint ──────────────────────────────────────────────────
  app.get("/v1/oauth/userinfo", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const tokenRes = await db.execute(sql`
      SELECT t.user_id, t.team_id, u.email, u.name, tm.name as team_name
      FROM oauth_tokens t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN teams tm ON tm.id = t.team_id
      WHERE t.token = ${token} AND t.expires_at > now()
    `);

    if (!tokenRes.length) {
      return reply.code(401).send({ error: "invalid_token" });
    }

    const row = tokenRes[0] as any;
    return reply.send({
      sub: row.user_id,
      email: row.email,
      name: row.name,
      team_id: row.team_id,
      team_name: row.team_name,
    });
  });
}
