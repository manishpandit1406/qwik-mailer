import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ValidationService } from "../services/validation.service.js";
import { authenticate } from "../middleware/auth.js";
import { checkValidationQuota, incrementValidationUsage } from "../middleware/quota.js";

export async function validationRoutes(fastify: FastifyInstance) {
  // Validate single email
  fastify.post(
    "/single",
    {
      preHandler: [authenticate, checkValidationQuota],
    },
    async (request, reply) => {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);
      const result = await ValidationService.validate(email);
      
      // Increment quota counter
      if (request.user && (request.user as any).sub) {
        await incrementValidationUsage((request.user as any).sub, 1);
      } else if (request.user && (request.user as any).id) {
        await incrementValidationUsage((request.user as any).id, 1);
      }

      return reply.send({ success: true, data: result });
    }
  );

  // Validate bulk emails
  fastify.post(
    "/bulk",
    {
      preHandler: [authenticate, checkValidationQuota],
    },
    async (request, reply) => {
      const { emails } = z.object({ emails: z.array(z.string().email()).max(1000) }).parse(request.body);
      
      const results = [];
      // Concurrency control: batch by 10 to avoid DNS throttling
      for (let i = 0; i < emails.length; i += 10) {
        const batch = emails.slice(i, i + 10);
        const batchResults = await Promise.all(batch.map((e) => ValidationService.validate(e)));
        results.push(...batchResults);
      }
      
      return reply.send({ data: results });
    }
  );
}
