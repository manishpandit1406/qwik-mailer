import { db, teams } from "@qwikmailer/db";
import { eq } from "drizzle-orm";

export async function getOwnerTeamIds(teamId: string): Promise<string[]> {
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) return [teamId];
  
  const userTeams = await db.query.teams.findMany({ where: eq(teams.ownerId, team.ownerId) });
  return userTeams.map(t => t.id);
}

export async function getTeamOwnerId(teamId: string): Promise<string> {
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) throw new Error("Team not found");
  return team.ownerId;
}
