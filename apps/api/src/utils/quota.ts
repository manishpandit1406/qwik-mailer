import { db, users } from "@qwikmailer/db";
import { eq } from "drizzle-orm";

export const PLAN_LIMITS: Record<string, number> = {
  free: 3000,         // Default for Month 1 (dynamic check later)
  event_level: 10000,
  starter: 50000,
  growth: 100000,
  premium: 1000000,
  enterprise: 10000000,
};

export const SENDER_IDENTITY_LIMITS: Record<string, number> = {
  free: 1,
  event_level: 2,
  starter: 5,
  growth: 15,
  premium: 50,
  enterprise: 99999,
};

import { getTeamOwnerId } from "./team-owner.js";

export async function checkAndConsumeQuota(teamId: string, requestedEmailsCount: number): Promise<void> {
  const ownerId = await getTeamOwnerId(teamId);
  const user = await db.query.users.findFirst({
    where: eq(users.id, ownerId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  
  // 1. Month / Day reset logic
  let currentMonthlyUsage = user.monthlyEmailCount;
  let currentDailyUsage = user.dailyEmailCount;

  const billingStart = new Date(user.billingPeriodStart);
  if (billingStart.getMonth() !== now.getMonth() || billingStart.getFullYear() !== now.getFullYear()) {
    currentMonthlyUsage = 0;
    await db.update(users)
      .set({ 
        monthlyEmailCount: 0, 
        billingPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1) 
      })
      .where(eq(users.id, ownerId));
  }

  const dailyStart = new Date(user.dailyPeriodStart);
  if (dailyStart.getDate() !== now.getDate() || dailyStart.getMonth() !== now.getMonth() || dailyStart.getFullYear() !== now.getFullYear()) {
    currentDailyUsage = 0;
    await db.update(users)
      .set({ 
        dailyEmailCount: 0, 
        dailyPeriodStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()) 
      })
      .where(eq(users.id, ownerId));
  }

  // 2. Determine limits based on plan and account age
  const plan = user.plan || "free";
  let monthlyLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  let dailyLimit: number | null = null; // null means no daily limit

  if (plan === "free") {
    // Check account age
    const accountAgeMs = now.getTime() - new Date(user.createdAt).getTime();
    const daysOld = accountAgeMs / (1000 * 60 * 60 * 24);

    if (daysOld <= 30) {
      // First month
      monthlyLimit = 3000;
      dailyLimit = 100;
    } else {
      // Second month onwards
      monthlyLimit = 500;
      dailyLimit = 100; // Keep daily limit 100 to prevent blasting all 500 at once, as assumed
    }
  }

  // 3. Check quotas
  if (currentMonthlyUsage + requestedEmailsCount > monthlyLimit) {
    throw new Error(`Monthly quota exceeded. Your plan (${plan}) allows ${monthlyLimit} emails per month. You have already sent ${currentMonthlyUsage} emails.`);
  }

  if (dailyLimit !== null && currentDailyUsage + requestedEmailsCount > dailyLimit) {
    throw new Error(`Daily quota exceeded. Your plan (${plan}) limits you to ${dailyLimit} emails per day. You have already sent ${currentDailyUsage} emails today.`);
  }

  // 4. Consume quotas
  await db.update(users)
    .set({ 
      monthlyEmailCount: currentMonthlyUsage + requestedEmailsCount,
      dailyEmailCount: currentDailyUsage + requestedEmailsCount 
    })
    .where(eq(users.id, ownerId));
}

export function getUserLimits(user: any) {
  const plan = user.plan || "free";
  const now = new Date();
  
  let monthlyLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  let dailyLimit: number | null = null;

  if (plan === "free") {
    const accountAgeMs = now.getTime() - new Date(user.createdAt).getTime();
    const daysOld = accountAgeMs / (1000 * 60 * 60 * 24);
    if (daysOld <= 30) {
      monthlyLimit = 3000;
      dailyLimit = 100;
    } else {
      monthlyLimit = 500;
      dailyLimit = 100;
    }
  }

  return { monthlyLimit, dailyLimit };
}
