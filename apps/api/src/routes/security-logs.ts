import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";

export async function securityLogRoutes(app: FastifyInstance) {
  // GET /v1/security-logs
  app.get(
    "/",
    { preHandler: [authenticate] },
    async (request, reply) => {
      // Mocking for now since the table is removed
      return reply.send({
        success: true,
        data: [],
      });
    }
  );
}
