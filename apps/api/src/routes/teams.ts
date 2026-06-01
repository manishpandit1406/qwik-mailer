import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import crypto from "crypto";

// Raw SQL approach for team tables since schema might not have them exported yet
async function getTeamsByOwner(userId: string) {
  const result = await db.execute(
    sql`SELECT t.*, 
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
     FROM teams t 
     WHERE t.owner_id = ${userId} 
     ORDER BY t.created_at DESC`
  );
  return result;
}

export async function teamRoutes(app: FastifyInstance) {
  // GET /v1/teams - Get user's teams
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    try {
      const owned = await db.execute(
        sql`SELECT t.id, t.name, t.slug, t.created_at,
          (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
          'owner' as role
         FROM teams t WHERE t.owner_id = ${user.sub}`
      );
      const member = await db.execute(
        sql`SELECT t.id, t.name, t.slug, t.created_at, tm.role,
          (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) as member_count
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         WHERE tm.user_id = ${user.sub} AND t.owner_id != ${user.sub}`
      );
      return reply.send({ success: true, data: { owned: (owned as any).rows || owned, member: (member as any).rows || member } });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // POST /v1/teams - Create team
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      + "-" + crypto.randomBytes(3).toString("hex");

    try {
      const result = await db.execute(
        sql`INSERT INTO teams (owner_id, name, slug) VALUES (${user.sub}, ${name}, ${slug}) RETURNING *`
      );
      const team = Array.isArray(result) ? result[0] : (result as any).rows?.[0] || result[0];
      // Add owner as member
      await db.execute(
        sql`INSERT INTO team_members (team_id, user_id, role) VALUES (${team.id}, ${user.sub}, 'owner')`
      );
      return reply.code(201).send({ success: true, data: team });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // GET /v1/teams/:id/members
  app.get("/:id/members", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    try {
      // Verify access
      const access = await db.execute(
        sql`SELECT 1 FROM teams WHERE id = ${id} AND owner_id = ${user.sub} 
         UNION SELECT 1 FROM team_members WHERE team_id = ${id} AND user_id = ${user.sub}`
      );
      if (!(access as any).rows?.length && !(Array.isArray(access) && access.length > 0)) return reply.code(403).send({ success: false, error: "Access denied" });

      const members = await db.execute(
        sql`SELECT tm.id, tm.role, tm.joined_at, u.name, u.email, u.id as user_id
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = ${id}
         ORDER BY tm.joined_at ASC`
      );
      return reply.send({ success: true, data: (members as any).rows || members });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // POST /v1/teams/:id/invite
  app.post("/:id/invite", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(["admin", "member", "viewer"]).default("member"),
    }).parse(req.body);

    try {
      // Only owner/admin can invite
      const access = await db.execute(
        sql`SELECT role FROM team_members WHERE team_id = ${id} AND user_id = ${user.sub}`
      );
      const rows = (access as any).rows || access;
      const myRole = rows[0]?.role;
      if (!myRole || (myRole !== "owner" && myRole !== "admin")) {
        return reply.code(403).send({ success: false, error: "Only admins can invite members" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.execute(
        sql`INSERT INTO team_invites (team_id, invited_by, email, role, token, expires_at)
         VALUES (${id}, ${user.sub}, ${email}, ${role}, ${token}, ${expiresAt.toISOString()})
         ON CONFLICT (token) DO NOTHING`
      );

      const inviteLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${token}`;

      return reply.send({
        success: true,
        data: { email, role, inviteLink, token, expiresAt },
      });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // PATCH /v1/teams/:id/members/:memberId/role
  app.patch("/:id/members/:memberId/role", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, memberId } = req.params as { id: string; memberId: string };
    const { role } = z.object({ role: z.enum(["admin", "member", "viewer"]) }).parse(req.body);

    try {
      // Only owner can change roles
      const isOwner = await db.execute(
        sql`SELECT 1 FROM teams WHERE id = ${id} AND owner_id = ${user.sub}`
      );
      if (!(isOwner as any).rows?.length && !(Array.isArray(isOwner) && isOwner.length > 0)) return reply.code(403).send({ success: false, error: "Only owners can change roles" });

      await db.execute(
        sql`UPDATE team_members SET role = ${role} WHERE id = ${memberId} AND team_id = ${id}`
      );
      return reply.send({ success: true });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // DELETE /v1/teams/:id/members/:memberId
  app.delete("/:id/members/:memberId", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id, memberId } = req.params as { id: string; memberId: string };

    try {
      // Owner can remove anyone; members can remove themselves
      const isOwner = await db.execute(
        sql`SELECT 1 FROM teams WHERE id = ${id} AND owner_id = ${user.sub}`
      );
      const isSelf = await db.execute(
        sql`SELECT 1 FROM team_members WHERE id = ${memberId} AND user_id = ${user.sub}`
      );

      const ownerLen = (isOwner as any).rows?.length || (Array.isArray(isOwner) ? isOwner.length : 0);
      const selfLen = (isSelf as any).rows?.length || (Array.isArray(isSelf) ? isSelf.length : 0);

      if (!ownerLen && !selfLen) {
        return reply.code(403).send({ success: false, error: "Permission denied" });
      }

      await db.execute(sql`DELETE FROM team_members WHERE id = ${memberId} AND team_id = ${id}`);
      return reply.send({ success: true });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // DELETE /v1/teams/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    try {
      const result = await db.execute(
        sql`DELETE FROM teams WHERE id = ${id} AND owner_id = ${user.sub} RETURNING id`
      );
      const len = (result as any).rows?.length || (Array.isArray(result) ? result.length : 0);
      if (!len) return reply.code(403).send({ success: false, error: "Not found or not owner" });
      return reply.send({ success: true });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });
}
