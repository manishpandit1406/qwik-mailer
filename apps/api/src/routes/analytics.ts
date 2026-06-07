import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, emails, emailEvents } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /v1/analytics - Summary stats
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { period } = z
      .object({ period: z.enum(["24h", "7d", "30d", "90d"]).default("30d") })
      .parse(req.query);

    const periodMap = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
    const days = periodMap[period];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const previousSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

    const getStatsQuery = (start: string, end?: string) => {
      let condition = and(eq(emails.teamId, teamId), sql`created_at >= ${start}`);
      if (end) {
        condition = and(condition, sql`created_at < ${end}`);
      }
      return db
        .select({
          sent: sql<number>`count(*)`,
          delivered: sql<number>`count(*) filter (where status = 'delivered')`,
          failed: sql<number>`count(*) filter (where status = 'failed')`,
          bounced: sql<number>`count(*) filter (where status = 'bounced')`,
          complained: sql<number>`count(*) filter (where status = 'complained')`,
          totalOpens: sql<number>`coalesce(sum(open_count), 0)`,
          totalClicks: sql<number>`coalesce(sum(click_count), 0)`,
        })
        .from(emails)
        .where(condition);
    };

    const [stats] = await getStatsQuery(since);
    const [prevStats] = await getStatsQuery(previousSince, since);

    const sent = Number(stats.sent);
    const delivered = Number(stats.delivered);
    const failed = Number(stats.failed);
    const bounced = Number(stats.bounced);
    const opens = Number(stats.totalOpens);
    const clicks = Number(stats.totalClicks);

    const prevSent = Number(prevStats.sent);
    const prevDelivered = Number(prevStats.delivered);
    const prevBounced = Number(prevStats.bounced);
    const prevOpens = Number(prevStats.totalOpens);

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
    const failRate = sent > 0 ? Math.round((failed / sent) * 1000) / 10 : 0;
    const openRate = delivered > 0 ? Math.round((opens / delivered) * 1000) / 10 : 0;
    const clickRate = delivered > 0 ? Math.round((clicks / delivered) * 1000) / 10 : 0;
    const bounceRate = sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0;

    const prevDeliveryRate = prevSent > 0 ? Math.round((prevDelivered / prevSent) * 1000) / 10 : 0;
    const prevOpenRate = prevDelivered > 0 ? Math.round((prevOpens / prevDelivered) * 1000) / 10 : 0;
    const prevBounceRate = prevSent > 0 ? Math.round((prevBounced / prevSent) * 1000) / 10 : 0;

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const sentTrend = calcTrend(sent, prevSent);
    const deliveryRateTrend = Math.round((deliveryRate - prevDeliveryRate) * 10) / 10;
    const openRateTrend = Math.round((openRate - prevOpenRate) * 10) / 10;
    const bounceRateTrend = Math.round((bounceRate - prevBounceRate) * 10) / 10;

    return reply.send({
      success: true,
      data: {
        period,
        sent,
        delivered,
        failed,
        bounced,
        complained: Number(stats.complained),
        opened: opens,
        clicked: clicks,
        deliveryRate,
        failRate,
        openRate,
        clickRate,
        bounceRate,
        trends: {
          sent: sentTrend,
          deliveryRate: deliveryRateTrend,
          openRate: openRateTrend,
          bounceRate: bounceRateTrend,
        }
      },
    });
  });

  // GET /v1/analytics/daily - Daily breakdown
  app.get("/daily", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { days: daysParam } = z
      .object({ days: z.coerce.number().default(30) })
      .parse(req.query);

    const since = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString();

    const daily = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        sent: sql<number>`count(*)`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
        bounced: sql<number>`count(*) filter (where status = 'bounced')`,
        opened: sql<number>`coalesce(sum(open_count), 0)`,
        clicked: sql<number>`coalesce(sum(click_count), 0)`,
      })
      .from(emails)
      .where(and(eq(emails.teamId, teamId), sql`created_at >= ${since}`))
      .groupBy(sql`date_trunc('day', created_at)::date`)
      .orderBy(sql`date_trunc('day', created_at)::date`);

    return reply.send({ success: true, data: daily });
  });

  // GET /v1/analytics/active-jobs - Live sending queue progress
  app.get("/active-jobs", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    
    // Find all batch IDs that currently have emails in 'queued' or 'sending' status
    const activeBatchesResult = await db.execute(sql`
      SELECT DISTINCT batch_id
      FROM emails
      WHERE team_id = ${teamId} AND status IN ('queued', 'sending') AND batch_id IS NOT NULL
    `);
    
    const activeBatchIds = activeBatchesResult.map((r: any) => r.batch_id);

    // If no active bulk batches, we can also check for single emails
    // But for a cohesive UI, grouping by batchId makes the most sense.
    let jobs: any[] = [];
    
    if (activeBatchIds.length > 0) {
      // For these active batches, get the total count, sent count, failed count, etc.
      // Drizzle raw query is easier here for grouping and conditional counting
      const statsResult = await db.execute(sql`
        SELECT 
          batch_id,
          MAX(subject) as subject,
          MAX(created_at) as started_at,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as failed,
          COUNT(*) FILTER (WHERE status = 'queued' OR status = 'sending') as pending
        FROM emails
        WHERE team_id = ${teamId} AND batch_id = ANY(${activeBatchIds})
        GROUP BY batch_id
        ORDER BY started_at DESC
      `);
      jobs = statsResult;
    }

    // Also get active single emails (without batch_id)
    const singleEmailsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as failed,
        COUNT(*) FILTER (WHERE status = 'queued' OR status = 'sending') as pending
      FROM emails
      WHERE team_id = ${teamId} AND batch_id IS NULL AND status IN ('queued', 'sending')
    `);

    const singlePending = Number(singleEmailsResult[0]?.pending || 0);
    if (singlePending > 0) {
      jobs.push({
        batch_id: 'single_emails',
        subject: 'Single Transactional Emails',
        started_at: new Date(),
        total: singlePending, // for single emails we just show pending as total active
        delivered: 0,
        failed: 0,
        pending: singlePending
      });
    }

    return reply.send({ success: true, data: jobs });
  });

  // GET /v1/analytics/events - Raw event list
  app.get("/events", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { type, limit } = z
      .object({
        type: z.string().optional(),
        limit: z.coerce.number().max(100).default(50),
      })
      .parse(req.query);

    const events = await db.query.emailEvents.findMany({
      where: eq(emailEvents.teamId, teamId),
      orderBy: desc(emailEvents.occurredAt),
      limit,
    });

    return reply.send({ success: true, data: events });
  });

  // GET /v1/analytics/activity - Granular Activity Feed
  app.get("/activity", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { limit, page, messageId, toEmail, eventType } = z
      .object({
        limit: z.coerce.number().max(100).default(50),
        page: z.coerce.number().default(1),
        messageId: z.string().optional(),
        toEmail: z.string().optional(),
        eventType: z.string().optional(),
      })
      .parse(req.query);

    const offset = (page - 1) * limit;

    let whereClause: any = eq(emailEvents.teamId, teamId);

    if (eventType) {
      whereClause = and(whereClause, eq(emailEvents.type, eventType as any));
    }
    
    // We do a join with emails to allow filtering by messageId and toEmail
    const query = db
      .select({
        id: emailEvents.id,
        type: emailEvents.type,
        occurredAt: emailEvents.occurredAt,
        metadata: emailEvents.metadata,
        ip: emailEvents.ip,
        userAgent: emailEvents.userAgent,
        email: {
          id: emails.id,
          toEmail: emails.toEmail,
          subject: emails.subject,
          messageId: emails.messageId,
          status: emails.status,
        }
      })
      .from(emailEvents)
      .leftJoin(emails, eq(emailEvents.emailId, emails.id))
      .where(whereClause);

    const results = await query.orderBy(desc(emailEvents.occurredAt)).limit(limit).offset(offset);
    
    // In memory filtering for now if joining isn't fully set up with dynamic where
    const filteredResults = results.filter((row) => {
      if (messageId && row.email?.messageId !== messageId) return false;
      if (toEmail && !row.email?.toEmail.includes(toEmail)) return false;
      return true;
    });

    return reply.send({ success: true, data: filteredResults });
  });

  // GET /v1/analytics/geo - Geographic breakdown
  app.get("/geo", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { days } = z
      .object({ days: z.coerce.number().default(30) })
      .parse(req.query);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const geoData = await db
      .select({
        country: emailEvents.country,
        opens: sql<number>`count(*) filter (where type = 'opened')`,
        clicks: sql<number>`count(*) filter (where type = 'clicked')`,
        total: sql<number>`count(*)`,
      })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.teamId, teamId),
          sql`occurred_at >= ${since}`,
          sql`country is not null`
        )
      )
      .groupBy(emailEvents.country)
      .orderBy(sql`count(*) desc`)
      .limit(20);

    return reply.send({ success: true, data: geoData });
  });

  // GET /v1/analytics/devices - Device/platform breakdown
  app.get("/devices", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId!;
    const { days } = z
      .object({ days: z.coerce.number().default(30) })
      .parse(req.query);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get user agents and classify them server-side
    const events = await db
      .select({ userAgent: emailEvents.userAgent })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.teamId, teamId),
          sql`occurred_at >= ${since}`,
          sql`user_agent is not null`,
          sql`type = 'opened'`
        )
      )
      .limit(1000);

    // Classify user agents into device types
    const counts = { Mobile: 0, Desktop: 0, Tablet: 0, Unknown: 0 };
    const platforms: Record<string, number> = {};

    for (const { userAgent } of events) {
      const ua = (userAgent ?? "").toLowerCase();
      if (!ua) { counts.Unknown++; continue; }

      // Device type detection
      if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
        counts.Tablet++;
      } else if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
        counts.Mobile++;
      } else {
        counts.Desktop++;
      }

      // Platform detection
      if (/iphone|ipad|ipod/i.test(ua)) {
        platforms["iOS"] = (platforms["iOS"] ?? 0) + 1;
      } else if (/android/i.test(ua)) {
        platforms["Android"] = (platforms["Android"] ?? 0) + 1;
      } else if (/windows/i.test(ua)) {
        platforms["Windows"] = (platforms["Windows"] ?? 0) + 1;
      } else if (/mac os/i.test(ua)) {
        platforms["macOS"] = (platforms["macOS"] ?? 0) + 1;
      } else if (/linux/i.test(ua)) {
        platforms["Linux"] = (platforms["Linux"] ?? 0) + 1;
      } else {
        platforms["Other"] = (platforms["Other"] ?? 0) + 1;
      }
    }

    return reply.send({
      success: true,
      data: {
        deviceTypes: Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .filter(d => d.value > 0),
        platforms: Object.entries(platforms)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value })),
        total: events.length,
      },
    });
  });
}

