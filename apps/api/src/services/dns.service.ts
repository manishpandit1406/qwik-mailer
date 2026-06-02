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
  const checkValues = (records: any) => {
    if (type === "TXT") {
      const txtRecords = records as string[][];
      const cleanExpected = expectedValue.replace(/\s+/g, "");
      for (const recordChunks of txtRecords) {
        const fullRecord = recordChunks.join("");
        const cleanRecord = fullRecord.replace(/\s+/g, "");
        if (cleanExpected.length < 20 && cleanRecord.startsWith(cleanExpected)) return true;
        if (cleanRecord.includes(cleanExpected)) return true;
      }
    } else if (type === "CNAME") {
      const cnameRecords = records as string[];
      return cnameRecords.some((r) => r.toLowerCase() === expectedValue.toLowerCase());
    }
    return false;
  };

  try {
    const records = type === "TXT" ? await resolver.resolveTxt(hostname) : await resolver.resolveCname(hostname);
    if (checkValues(records)) return true;
  } catch (err) {}

  // Fallback: Authoritative DNS to bypass cache (e.g. Cloudflare/GoDaddy propagation delays)
  try {
    const parts = hostname.split(".");
    let nsRecords: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      const domainToTest = parts.slice(i).join(".");
      try {
        nsRecords = await resolver.resolveNs(domainToTest);
        if (nsRecords.length > 0) break;
      } catch (e) {}
    }

    if (nsRecords.length > 0) {
      const nsIps: string[] = [];
      for (const ns of nsRecords) {
        try {
          const ips = await resolver.resolve4(ns);
          nsIps.push(...ips);
        } catch (e) {}
      }
      
      if (nsIps.length > 0) {
        const authResolver = new Resolver();
        authResolver.setServers(nsIps);
        const authRecords = type === "TXT" ? await authResolver.resolveTxt(hostname) : await authResolver.resolveCname(hostname);
        if (checkValues(authRecords)) return true;
      }
    }
  } catch (err) {}

  return false;
}
