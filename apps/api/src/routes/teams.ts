import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@qwikmailer/db";
import { authenticate, requireTeamRole } from "../middleware/auth.js";
import { checkProjectLimit, checkTeamMemberLimit } from "../middleware/quota.js";
import crypto from "crypto";
import { sendTeamInviteEmail } from "../services/email.service.js";

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
  app.post("/", { preHandler: [authenticate, checkProjectLimit] }, async (req, reply) => {
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
  // GET /v1/teams/invite/:token
  app.get("/invite/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    try {
      const inviteData = await db.execute(
        sql`SELECT i.email, i.role, i.expires_at as "expiresAt", t.name as "teamName", u.name as "inviterName"
         FROM team_invites i
         JOIN teams t ON t.id = i.team_id
         JOIN users u ON u.id = i.invited_by
         WHERE i.token = ${token}`
      );
      const rows = (inviteData as any).rows || inviteData;
      if (!rows.length) {
        return reply.code(404).send({ success: false, error: "Invite not found or expired." });
      }
      const invite = rows[0];
      if (new Date(invite.expiresAt) < new Date()) {
        return reply.code(400).send({ success: false, error: "Invite has expired." });
      }
      return reply.send({ success: true, data: invite });
    } catch (err: any) {
      console.error("[Teams Invite]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // POST /v1/teams/invite/:token/accept
  app.post("/invite/:token/accept", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { token } = req.params as { token: string };
    try {
      // Get invite
      const inviteData = await db.execute(
        sql`SELECT id, team_id, email, role, expires_at FROM team_invites WHERE token = ${token}`
      );
      const rows = (inviteData as any).rows || inviteData;
      if (!rows.length) {
        return reply.code(404).send({ success: false, error: "Invite not found." });
      }
      const invite = rows[0];
      const inviteTeamId = invite.team_id || invite.teamId;
      const inviteExpiresAt = invite.expires_at || invite.expiresAt;
      if (new Date(inviteExpiresAt) < new Date()) {
        return reply.code(400).send({ success: false, error: "Invite has expired." });
      }

      // Check if user email matches invite email
      const userData = await db.execute(sql`SELECT email FROM users WHERE id = ${user.sub}`);
      const userEmail = ((userData as any).rows || userData)[0]?.email;
      if (userEmail !== invite.email) {
        return reply.code(403).send({ success: false, error: "This invite was sent to a different email address." });
      }

      // Check if user is already in the team
      const existingMemberData = await db.execute(
        sql`SELECT id FROM team_members WHERE team_id = ${inviteTeamId} AND user_id = ${user.sub}`
      );
      const existingMemberRows = (existingMemberData as any).rows || existingMemberData;
      
      if (existingMemberRows.length > 0) {
        await db.execute(
          sql`UPDATE team_members SET role = ${invite.role} WHERE team_id = ${inviteTeamId} AND user_id = ${user.sub}`
        );
      } else {
        await db.execute(
          sql`INSERT INTO team_members (team_id, user_id, role) VALUES (${inviteTeamId}, ${user.sub}, ${invite.role})`
        );
      }

      // Delete invite
      await db.execute(sql`DELETE FROM team_invites WHERE token = ${token}`);

      return reply.send({ success: true, data: { teamId: inviteTeamId } });
    } catch (err: any) {
      console.error("[Teams Invite Accept]", err);
      require("fs").writeFileSync("scratch/error.log", String(err.stack || err.message || err));
      return reply.code(500).send({ success: false, error: err.message || "Internal server error" });
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
  app.post("/:id/invite", { preHandler: [authenticate, requireTeamRole(["owner", "admin"]), checkTeamMemberLimit] }, async (req, reply) => {
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

      const inviteLink = `${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/invite/${token}`;

      // Fetch team and user names for the email
      const teamQuery = await db.execute(sql`SELECT name FROM teams WHERE id = ${id}`);
      const teamName = ((teamQuery as any).rows || teamQuery)[0]?.name || "a team";
      
      const userQuery = await db.execute(sql`SELECT name FROM users WHERE id = ${user.sub}`);
      const inviterName = ((userQuery as any).rows || userQuery)[0]?.name || "Someone";

      try {
        await sendTeamInviteEmail(
          email,
          inviterName,
          teamName,
          inviteLink,
          role,
          expiresAt
        );
      } catch (e) {
        console.error("[Teams] Failed to send invite email", e);
      }

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
  app.patch("/:id/members/:memberId/role", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
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
  app.delete("/:id/members/:memberId", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
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

  // PATCH /v1/teams/:id - Update team
  app.patch("/:id", { preHandler: [authenticate, requireTeamRole(["owner", "admin"])] }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);

    try {
      const isOwner = await db.execute(
        sql`SELECT 1 FROM teams WHERE id = ${id} AND owner_id = ${user.sub}`
      );
      if (!(isOwner as any).rows?.length && !(Array.isArray(isOwner) && isOwner.length > 0)) {
        return reply.code(403).send({ success: false, error: "Only owners can update team settings" });
      }

      await db.execute(
        sql`UPDATE teams SET name = ${name} WHERE id = ${id}`
      );
      return reply.send({ success: true });
    } catch (err: any) {
      console.error("[Teams]", err);
      return reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  // DELETE /v1/teams/:id
  app.delete("/:id", { preHandler: [authenticate, requireTeamRole(["owner"])] }, async (req, reply) => {
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
