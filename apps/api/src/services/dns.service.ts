import crypto from "crypto";
import { promisify } from "util";
import { generateKeyPair } from "crypto";
import { Resolver } from "dns/promises";

const generateKeyPairAsync = promisify(generateKeyPair);

// Use Google & Cloudflare DNS to bypass local OS caching issues during verification
const resolver = new Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

export async function generateDkimKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const { privateKey, publicKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // Convert DER public key to base64 for DNS TXT record
  const publicKeyBase64 = publicKey.toString("base64");

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKey as unknown as string,
  };
}

export async function checkDnsRecord(
  hostname: string,
  type: "TXT" | "MX" | "CNAME",
  expectedValue: string
): Promise<boolean> {
  try {
    if (type === "TXT") {
      const records = await resolver.resolveTxt(hostname);
      const cleanExpected = expectedValue.replace(/\s+/g, "");
      
      for (const recordChunks of records) {
        const fullRecord = recordChunks.join("");
        const cleanRecord = fullRecord.replace(/\s+/g, "");
        
        // If it's a short check like v=DMARC1
        if (cleanExpected.length < 20 && cleanRecord.startsWith(cleanExpected)) {
          return true;
        }
        
        // If it's a long check like a DKIM key or SPF
        if (cleanRecord.includes(cleanExpected)) {
          return true;
        }
      }
      return false;
    } else if (type === "CNAME") {
      const records = await resolver.resolveCname(hostname);
      return records.some((r: string) => r.toLowerCase() === expectedValue.toLowerCase());
    }
    return false;
  } catch (err) {
    return false;
  }
}
