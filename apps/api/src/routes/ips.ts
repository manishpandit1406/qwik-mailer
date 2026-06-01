import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, ipPools, dedicatedIps } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";

export async function ipRoutes(app: FastifyInstance) {
  // GET /v1/ips
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };

    const ips = await db.query.dedicatedIps.findMany({
      where: eq(dedicatedIps.userId, user.sub),
      orderBy: [desc(dedicatedIps.createdAt)],
    });

    const pools = await db.query.ipPools.findMany({
      where: eq(ipPools.userId, user.sub),
      orderBy: [desc(ipPools.createdAt)],
    });

    return reply.send({ success: true, data: { ips, pools } });
  });

  // POST /v1/ips/pools
  app.post("/pools", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

    const [pool] = await db
      .insert(ipPools)
      .values({ userId: user.sub, name })
      .returning();

    return reply.code(201).send({ success: true, data: pool });
  });

  // POST /v1/ips/assign
  // Note: in a real environment, IP assignment would be handled by admin or billing,
  // but for the mock we'll allow users to "request" an IP which we immediately assign.
  app.post("/assign", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };

    // Generate a mock IP
    const mockIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const [ip] = await db
      .insert(dedicatedIps)
      .values({
        userId: user.sub,
        ipAddress: mockIp,
        status: "warming", // Start in warming state
      })
      .returning();

    return reply.code(201).send({ success: true, data: ip });
  });
}
