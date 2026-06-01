import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, contactMessages, newsletterSubscribers } from "@qwikmailer/db";
import { eq } from "drizzle-orm";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").max(255),
  subject: z.string().min(1, "Subject is required").max(500),
  message: z.string().min(1, "Message is required"),
});

const newsletterSchema = z.object({
  email: z.string().email("Invalid email").max(255),
});

export const marketingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/contact", async (request, reply) => {
    try {
      const data = contactSchema.parse(request.body);
      
      await db.insert(contactMessages).values({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      });

      return reply.send({ success: true, message: "Contact message received" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });

  fastify.post("/newsletter", async (request, reply) => {
    try {
      const data = newsletterSchema.parse(request.body);
      
      const existing = await db.query.newsletterSubscribers.findFirst({
        where: eq(newsletterSubscribers.email, data.email),
      });

      if (existing) {
        if (existing.status === "active") {
          return reply.status(400).send({ 
            success: false, 
            error: "You are already subscribed to our newsletter!" 
          });
        } else {
          // Re-subscribe if they had previously unsubscribed
          await db.update(newsletterSubscribers)
            .set({ status: "active", createdAt: new Date() })
            .where(eq(newsletterSubscribers.email, data.email));
          return reply.send({ success: true, message: "Subscribed successfully" });
        }
      }

      await db.insert(newsletterSubscribers).values({
        email: data.email,
        status: "active",
      });

      return reply.send({ success: true, message: "Subscribed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
};
