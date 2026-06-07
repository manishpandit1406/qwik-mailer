import dns from "dns";
import { promisify } from "util";
import net from "net";

const resolve = promisify(dns.resolve);

/**
 * Checks if an IP address is a private, loopback, or otherwise restricted IP.
 */
function isRestrictedIP(ip: string): boolean {
  // Loopback (127.0.0.0/8)
  if (ip.startsWith("127.")) return true;
  // IPv6 Loopback
  if (ip === "::1") return true;

  // Private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;

  // Link-local (169.254.0.0/16) - blocks AWS IMDS
  if (ip.startsWith("169.254.")) return true;

  // Multicast / Broadcast / etc
  if (ip.startsWith("224.") || ip.startsWith("239.") || ip === "255.255.255.255") return true;

  return false;
}

/**
 * A safe wrapper around fetch that prevents SSRF attacks.
 * It resolves the hostname to an IP address first, checks if it's restricted,
 * and if safe, makes the request directly to the IP using the original hostname in the Host header.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const parsedUrl = new URL(url);

  // Only allow HTTP/HTTPS
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Invalid protocol. Only HTTP and HTTPS are allowed.");
  }

  const hostname = parsedUrl.hostname;

  // If the hostname is already an IP, check it directly
  if (net.isIP(hostname)) {
    if (isRestrictedIP(hostname)) {
      throw new Error(`SSRF Blocked: Target IP ${hostname} is restricted.`);
    }
    return fetch(url, options);
  }

  // Resolve hostname to IP
  let ips: string[];
  try {
    ips = await resolve(hostname);
  } catch (error) {
    throw new Error(`DNS Resolution failed for ${hostname}`);
  }

  if (!ips || ips.length === 0) {
    throw new Error(`No IP found for ${hostname}`);
  }

  // Check the first resolved IP
  const targetIp = ips[0];
  if (isRestrictedIP(targetIp)) {
    throw new Error(`SSRF Blocked: Resolved IP ${targetIp} for ${hostname} is restricted.`);
  }

  // Construct the new safe URL using the resolved IP
  const safeUrl = new URL(url);
  safeUrl.hostname = targetIp;

  // Preserve the original Host header for virtual hosting to work
  const headers = new Headers(options?.headers);
  if (!headers.has("Host")) {
    headers.set("Host", hostname);
  }

  return fetch(safeUrl.toString(), { ...options, headers });
}
