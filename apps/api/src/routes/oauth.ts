import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db, users, teams } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
  ? process.env.NEXT_PUBLIC_APP_URL
  : "https://www.qwikmailer.in";

export async function oauthRoutes(app: FastifyInstance) {
  // ─── 1. RFC 9728: OAuth Protected Resource Metadata ────────────────────────
  const protectedResourceMetadata = {
    resource: `${API_URL}/mcp`,
    authorization_servers: [API_URL],
    scopes_supported: ["forms:read", "forms:write", "submissions:read", "forms:delete"],
    bearer_methods_supported: ["header"],
  };

  app.get("/.well-known/oauth-protected-resource", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(protectedResourceMetadata);
  });

  // RFC 9728 §3.1: Path-based metadata discovery for resource https://api.qwikmailer.in/mcp
  app.get("/.well-known/oauth-protected-resource/mcp", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(protectedResourceMetadata);
  });

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
    scopes_supported: ["forms:read", "forms:write", "submissions:read", "forms:delete", "offline_access"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256", "plain"],
  };

  app.get("/.well-known/oauth-authorization-server", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  app.get("/.well-known/oauth-authorization-server/mcp", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  app.get("/oauth/.well-known/oauth-authorization-server", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  // OpenID Connect Configuration discovery aliases requested by clients (OpenAI, Claude, etc.)
  app.get("/.well-known/openid-configuration", async (_, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(authorizationServerMetadata);
  });

  app.get("/mcp/.well-known/openid-configuration", async (_, reply) => {
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
    try {
      const body = (req.body || {}) as any;
      const clientName = body.client_name || "AI Assistant";
      const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];

      const clientId = `qm_client_${crypto.randomBytes(12).toString("hex")}`;
      const clientSecret = `qm_sec_${crypto.randomBytes(24).toString("hex")}`;
      const pgArrayLiteral = `{${redirectUris.map((u: string) => `"${u.replace(/"/g, '\\"')}"`).join(",")}}`;

      await db.execute(sql`
        INSERT INTO oauth_clients (client_id, client_secret, client_name, redirect_uris)
        VALUES (${clientId}, ${clientSecret}, ${clientName}, ${pgArrayLiteral}::text[])
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
    } catch (err: any) {
      req.log.error(err, "OAuth register error");
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // ─── 4. Client Info Lookup (For consent UI) ───────────────────────────────
  app.get("/v1/oauth/client-info", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const clientId = (req.query as any)?.client_id;
    if (!clientId) {
      return reply.code(400).send({ error: "missing client_id" });
    }

    if (clientId === "chatgpt" || clientId.toLowerCase().includes("chatgpt")) {
      return reply.send({
        client_name: "ChatGPT",
        client_id: clientId,
        icon: "chatgpt",
      });
    }

    if (clientId === "claude" || clientId.toLowerCase().includes("claude")) {
      return reply.send({
        client_name: "Claude",
        client_id: clientId,
        icon: "claude",
      });
    }

    const res = await db.execute(sql`SELECT client_name, client_id FROM oauth_clients WHERE client_id = ${clientId}`);
    if (!res.length) {
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
    try {
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

      if (!clientId) {
        return reply.code(400).send({ success: false, error: "Missing client_id" });
      }

      // Default to user's first available team if not explicitly passed
      let teamId = requestedTeamId || req.teamId;
      if (!teamId && userId) {
        const teamRes = await db.execute(sql`SELECT id FROM teams WHERE owner_id = ${userId} LIMIT 1`);
        if (teamRes.length && (teamRes[0] as any)?.id) {
          teamId = (teamRes[0] as any).id as string;
        }
      }

      if (!teamId) {
        return reply.code(400).send({ success: false, error: "Please select a Project/Team to grant access." });
      }

      const code = `qmc_${crypto.randomBytes(24).toString("hex")}`;
      const expiresAtIso = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes TTL

      await db.execute(sql`
        INSERT INTO oauth_codes (
          code, client_id, user_id, team_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at
        ) VALUES (
          ${code}, ${clientId}, ${userId}, ${teamId}, ${redirectUri || ""}, ${codeChallenge || null}, ${codeChallengeMethod || null}, ${scope || "forms:read forms:write"}, ${expiresAtIso}::timestamp
        )
      `);

      return reply.send({
        success: true,
        code,
        redirect_uri: redirectUri,
      });
    } catch (err: any) {
      req.log.error(err, "OAuth consent error");
      return reply.code(500).send({ success: false, error: err.message || "Failed to process consent" });
    }
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
    reply.header("Content-Type", "application/json;charset=UTF-8");
    reply.header("Cache-Control", "no-store");
    reply.header("Pragma", "no-cache");

    try {
      const body = (req.body || {}) as any;
      let clientId = body.client_id;
      let clientSecret = body.client_secret;

      // Extract client credentials from Basic Auth header if present (Standard OAuth 2.0 RFC 6749)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Basic ")) {
        try {
          const credentials = Buffer.from(authHeader.replace("Basic ", "").trim(), "base64").toString("utf-8");
          const colonIndex = credentials.indexOf(":");
          if (colonIndex !== -1) {
            clientId = credentials.substring(0, colonIndex);
            clientSecret = credentials.substring(colonIndex + 1);
          }
        } catch {}
      }

      const grantType = body.grant_type;

      if (grantType === "authorization_code") {
        const { code, redirect_uri: redirectUri, code_verifier: codeVerifier } = body;

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
        const expiresAtIso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days validity

        await db.execute(sql`
          INSERT INTO oauth_tokens (token, refresh_token, client_id, user_id, team_id, scope, expires_at)
          VALUES (${accessToken}, ${refreshToken}, ${codeRow.client_id}, ${codeRow.user_id}, ${codeRow.team_id}, ${codeRow.scope || "forms:read forms:write"}, ${expiresAtIso}::timestamp)
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
        const expiresAtIso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        await db.execute(sql`
          UPDATE oauth_tokens
          SET token = ${newAccessToken}, expires_at = ${expiresAtIso}::timestamp
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
    } catch (err: any) {
      req.log.error(err, "OAuth token exchange error");
      return reply.code(500).send({ error: "server_error", error_description: err.message });
    }
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

  // ─── 8. Connected Apps Management (List & Revoke from Settings) ─────────────
  app.get("/v1/oauth/connected-apps", { preHandler: authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const res = await db.execute(sql`
      SELECT 
        t.token,
        t.client_id,
        t.scope,
        t.created_at,
        t.expires_at,
        tm.name as team_name,
        tm.id as team_id,
        c.client_name
      FROM oauth_tokens t
      LEFT JOIN oauth_clients c ON c.client_id = t.client_id
      LEFT JOIN teams tm ON tm.id = t.team_id
      WHERE t.user_id = ${userId} AND t.expires_at > now()
      ORDER BY t.created_at DESC
    `);

    const toIsoUtc = (val: any) => {
      if (!val) return new Date().toISOString();
      if (val instanceof Date) return val.toISOString();
      const str = String(val).trim();
      if (str.endsWith("Z") || str.includes("+")) return new Date(str).toISOString();
      return new Date(str.replace(" ", "T") + "Z").toISOString();
    };

    const apps = res.map((row: any) => {
      let displayName = row.client_name;
      if (!displayName) {
        if (row.client_id === "chatgpt" || String(row.client_id).includes("chatgpt")) displayName = "ChatGPT";
        else if (row.client_id === "claude" || String(row.client_id).includes("claude")) displayName = "Claude";
        else displayName = "AI Connector";
      }

      return {
        id: row.token,
        clientName: displayName,
        clientId: row.client_id,
        teamName: row.team_name || "Default Project",
        teamId: row.team_id,
        scope: row.scope || "forms:read forms:write",
        createdAt: toIsoUtc(row.created_at),
        expiresAt: toIsoUtc(row.expires_at),
      };
    });

    return reply.send({ success: true, apps });
  });

  app.delete("/v1/oauth/connected-apps/:tokenId", { preHandler: authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    const { tokenId } = req.params as { tokenId: string };

    if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

    await db.execute(sql`
      DELETE FROM oauth_tokens
      WHERE (token = ${tokenId} OR client_id = ${tokenId}) AND user_id = ${userId}
    `);

    return reply.send({ success: true, message: "Connected app revoked successfully" });
  });

  app.patch("/v1/oauth/connected-apps/:tokenId", { preHandler: authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    const { tokenId } = req.params as { tokenId: string };
    const body = (req.body || {}) as { scope?: string | string[]; teamId?: string };

    if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

    let scopeStr = "";
    if (Array.isArray(body.scope)) {
      scopeStr = body.scope.filter(Boolean).join(" ").trim();
    } else if (typeof body.scope === "string") {
      scopeStr = body.scope.trim();
    }

    if (!scopeStr) {
      return reply.code(400).send({ success: false, error: "At least one permission scope is required" });
    }

    const existing = await db.execute(sql`
      SELECT token, client_id, team_id, scope 
      FROM oauth_tokens 
      WHERE (token = ${tokenId} OR client_id = ${tokenId}) AND user_id = ${userId}
      LIMIT 1
    `);

    if (!existing.length) {
      return reply.code(404).send({ success: false, error: "Connected application not found" });
    }

    const tokenRow = existing[0] as any;
    let targetTeamId = tokenRow.team_id;

    if (body.teamId && body.teamId !== targetTeamId) {
      const teamCheck = await db.execute(sql`
        SELECT id FROM teams WHERE id = ${body.teamId}
      `);
      if (teamCheck.length > 0) {
        targetTeamId = body.teamId;
      }
    }

    await db.execute(sql`
      UPDATE oauth_tokens
      SET scope = ${scopeStr},
          team_id = ${targetTeamId}
      WHERE token = ${tokenRow.token} AND user_id = ${userId}
    `);

    const teamRes = await db.execute(sql`
      SELECT name FROM teams WHERE id = ${targetTeamId}
    `);
    const teamName = teamRes.length ? (teamRes[0] as any).name : "Default Project";

    return reply.send({
      success: true,
      message: "Permissions updated successfully",
      scope: scopeStr,
      teamId: targetTeamId,
      teamName,
    });
  });
}
