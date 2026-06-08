import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, contactLists } from "@qwikmailer/db";
import { authenticate } from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import crypto from "crypto";
import * as XLSX from "xlsx";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "lists");

export async function listRoutes(app: FastifyInstance) {
  // GET /v1/lists
  app.get("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId;
    if (!teamId) {
      return reply.send({ success: true, data: [] });
    }
    const lists = await db.query.contactLists.findMany({
      where: eq(contactLists.teamId, teamId as string),
      orderBy: (lists, { desc }) => [desc(lists.createdAt)],
    });
    return reply.send({ success: true, data: lists });
  });

  // POST /v1/lists
  app.post("/", { preHandler: authenticate }, async (req, reply) => {
    const teamId = req.teamId;
    
    const parts = req.parts();
    let fileUrl = "";
    let originalName = "";
    let fileBuffer: Buffer | null = null;

    for await (const part of parts) {
      if (part.type === "file") {
        const ext = path.extname(part.filename).toLowerCase();
        if (![".csv", ".xls", ".xlsx"].includes(ext)) {
          return reply.code(400).send({ success: false, error: "Only CSV and Excel files are allowed." });
        }
        
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        originalName = part.filename;
        const uniqueName = crypto.randomBytes(16).toString("hex") + ext;
        const savePath = path.join(UPLOADS_DIR, uniqueName);
        
        fileBuffer = await part.toBuffer();
        await fs.promises.writeFile(savePath, fileBuffer);
        
        fileUrl = `/uploads/lists/${uniqueName}`;
      }
    }

    if (!fileUrl || !fileBuffer) {
      return reply.code(400).send({ success: false, error: "File is required" });
    }

    // Parse to get row count and valid emails
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    
    let validEmails = 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const row of rows) {
      const toEmail = (row["email"] || row["Email"] || row["EMAIL"] || row["e-mail"] || "").toString().trim();
      if (toEmail && emailRegex.test(toEmail)) {
        validEmails++;
      }
    }

    const [newList] = await db.insert(contactLists).values({
      teamId: teamId as string,
      name: originalName,
      fileUrl,
      totalRows: rows.length,
      validEmails,
    } as any).returning();

    return reply.code(201).send({ success: true, data: newList });
  });
}
