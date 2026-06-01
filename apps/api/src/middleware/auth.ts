import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Support both Bearer token (JWT) and API key
    const apiKey = req.headers["x-api-key"] as string;

    if (apiKey) {
      const { validateApiKey } = await import("../services/api-key.service.js");
      const user = await validateApiKey(apiKey, req.ip);
      if (!user) {
        return reply.code(401).send({ success: false, error: "Invalid API key" });
      }
      req.user = { ...user, source: "api" };
      return;
    }

    await req.jwtVerify();
    req.user = { ...(req.user as any), source: "dashboard" };
  } catch (err) {
    console.error("Auth error:", err);
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }
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
