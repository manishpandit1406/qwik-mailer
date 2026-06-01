import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, certificates } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import crypto from "crypto";

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "certificates");

export async function certificateRoutes(app: FastifyInstance) {
  // GET /v1/certificates
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, user.sub),
      orderBy: (certs, { desc }) => [desc(certs.createdAt)],
    });
    return reply.send({ success: true, data: certs });
  });

  // GET /v1/certificates/:id
  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const cert = await db.query.certificates.findFirst({
      where: and(eq(certificates.id, id), eq(certificates.userId, user.sub)),
    });
    if (!cert) return reply.code(404).send({ success: false, error: "Not found" });
    return reply.send({ success: true, data: cert });
  });

  // POST /v1/certificates
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    
    const parts = req.parts();
    let name = "Untitled Certificate";
    let fileUrl = "";
    let config = "[]";

    for await (const part of parts) {
      if (part.type === "file") {
        if (!part.mimetype.includes("pdf")) {
          return reply.code(400).send({ success: false, error: "Only PDF files are allowed" });
        }
        
        // Ensure directory exists
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        const ext = path.extname(part.filename) || ".pdf";
        const uniqueName = crypto.randomBytes(16).toString("hex") + ext;
        const savePath = path.join(UPLOADS_DIR, uniqueName);
        
        await pipeline(part.file, fs.createWriteStream(savePath));
        fileUrl = `/uploads/certificates/${uniqueName}`;
      } else {
        if (part.fieldname === "name") name = part.value as string;
        if (part.fieldname === "config") config = part.value as string;
      }
    }

    if (!fileUrl) {
      return reply.code(400).send({ success: false, error: "PDF file is required" });
    }

    let parsedConfig;
    try {
      parsedConfig = JSON.parse(config);
    } catch {
      parsedConfig = [];
    }

    const [newCert] = await db.insert(certificates).values({
      userId: user.sub,
      name,
      fileUrl,
      config: parsedConfig,
    }).returning();

    return reply.code(201).send({ success: true, data: newCert });
  });

  // PUT /v1/certificates/:id
  app.put("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const schema = z.object({
      name: z.string().optional(),
      config: z.array(z.any()).optional(),
    });
    const parsed = schema.parse(req.body);

    const existing = await db.query.certificates.findFirst({
      where: and(eq(certificates.id, id), eq(certificates.userId, user.sub)),
    });
    if (!existing) return reply.code(404).send({ success: false, error: "Certificate not found" });

    const [updated] = await db.update(certificates)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(certificates.id, id))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // DELETE /v1/certificates/:id
  app.delete("/:id", { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const existing = await db.query.certificates.findFirst({
      where: and(eq(certificates.id, id), eq(certificates.userId, user.sub)),
    });
    if (!existing) return reply.code(404).send({ success: false, error: "Certificate not found" });

    // Optionally delete the physical file
    try {
      const fullPath = path.join(__dirname, "..", "..", existing.fileUrl);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      // ignore
    }

    await db.delete(certificates).where(eq(certificates.id, id));
    return reply.send({ success: true, data: { message: "Deleted successfully" } });
  });
}
