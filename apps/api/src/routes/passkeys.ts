import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users, userPasskeys } from "@qwikmailer/db";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { authenticate } from "../middleware/auth.js";
import { nanoid } from "nanoid";
import UAParser from "ua-parser-js";

// We'll rely on RP ID for WebAuthn. In dev it's "localhost", in prod it's the domain.
const rpName = "Qwik Mailer";
const rpID = process.env.NODE_ENV === "production" ? "qwikmailer.in" : "localhost";
const origin = process.env.NEXT_PUBLIC_API_URL?.replace("4000", "3000") ?? "http://localhost:3000";

const generateRegistrationOptionsSchema = z.object({});

const verifyRegistrationSchema = z.object({
  body: z.any() // RegistrationResponseJSON
});

const generateAuthenticationOptionsSchema = z.object({
  email: z.string().email(),
});

const verifyAuthenticationSchema = z.object({
  email: z.string().email(),
  body: z.any() // AuthenticationResponseJSON
});

export default async function passkeysRoutes(fastify: FastifyInstance) {
  
  // 1. Generate Registration Options (Requires auth)
  fastify.get(
    "/register-options",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
        with: { passkeys: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const userPasskeysList = user.passkeys || [];

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new Uint8Array(Buffer.from(user.id)),
        userName: user.email,
        attestationType: "none",
        excludeCredentials: userPasskeysList.map((passkey) => ({
          id: passkey.credentialId,
          transports: passkey.transports as unknown as any, // AuthenticatorTransportFuture[]
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      // Save challenge temporarily for verification
      await db
        .update(users)
        .set({ webauthnCurrentChallenge: options.challenge })
        .where(eq(users.id, user.id));

      return reply.send(options);
    }
  );

  // 2. Verify Registration Response (Requires auth)
  fastify.post(
    "/register-verify",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const expectedChallenge = user.webauthnCurrentChallenge;

      if (!expectedChallenge) {
        return reply.status(400).send({ error: "No passkey challenge found" });
      }

      const body = request.body as any;

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ error: error.message });
      }

      const { verified, registrationInfo } = verification;

      if (verified && registrationInfo) {
        const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

        const userAgent = request.headers["user-agent"] || "";
        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        
        const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
        const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
        const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";
        const ipAddress = (request.headers["x-forwarded-for"] as string)?.split(',')[0] || request.ip || "Unknown IP";

        const newPasskey = await db.insert(userPasskeys).values({
          userId: user.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          deviceType: credentialDeviceType,
          deviceName,
          deviceOs,
          browser: browserName,
          ipAddress,
          backedUp: credentialBackedUp,
          transports: credential.transports || body.response.transports || [],
        }).returning();

        // Clear challenge
        await db
          .update(users)
          .set({ webauthnCurrentChallenge: null })
          .where(eq(users.id, user.id));

        import("../services/email.service.js").then(({ sendPasskeyAddedEmail }) => {
          sendPasskeyAddedEmail(user.email, user.name || "", deviceName, deviceOs, browserName).catch((err) => {
            console.error(`[Passkeys] Failed to send passkey added email:`, err.message);
          });
        });

        return reply.send({ verified: true, passkey: newPasskey[0] });
      }

      return reply.status(400).send({ error: "Registration verification failed" });
    }
  );

  // 3. Generate Authentication Options (No auth required)
  fastify.post(
    "/login-options",
    async (request, reply) => {
      const { email } = generateAuthenticationOptionsSchema.parse(request.body);

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: { passkeys: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const userPasskeysList = user.passkeys || [];

      if (userPasskeysList.length === 0) {
        return reply.status(400).send({ error: "No passkeys registered for this user" });
      }

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeysList.map((passkey) => ({
          id: passkey.credentialId,
          transports: passkey.transports as unknown as any,
        })),
        userVerification: "preferred",
      });

      // Save challenge temporarily for verification
      await db
        .update(users)
        .set({ webauthnCurrentChallenge: options.challenge })
        .where(eq(users.id, user.id));

      return reply.send(options);
    }
  );

  // 4. Verify Authentication Response (No auth required)
  fastify.post(
    "/login-verify",
    async (request, reply) => {
      const { email, body } = verifyAuthenticationSchema.parse(request.body);

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: { passkeys: true },
      });

      if (!user || !user.webauthnCurrentChallenge) {
        return reply.status(400).send({ error: "Invalid challenge or user not found" });
      }

      const passkey = user.passkeys.find(
        (pk) => pk.credentialId === body.id
      );

      if (!passkey) {
        return reply.status(400).send({ error: "Passkey not recognized" });
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: user.webauthnCurrentChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: passkey.credentialId,
            publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
            counter: passkey.counter,
          },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ error: error.message });
      }

      const { verified, authenticationInfo } = verification;

      if (verified) {
        // Update counter and clear challenge
        await db.transaction(async (tx) => {
          await tx
            .update(userPasskeys)
            .set({ 
              counter: authenticationInfo.newCounter,
              lastUsedAt: new Date()
            })
            .where(eq(userPasskeys.id, passkey.id));

          await tx
            .update(users)
            .set({ webauthnCurrentChallenge: null })
            .where(eq(users.id, user.id));
        });

        // Generate tokens (similar to standard login)
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret";
        
        const accessToken = fastify.jwt.sign(
          { sub: user.id, email: user.email, role: user.role, plan: user.plan },
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        const refreshToken = fastify.jwt.sign(
          { sub: user.id, email: user.email, role: user.role, plan: user.plan },
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
        );
        
        const crypto = await import("crypto");
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const userAgent = request.headers["user-agent"] || "";
        const ipAddress = (request.headers["x-forwarded-for"] as string)?.split(',')[0] || request.ip || "Unknown IP";
        
        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        
        const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
        const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
        const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";

        const { refreshTokens } = await import("@qwikmailer/db");

        const existingSession = await db.query.refreshTokens.findFirst({
          where: (rt, { eq, and, or }) => and(eq(rt.userId, user.id), or(eq(rt.ipAddress, ipAddress), eq(rt.userAgent, userAgent))),
        });

        if (!existingSession) {
          import("../services/email.service.js").then(({ sendNewLoginAlertEmail }) => {
            sendNewLoginAlertEmail(user.email, user.name || "", deviceName, deviceOs, browserName, ipAddress, new Date().toLocaleString()).catch(err => console.error("Failed to send login alert", err));
          });
        }

        await db.insert(refreshTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress,
          userAgent,
        });

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted,
          },
          accessToken,
          refreshToken,
        });
      }

      return reply.status(400).send({ error: "Authentication verification failed" });
    }
  );

  // 5. Get My Passkeys
  fastify.get(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
        with: { passkeys: true },
      });

      return reply.send(user?.passkeys || []);
    }
  );

  // 6. Generate Delete Challenge (for passkey-based deletion verification)
  fastify.get(
    "/delete-options",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
        with: { passkeys: true },
      });

      if (!user || !user.passkeys || user.passkeys.length === 0) {
        return reply.status(400).send({ error: "No passkeys registered" });
      }

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: user.passkeys.map((pk) => ({
          id: pk.credentialId,
          transports: pk.transports as any,
        })),
        userVerification: "required",
      });

      // Save challenge for later verification
      await db.update(users)
        .set({ webauthnCurrentChallenge: options.challenge })
        .where(eq(users.id, user.id));

      return reply.send(options);
    }
  );

  // 7. Delete a Passkey
  fastify.delete(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { password?: string; totpCode?: string; webauthnResponse?: any } | undefined;
      
      const passkeyToDelete = await db.query.userPasskeys.findFirst({
        where: eq(userPasskeys.id, id),
      });

      if (!passkeyToDelete || passkeyToDelete.userId !== request.user.sub) {
        return reply.status(404).send({ error: "Passkey not found" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
        with: { passkeys: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      // Verification Step — Password, 2FA, or Passkey
      if (body?.webauthnResponse) {
        // Verify via passkey
        if (!user.webauthnCurrentChallenge) {
          return reply.status(400).send({ error: "No active challenge. Please request delete-options first." });
        }
        const signingPasskey = user.passkeys.find(
          (pk) => pk.credentialId === body.webauthnResponse.id
        );
        if (!signingPasskey) {
          return reply.status(400).send({ error: "Passkey not recognized" });
        }
        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: body.webauthnResponse,
            expectedChallenge: user.webauthnCurrentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
              id: signingPasskey.credentialId,
              publicKey: new Uint8Array(Buffer.from(signingPasskey.publicKey, "base64url")),
              counter: signingPasskey.counter,
            },
          });
        } catch (err: any) {
          return reply.status(401).send({ error: err.message || "Passkey verification failed" });
        }
        if (!verification.verified) {
          return reply.status(401).send({ error: "Passkey verification failed" });
        }
        // Clear challenge
        await db.update(users).set({ webauthnCurrentChallenge: null }).where(eq(users.id, user.id));
      } else if (body?.password) {
        const bcrypt = await import("bcrypt");
        if (!(await bcrypt.compare(body.password, user.passwordHash))) {
          return reply.status(401).send({ error: "Invalid password" });
        }
      } else if (body?.totpCode && user.totpEnabled && user.totpSecret) {
        const { authenticator } = await import("otplib");
        const isValid = authenticator.verify({ token: body.totpCode, secret: user.totpSecret });
        if (!isValid) {
          return reply.status(401).send({ error: "Invalid 2FA code" });
        }
      } else if (user.passwordHash || user.totpEnabled) {
        return reply.status(401).send({ error: "Please provide a passkey, password, or 2FA code to verify deletion" });
      }

      await db.delete(userPasskeys).where(eq(userPasskeys.id, id));

      const userAgent = request.headers["user-agent"] || "";
      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();
      
      const deviceName = device.model || device.vendor ? `${device.vendor || ""} ${device.model || ""}`.trim() : "Unknown Device";
      const deviceOs = os.name ? `${os.name} ${os.version || ""}`.trim() : "Unknown OS";
      const browserName = browser.name ? `${browser.name} ${browser.version || ""}`.trim() : "Unknown Browser";

      import("../services/email.service.js").then(({ sendPasskeyDeletedEmail }) => {
        sendPasskeyDeletedEmail(user.email, user.name || "", deviceName, deviceOs, browserName).catch((err) => {
          console.error(`[Passkeys] Failed to send passkey deleted email:`, err.message);
        });
      });

      return reply.send({ success: true, message: "Passkey deleted" });
    }
  );
}
