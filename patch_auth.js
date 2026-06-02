const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/routes/auth.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Add UAParser import if missing
if (!code.includes('import UAParser from "ua-parser-js";')) {
  code = code.replace(
    'import { nanoid } from "nanoid";',
    'import { nanoid } from "nanoid";\nimport UAParser from "ua-parser-js";\nimport { sendNewLoginAlertEmail, send2FAEnabledEmail, send2FADisabledEmail } from "../services/email.service.js";'
  );
}

// 1. Password Login (POST /v1/auth/login)
const loginRefreshTokensInsertRegex = /await db\.insert\(refreshTokens\)\.values\(\{\s+userId: user\.id,\s+tokenHash,\s+expiresAt: new Date\(Date\.now\(\) \+ 7 \* 24 \* 60 \* 60 \* 1000\),\s+\}\);/;
if (loginRefreshTokensInsertRegex.test(code)) {
  const replacement = `
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(',')[0] || req.ip || "Unknown IP";
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    const deviceName = device.model || device.vendor ? \`\${device.vendor || ""} \${device.model || ""}\`.trim() : "Unknown Device";
    const deviceOs = os.name ? \`\${os.name} \${os.version || ""}\`.trim() : "Unknown OS";
    const browserName = browser.name ? \`\${browser.name} \${browser.version || ""}\`.trim() : "Unknown Browser";

    const existingSession = await db.query.refreshTokens.findFirst({
      where: (rt, { eq, and, or }) => and(eq(rt.userId, user.id), or(eq(rt.ipAddress, ipAddress), eq(rt.userAgent, userAgent))),
    });

    if (!existingSession) {
      sendNewLoginAlertEmail(user.email, user.name || "", deviceName, deviceOs, browserName, ipAddress, new Date().toLocaleString()).catch(err => console.error("Failed to send login alert", err));
    }

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress,
      userAgent,
    });`;
  code = code.replace(loginRefreshTokensInsertRegex, replacement);
}

// 2. 2FA Enable
const totpVerifyRegex = /await db\.update\(users\)\s*\.set\(\{ totpEnabled: true, totpSecret: secret, updatedAt: new Date\(\) \}\)\s*\.where\(eq\(users\.id, user\.sub\)\);/;
if (totpVerifyRegex.test(code)) {
  const replacement = `await db.update(users)
      .set({ totpEnabled: true, totpSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, user.sub));

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.sub) });
    if (dbUser) {
      const userAgent = req.headers["user-agent"] || "";
      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();
      const deviceName = device.model || device.vendor ? \`\${device.vendor || ""} \${device.model || ""}\`.trim() : "Unknown Device";
      const deviceOs = os.name ? \`\${os.name} \${os.version || ""}\`.trim() : "Unknown OS";
      const browserName = browser.name ? \`\${browser.name} \${browser.version || ""}\`.trim() : "Unknown Browser";
      
      send2FAEnabledEmail(dbUser.email, dbUser.name || "", deviceName, deviceOs, browserName).catch(console.error);
    }`;
  code = code.replace(totpVerifyRegex, replacement);
}

// 3. 2FA Disable
const totpDisableRegex = /await db\.update\(users\)\s*\.set\(\{ totpEnabled: false, totpSecret: null, updatedAt: new Date\(\) \}\)\s*\.where\(eq\(users\.id, user\.sub\)\);/;
if (totpDisableRegex.test(code)) {
  const replacement = `await db.update(users)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(users.id, user.sub));

    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const deviceName = device.model || device.vendor ? \`\${device.vendor || ""} \${device.model || ""}\`.trim() : "Unknown Device";
    const deviceOs = os.name ? \`\${os.name} \${os.version || ""}\`.trim() : "Unknown OS";
    const browserName = browser.name ? \`\${browser.name} \${browser.version || ""}\`.trim() : "Unknown Browser";
    
    send2FADisabledEmail(dbUser.email, dbUser.name || "", deviceName, deviceOs, browserName).catch(console.error);`;
  code = code.replace(totpDisableRegex, replacement);
}

fs.writeFileSync(filePath, code);
console.log("Patched auth.ts successfully");
