import { db, emailValidations } from "@qwikmailer/db";
import { eq } from "drizzle-orm";
import { resolveMx } from "node:dns/promises";

// Static lists for fast lookups
const ROLE_PREFIXES = new Set([
  "admin", "support", "info", "sales", "billing", "contact", "hello", "team",
  "webmaster", "postmaster", "hostmaster", "noreply", "no-reply", "jobs",
  "careers", "press", "marketing", "security", "abuse", "privacy"
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com",
  "temp-mail.org", "throwawaymail.com", "dispostable.com", "maildrop.cc",
  "sharklasers.com", "getnada.com", "nada.ltd", "tempmail.net", "trashmail.com"
]);

export interface ValidationResult {
  email: string;
  status: "valid" | "invalid" | "disposable" | "role_based" | "catch_all" | "unknown";
  score: number;
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  hasMxRecords: boolean;
  validatedAt: Date;
}

export class ValidationService {
  /**
   * Validate a single email address
   * 1. Check syntax
   * 2. Check DB cache
   * 3. Check Role/Disposable
   * 4. Check DNS MX records
   * 5. Save to DB cache
   */
  static async validate(email: string): Promise<ValidationResult> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // 1. Basic Syntax Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return this.createResult(normalizedEmail, "invalid", 0, false, false, false, false);
    }

    // 2. Check Cache
    try {
      const cached = await db.query.emailValidations.findFirst({
        where: eq(emailValidations.email, normalizedEmail),
      });

      // If cached less than 30 days ago, use it
      if (cached && (Date.now() - new Date(cached.validatedAt).getTime() < 30 * 24 * 60 * 60 * 1000)) {
        return {
          email: cached.email,
          status: cached.status as ValidationResult["status"],
          score: cached.score || 0,
          isDisposable: cached.isDisposable,
          isRoleBased: cached.isRoleBased,
          isCatchAll: cached.isCatchAll,
          hasMxRecords: cached.hasMxRecords,
          validatedAt: cached.validatedAt,
        };
      }
    } catch (err) {
      console.warn("Validation cache read error:", err);
    }

    const [localPart, domain] = normalizedEmail.split("@");

    // 3. Fast Static Checks
    const isRoleBased = ROLE_PREFIXES.has(localPart);
    const isDisposable = DISPOSABLE_DOMAINS.has(domain);
    let status: ValidationResult["status"] = "valid";
    let score = 100;

    if (isDisposable) {
      status = "disposable";
      score = 10; // Very risky
    } else if (isRoleBased) {
      status = "role_based";
      score = 70; // Valid but lower quality
    }

    // 4. DNS MX Check (only if not disposable, disposable is already known bad)
    let hasMxRecords = false;
    let isCatchAll = false; // We don't deep SMTP probe for catch-all yet to save time
    
    if (status === "valid" || status === "role_based") {
      try {
        const mxRecords = await resolveMx(domain);
        hasMxRecords = mxRecords && mxRecords.length > 0;
        if (!hasMxRecords) {
          status = "invalid";
          score = 0;
        }
      } catch (err: any) {
        // ENODATA or ENOTFOUND means domain doesn't exist or has no MX
        if (err.code === "ENODATA" || err.code === "ENOTFOUND") {
          hasMxRecords = false;
          status = "invalid";
          score = 0;
        } else {
          // Timeout or DNS server issue
          hasMxRecords = false;
          status = "unknown";
          score = 50;
        }
      }
    }

    const result = this.createResult(
      normalizedEmail, 
      status, 
      score, 
      isDisposable, 
      isRoleBased, 
      isCatchAll, 
      hasMxRecords
    );

    // 5. Save to Cache
    try {
      await db.insert(emailValidations).values({
        email: result.email,
        status: result.status,
        score: result.score,
        isDisposable: result.isDisposable,
        isRoleBased: result.isRoleBased,
        isCatchAll: result.isCatchAll,
        hasMxRecords: result.hasMxRecords,
        validatedAt: result.validatedAt,
      }).onConflictDoUpdate({
        target: emailValidations.email,
        set: {
          status: result.status,
          score: result.score,
          isDisposable: result.isDisposable,
          isRoleBased: result.isRoleBased,
          isCatchAll: result.isCatchAll,
          hasMxRecords: result.hasMxRecords,
          validatedAt: result.validatedAt,
        }
      });
    } catch (err) {
      console.warn("Validation cache write error:", err);
    }

    return result;
  }

  private static createResult(
    email: string, 
    status: ValidationResult["status"], 
    score: number, 
    isDisposable: boolean, 
    isRoleBased: boolean, 
    isCatchAll: boolean, 
    hasMxRecords: boolean
  ): ValidationResult {
    return {
      email,
      status,
      score,
      isDisposable,
      isRoleBased,
      isCatchAll,
      hasMxRecords,
      validatedAt: new Date()
    };
  }
}
