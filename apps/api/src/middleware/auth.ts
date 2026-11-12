import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@qwikmailer/db";
import { teamMembers, users } from "@qwikmailer/db";
import { eq, and, sql } from "drizzle-orm";
import { validateApiKey } from "../services/api-key.service.js";

declare module "fastify" {
  interface FastifyRequest {
    teamId?: string;
    teamRole?: string;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Support both Bearer token (JWT), Bearer API Key, and X-API-Key header
    const authHeader = req.headers["authorization"] as string | undefined;
    const apiKey =
      (req.headers["x-api-key"] as string) ||
      (authHeader && authHeader.startsWith("Bearer mf_live_") ? authHeader.replace("Bearer ", "").trim() : undefined);

    // Support OAuth 2.0 Bearer Token (Claude, ChatGPT, etc.)
    if (authHeader && authHeader.startsWith("Bearer qm_at_")) {
      const oauthToken = authHeader.replace("Bearer ", "").trim();
      const oauthRes = await db.execute(sql`
        SELECT t.*, u.email, u.name, u.role, u.plan, u.is_active, u.is_suspended
        FROM oauth_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = ${oauthToken} AND t.expires_at > now()
      `);
      if (oauthRes.length) {
        const row = oauthRes[0] as any;
        if (!row.is_active || row.is_suspended) {
          return reply.code(401).send({ success: false, error: "Account inactive or suspended" });
        }
        req.user = {
          sub: row.user_id,
          email: row.email,
          role: row.role,
          plan: row.plan,
          source: "oauth",
        } as any;
        req.teamId = row.team_id;
        req.teamRole = "admin";
        return;
      }
      return reply.code(401).send({ success: false, error: "Invalid or expired OAuth token" });
    }

    if (apiKey) {
      // statically imported
      const user = await validateApiKey(apiKey, req.ip);
      if (!user) {
        return reply.code(401).send({ success: false, error: "Invalid API key" });
      }
      req.user = { ...user, source: "api" };
      req.teamId = user.teamId || undefined;
      req.teamRole = "admin"; // API keys have admin access to the team they belong to
      return;
    }

    await req.jwtVerify();
    
    // Check if user is active and not suspended
    const userId = (req.user as any).sub || (req.user as any).id;
    if (userId) {
      const userRec = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { isSuspended: true, isActive: true }
      });
      
      if (!userRec || !userRec.isActive) {
        return reply.code(401).send({ success: false, error: "Account is inactive" });
      }
      if (userRec.isSuspended) {
        return reply.code(403).send({ success: false, error: "Account suspended. Please contact support." });
      }
    }

    req.user = { ...(req.user as any), source: "dashboard" };

    // Resolve active team
    const requestedTeamId = req.headers["x-team-id"] as string;
    
    if (requestedTeamId) {
      const member = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, requestedTeamId),
          eq(teamMembers.userId, (req.user as any).sub)
        )
      });
      if (member) {
        req.teamId = member.teamId;
        req.teamRole = member.role;
      }
    }
    
    // If teamId wasn't set (no header or invalid header), fallback to first available team
    if (!req.teamId) {
      const member = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, (req.user as any).sub)
      });
      if (member) {
        req.teamId = member.teamId;
        req.teamRole = member.role;
      }
    }

  } catch (err) {
    console.error("Auth error:", err);
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }
}

export function requireTeamRole(roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.teamRole) {
      return reply.code(403).send({ success: false, error: "No active team context" });
    }
    if (!roles.includes(req.teamRole)) {
      return reply.code(403).send({ success: false, error: "Insufficient team permissions" });
    }
  };
}

export async function requireRole(roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
    if (!roles.includes((req.user as { role: string }).role)) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
  };
}

export function requirePermission(permission: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
    const userPermissions = (req.user as { permissions?: any }).permissions;
    if (userPermissions && Array.isArray(userPermissions)) {
      if (userPermissions.includes("all") || userPermissions.includes(permission)) {
        return;
      }
      return reply.code(403).send({ success: false, error: "Insufficient permissions for this API key" });
    }
  };
}
