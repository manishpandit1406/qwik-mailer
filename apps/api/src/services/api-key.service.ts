import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, apiKeys, users } from "@qwikmailer/db";

export async function validateApiKey(rawKey: string, reqIp?: string) {
  if (!rawKey.startsWith("mf_live_")) return null;

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 12);

  const key = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  });

  if (!key || !key.isActive) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Check IP Allowlist
  if (key.ipAllowlist && key.ipAllowlist.length > 0 && reqIp) {
    if (!key.ipAllowlist.includes(reqIp)) {
      console.warn(`API Key IP rejected: ${reqIp} not in allowlist`);
      return null;
    }
  }

  // Update last used
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));

  const { teams } = await import("@qwikmailer/db");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, key.teamId!) });
  if (!team) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, team.ownerId) });
  if (!user || !user.isActive || user.isSuspended) return null;

  return {
    sub: user.id,
    email: user.email,
    plan: user.plan,
    role: user.role,
    permissions: (key as any).permissions,
    teamId: key.teamId,
  };
}
