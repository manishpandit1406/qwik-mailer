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

  // Fastify validation errors
  if ((error as { statusCode?: number }).statusCode === 400) {
    return reply.code(400).send({
      success: false,
      error: "Bad request",
      details: error.message,
    });
  }

  // Rate limit errors
  if ((error as { statusCode?: number }).statusCode === 429) {
    return reply.code(429).send({
      success: false,
      error: "Rate limit exceeded. Please slow down.",
    });
  }

  // Default 500
  console.error("Unhandled error:", error);
  return reply.code(500).send({
    success: false,
    error: "Internal server error",
  });
}
