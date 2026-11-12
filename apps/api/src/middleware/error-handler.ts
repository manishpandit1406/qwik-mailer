import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function errorHandler(
  error: Error,
  _req: FastifyRequest,
  reply: FastifyReply
) {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: "Validation failed",
      details: error.flatten().fieldErrors,
    });
  }

  // Preserve client error status codes (e.g. 400, 401, 403, 404, 415, 429)
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return reply.code(statusCode).send({
      success: false,
      error: error.message || "Request error",
      code: (error as any).code,
    });
  }

  // Default 500
  console.error("Unhandled error:", error);
  return reply.code(500).send({
    success: false,
    error: "Internal server error",
  });
}
