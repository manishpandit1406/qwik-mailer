import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { uploadBufferToS3, getPresignedGetUrl } from "../services/s3.service.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  pdf: ["application/pdf"],
  any: [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "application/pdf",
  ],
};

function getExt(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
  };
  return map[contentType] ?? "bin";
}

function generateKey(folder: string, contentType: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = getExt(contentType);
  return `${folder}/${ts}-${rand}.${ext}`;
}

export async function uploadRoutes(app: FastifyInstance) {
  /**
   * POST /v1/uploads/form-asset
   * For authenticated users (admin) uploading banners/logos in the Form Builder.
   * Accepts JSON body: { base64: string, filename: string, contentType: string, folder: "forms/banners" | "forms/logos" }
   */
  app.post(
    "/form-asset",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = req.body as any;

      const { base64, contentType, folder } = body ?? {};

      if (!base64 || !contentType || !folder) {
        return reply.status(400).send({ success: false, error: "Missing base64, contentType, or folder" });
      }

      const allowedFolders = ["forms/banners", "forms/logos"];
      if (!allowedFolders.includes(folder)) {
        return reply.status(400).send({ success: false, error: `folder must be one of: ${allowedFolders.join(", ")}` });
      }

      if (!ALLOWED_TYPES.image.includes(contentType)) {
        return reply.status(400).send({ success: false, error: "Only image files are allowed (jpeg, png, gif, webp, svg)" });
      }

      // Strip data URI prefix if present
      const rawBase64 = base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(rawBase64, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(413).send({ success: false, error: "File exceeds 10 MB limit" });
      }

      const key = generateKey(folder, contentType);

      try {
        const url = await uploadBufferToS3({ key, buffer, contentType });
        return reply.send({ success: true, url, key });
      } catch (err) {
        req.log.error(err, "S3 upload failed for form-asset");
        return reply.status(500).send({ success: false, error: "Upload failed. Please try again." });
      }
    }
  );

  /**
   * POST /v1/uploads/submission-file
   * Public endpoint — called from the hosted form when a respondent uploads a file (PDF resume, etc.).
   * Accepts JSON body: { base64: string, filename: string, contentType: string, formId: string }
   *
   * NOTE: This is intentionally public (no auth) because the respondent is not a platform user.
   * Rate-limited by the global rate limiter.
   */
  app.post("/submission-file", async (req, reply) => {
    const body = req.body as any;
    const { base64, contentType, formId, filename } = body ?? {};

    if (!base64 || !contentType || !formId) {
      return reply.status(400).send({ success: false, error: "Missing base64, contentType, or formId" });
    }

    if (!ALLOWED_TYPES.any.includes(contentType)) {
      return reply.status(400).send({ success: false, error: "File type not allowed" });
    }

    const rawBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(rawBase64, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(413).send({ success: false, error: "File exceeds 10 MB limit" });
    }

    // Sanitize original filename for use in the key
    const safeName = (filename as string || "file")
      .replace(/[^a-z0-9._-]/gi, "-")
      .toLowerCase()
      .slice(0, 60);

    const key = `forms/submissions/${formId}/${Date.now()}-${safeName}`;

    try {
      const url = await uploadBufferToS3({ key, buffer, contentType });
      return reply.send({ success: true, url, key });
    } catch (err) {
      req.log.error(err, "S3 upload failed for submission-file");
      return reply.status(500).send({ success: false, error: "Upload failed. Please try again." });
    }
  });

  /**
   * GET /v1/uploads/file
   * Query params: ?key=<s3-key>
   * Permanently valid URL! Dynamically generates a fresh presigned S3 URL
   * and 302 redirects to S3. Zero load on API server, works forever.
   */
  app.get("/file", async (req, reply) => {
    const { key } = (req.query || {}) as { key?: string };
    if (!key) {
      return reply.status(400).send({ success: false, error: "Missing key parameter" });
    }
    try {
      const freshUrl = getPresignedGetUrl(key, 86400); // 24 hours
      return reply.redirect(freshUrl, 302);
    } catch (err) {
      req.log.error(err, "Failed to generate presigned URL for key: " + key);
      return reply.status(500).send({ success: false, error: "Failed to generate download link" });
    }
  });
}

