import { FastifyReply, FastifyRequest } from "fastify";
import { db, users, teams } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
import { PLAN_LIMITS, PlanType } from "../config/plans.js";

async function getUserPlanAndUsage(req: FastifyRequest) {
  let userId: string;
  
  if (req.user && (req.user as any).sub) {
    userId = (req.user as any).sub;
  } else if (req.teamId) {
    // If authenticated via API key, req.user is the user object but we might need to get owner of team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, req.teamId),
      columns: { ownerId: true }
    });
    if (!team) return null;
    userId = team.ownerId;
  } else if (req.user && (req.user as any).id) {
    userId = (req.user as any).id;
  } else {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      plan: true,
      monthlyEmailCount: true,
      monthlyValidationCount: true,
      extraEmailQuota: true,
      isCustomPlan: true,
    }
  });

  return user;
}

export function requireFeature(feature: "webhooks" | "scheduling" | "prioritySupport") {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserPlanAndUsage(req);
    if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const limits = PLAN_LIMITS[user.plan as PlanType];
    if (!limits || !limits.features[feature]) {
      return reply.code(402).send({ success: false, error: `Your current plan (${user.plan}) does not support ${feature}. Please upgrade.` });
    }
  };
}

export async function checkProjectLimit(req: FastifyRequest, reply: FastifyReply) {
  const user = await getUserPlanAndUsage(req);
  if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const limits = PLAN_LIMITS[user.plan as PlanType];
  const userTeams = await db.query.teams.findMany({ where: eq(teams.ownerId, user.id), columns: { id: true } });

  if (userTeams.length >= limits.maxProjects) {
    return reply.code(402).send({ success: false, error: `You have reached the maximum number of projects (${limits.maxProjects}) for the ${user.plan} plan.` });
  }
}

export async function checkValidationQuota(req: FastifyRequest, reply: FastifyReply) {
  const user = await getUserPlanAndUsage(req);
  if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const limits = PLAN_LIMITS[user.plan as PlanType];
  // Determine if it's bulk or single
  const requestedCount = Array.isArray((req.body as any)?.emails) ? ((req.body as any).emails as string[]).length : 1;

  if (user.monthlyValidationCount + requestedCount > limits.validationsPerMonth) {
    return reply.code(402).send({ success: false, error: `Validation quota exceeded. Limit is ${limits.validationsPerMonth} per month on the ${user.plan} plan.` });
  }
}

export async function checkContactQuota(req: FastifyRequest, reply: FastifyReply) {
  const user = await getUserPlanAndUsage(req);
  if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const limits = PLAN_LIMITS[user.plan as PlanType];
  
  const userTeams = await db.query.teams.findMany({ where: eq(teams.ownerId, user.id), columns: { id: true } });
  
  const res = await db.execute(`SELECT COUNT(*) as count FROM contacts WHERE team_id IN (${userTeams.map(t => `'${t.id}'`).join(',') || "''"})`);
  const rows = (res as any).rows || res;
  const currentContacts = Number(rows[0]?.count || 0);

  const requestedCount = Array.isArray((req.body as any)?.contacts) ? ((req.body as any).contacts).length : 1;

  if (currentContacts + requestedCount > limits.maxContacts) {
    return reply.code(402).send({ success: false, error: `Contact limit exceeded. Maximum ${limits.maxContacts} contacts allowed on the ${user.plan} plan.` });
  }
}

export async function checkTeamMemberLimit(req: FastifyRequest, reply: FastifyReply) {
  const user = await getUserPlanAndUsage(req);
  if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const limits = PLAN_LIMITS[user.plan as PlanType];
  const teamId = (req.params as any).id || req.teamId;

  if (!teamId) return;

  const res = await db.execute(`SELECT COUNT(*) as count FROM team_members WHERE team_id = '${teamId}'`);
  const rows = (res as any).rows || res;
  const currentMembers = Number(rows[0]?.count || 0);

  if (currentMembers >= limits.maxTeamMembers) {
    return reply.code(402).send({ success: false, error: `Team member limit exceeded. Maximum ${limits.maxTeamMembers} members allowed per team on the ${user.plan} plan.` });
  }
}

export async function incrementValidationUsage(userId: string, count: number) {
  await db.execute(`UPDATE users SET monthly_validation_count = monthly_validation_count + ${count} WHERE id = '${userId}'`);
}
