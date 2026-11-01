import https from "https";
import crypto from "crypto";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET || "qwikmailer-uploads";
const S3_HOST = `${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = crypto.createHmac("sha256", "AWS4" + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}

/**
 * Uploads a buffer directly to S3 using native AWS Signature V4.
 */
export async function uploadBufferToS3(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const { key, buffer, contentType } = params;
  const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = `content-length:${buffer.length}\ncontent-type:${contentType}\nhost:${S3_HOST}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-length;content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const signingKey = getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, "s3");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: S3_HOST,
        path: `/${key}`,
        method: "PUT",
        headers: {
          "content-length": buffer.length,
          "content-type": contentType,
          "x-amz-date": amzDate,
          "x-amz-content-sha256": payloadHash,
          Authorization: authHeader,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            // Generate clean Presigned URL (AWS max allowed is 7 days / 604,800 seconds)
            const publicUrl = getPresignedGetUrl(key, 604800);
            resolve(publicUrl);
          } else {
            reject(new Error(`S3 upload failed with status ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.write(buffer);
    req.end();
  });
}

/**
 * Generates an authenticated Presigned GET URL for S3 objects.
 */
export function getPresignedGetUrl(key: string, expiresInSeconds: number = 86400 * 7): string {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
  const credential = `${AWS_ACCESS_KEY_ID}/${credentialScope}`;

  const queryParams = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresInSeconds}`,
    `X-Amz-SignedHeaders=host`,
  ]
    .sort()
    .join("&");

  const canonicalRequest = `GET\n/${key}\n${queryParams}\nhost:${S3_HOST}\n\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const signingKey = getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, "s3");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `https://${S3_HOST}/${key}?${queryParams}&X-Amz-Signature=${signature}`;
}

