import https from "https";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, users } from "@qwikmailer/db";
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
   * POST /v1/uploads/avatar
   * For authenticated users to upload their profile photo.
   * Accepts JSON body: { base64: string, contentType: string }
   */
  app.post(
    "/avatar",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = req.user as { sub: string };
      const body = req.body as any;
      const { base64, contentType } = body ?? {};

      if (!base64 || !contentType) {
        return reply.status(400).send({ success: false, error: "Missing base64 or contentType" });
      }

      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedImageTypes.includes(contentType)) {
        return reply.status(400).send({ success: false, error: "Only image files are allowed (jpeg, png, webp, gif)" });
      }

      const rawBase64 = base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(rawBase64, "base64");

      // 5 MB limit for avatars
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(413).send({ success: false, error: "Profile image must be smaller than 5 MB" });
      }

      const ext = getExt(contentType);
      const key = `avatars/${user.sub}-${Date.now()}.${ext}`;

      try {
        const url = await uploadBufferToS3({ key, buffer, contentType });
        await db.update(users).set({ avatarUrl: url, updatedAt: new Date() }).where(eq(users.id, user.sub));
        return reply.send({ success: true, url, key });
      } catch (err) {
        req.log.error(err, "S3 upload failed for avatar");
        return reply.status(500).send({ success: false, error: "Failed to upload profile picture. Please try again." });
      }
    }
  );

  /**
   * DELETE /v1/uploads/avatar
   * Remove profile photo for authenticated user.
   */
  app.delete(
    "/avatar",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = req.user as { sub: string };
      try {
        await db.update(users).set({ avatarUrl: null, updatedAt: new Date() }).where(eq(users.id, user.sub));
        return reply.send({ success: true, message: "Profile picture removed successfully" });
      } catch (err) {
        req.log.error(err, "Failed to remove avatar");
        return reply.status(500).send({ success: false, error: "Failed to remove profile picture." });
      }
    }
  );

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
    const { base64, contentType, formId, filename, maxSizeMb, maxSizeBytes, minSizeBytes, accept } = body ?? {};

    if (!base64 || !contentType || !formId) {
      return reply.status(400).send({ success: false, error: "Missing base64, contentType, or formId" });
    }

    const rawBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(rawBase64, "base64");

    const formatBytes = (bytes: number) => {
      if (!bytes || bytes <= 0) return "0 KB";
      if (bytes >= 1024 * 1024 * 1024 && bytes % (1024 * 1024 * 1024) === 0) {
        return `${bytes / (1024 * 1024 * 1024)} GB`;
      }
      if (bytes >= 1024 * 1024 && bytes % (1024 * 1024) === 0) {
        return `${bytes / (1024 * 1024)} MB`;
      }
      return `${Math.round(bytes / 1024)} KB`;
    };

    // 1. Validate file size (Min and Max) FIRST before any other checks
    const effectiveMinBytes = Math.max(0, Number(minSizeBytes) || 0);
    const limitMb = Math.min(Math.max(Number(maxSizeMb) || 10, 1), 10240);
    const effectiveMaxBytes = Number(maxSizeBytes) || (limitMb * 1024 * 1024);

    if (effectiveMinBytes > 0 && buffer.length < effectiveMinBytes) {
      return reply.status(400).send({
        success: false,
        error: `File size is too small. Minimum required size is ${formatBytes(effectiveMinBytes)}.`,
      });
    }

    if (buffer.length > effectiveMaxBytes) {
      return reply.status(413).send({
        success: false,
        error: `File size exceeds maximum allowed limit of ${formatBytes(effectiveMaxBytes)}.`,
      });
    }

    // 2. Reject executable / malicious file extensions
    const ext = (filename || "").split(".").pop()?.toLowerCase() || "";
    const blockedExtensions = ["exe", "bat", "cmd", "sh", "php", "pl", "cgi", "vbs", "msi", "com", "scr"];
    if (blockedExtensions.includes(ext)) {
      return reply.status(400).send({
        success: false,
        error: "Executable files (.exe, .bat, etc.) are not allowed.",
      });
    }

    // 3. Optional accept filter check (if form specified a specific format)
    if (accept && accept !== "*" && accept.trim() !== "") {
      const allowedParts = accept.split(",").map((p: string) => p.trim().toLowerCase());
      const lowerName = (filename || "").toLowerCase();
      const lowerType = (contentType || "").toLowerCase();
      const isAllowed = allowedParts.some((part: string) => {
        if (part === "*") return true;
        if (part.startsWith(".")) return lowerName.endsWith(part);
        if (part.endsWith("/*")) {
          const prefix = part.slice(0, -2);
          return lowerType.startsWith(prefix + "/");
        }
        return lowerType === part;
      });

      if (!isAllowed) {
        return reply.status(400).send({
          success: false,
          error: `File type not allowed. Please upload a format matching: ${accept}`,
        });
      }
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
   * Query params: ?key=<s3-key>&download=1
   * Streams the S3 object directly to client with correct Content-Type,
   * caching, and cross-origin headers. Works seamlessly in <img>, <iframe>, and downloads.
   */
  app.get("/file", async (req, reply) => {
    let { key, download } = (req.query || {}) as { key?: string; download?: string };
    if (!key) {
      return reply.status(400).send({ success: false, error: "Missing key parameter" });
    }

    try {
      key = decodeURIComponent(key);
    } catch {}

    const freshUrl = getPresignedGetUrl(key, 300);

    return new Promise<void>((resolve, reject) => {
      https
        .get(freshUrl, (s3Res) => {
          if (!s3Res.statusCode || s3Res.statusCode >= 400) {
            reply
              .status(s3Res.statusCode || 404)
              .header("Cross-Origin-Resource-Policy", "cross-origin")
              .header("Access-Control-Allow-Origin", "*")
              .send({ success: false, error: "File not found in S3" });
            return resolve();
          }

          reply
            .status(200)
            .header(
              "Content-Type",
              s3Res.headers["content-type"] || "application/octet-stream"
            )
            .header("Cross-Origin-Resource-Policy", "cross-origin")
            .header("Access-Control-Allow-Origin", "*")
            .header("Cache-Control", "public, max-age=604800, immutable");

          if (s3Res.headers["content-length"]) {
            reply.header("Content-Length", s3Res.headers["content-length"]);
          }

          if (download === "1") {
            const filename = (key as string).split("/").pop() || "download";
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
          } else {
            reply.header("Content-Disposition", "inline");
          }

          reply.send(s3Res);
          s3Res.on("end", () => resolve());
          s3Res.on("error", (err) => {
            req.log.error(err, "Stream error for: " + key);
            resolve();
          });
        })
        .on("error", (err) => {
          req.log.error(err, "Failed to stream file from S3: " + key);
          if (!reply.sent) {
            reply
              .status(500)
              .header("Cross-Origin-Resource-Policy", "cross-origin")
              .header("Access-Control-Allow-Origin", "*")
              .send({ success: false, error: "Failed to stream file" });
          }
          resolve();
        });
    });
  });
}

