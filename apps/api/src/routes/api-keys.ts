import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { db, apiKeys } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import { nanoid } from "nanoid";

export async function apiKeyRoutes(app: FastifyInstance) {
  // GET /v1/api-keys
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, user.sub),
    });
    // Never return the full hash
    return reply.send({
      success: true,
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      })),
    });
  });

  // POST /v1/api-keys
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { name, expiresAt } = z
      .object({
        name: z.string().min(1).max(100),
        expiresAt: z.string().datetime().optional(),
      })
      .parse(req.body);

    // Generate key: mf_live_<random>
    const rawKey = `mf_live_${nanoid(32)}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const [key] = await db
      .insert(apiKeys)
      .values({
        userId: user.sub,
        name,
        keyHash,
        keyPrefix,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      .returning({ id: apiKeys.id, name: apiKeys.name });

    // Return the raw key ONCE — it won't be shown again
    return reply.code(201).send({
      success: true,
      data: {
        id: key.id,
        name: key.name,
        key: rawKey,
        prefix: keyPrefix,
        message: "Save this key now — it will not be shown again.",
      },
    });
  });

  // DELETE /v1/api-keys/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, id), eq(apiKeys.userId, user.sub)),
    });
    if (!key) return reply.code(404).send({ success: false, error: "API key not found" });

    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
    return reply.send({ success: true, data: { message: "API key revoked." } });
  });
}
