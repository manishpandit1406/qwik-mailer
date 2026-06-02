const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/services/email.service.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Replace Passkey Added
code = code.replace(
  /export async function sendPasskeyAddedEmail\([\s\S]*?console\.log\(`\[EmailService\] ✅ Passkey added email sent to \$\{email\}`\);\n\}/,
  `export async function sendPasskeyAddedEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Passkey Added</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, a new passkey was just added to your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Device:</strong> \${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> \${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> \${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "A new passkey was added to your account",
    html: emailLayout(content, "Security Alert: A new passkey was added."),
    text: \`A new passkey was added to your Qwik Mailer account from \${deviceName} (\${os}, \${browser}).\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ Passkey added email sent to \${email}\`);
}`
);

// Replace Passkey Deleted
code = code.replace(
  /export async function sendPasskeyDeletedEmail\([\s\S]*?console\.log\(`\[EmailService\] ✅ Passkey deleted email sent to \$\{email\}`\);\n\}/,
  `export async function sendPasskeyDeletedEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Passkey Removed</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, a passkey was recently removed from your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> \${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> \${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> \${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "A passkey was removed from your account",
    html: emailLayout(content, "Security Alert: A passkey was removed."),
    text: \`A passkey was removed from your Qwik Mailer account from \${deviceName}.\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ Passkey deleted email sent to \${email}\`);
}`
);

// Append new templates
const newEmails = `
// ─── Send 2FA Enabled Email ─────────────────────────────────────────────────

export async function send2FAEnabledEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">2FA Enabled</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, Two-Factor Authentication (2FA) was just enabled on your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> \${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> \${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> \${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "2FA was enabled on your account",
    html: emailLayout(content, "Security Alert: 2FA was enabled."),
    text: \`2FA was enabled on your Qwik Mailer account from \${deviceName}.\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ 2FA enabled email sent to \${email}\`);
}

// ─── Send 2FA Disabled Email ────────────────────────────────────────────────

export async function send2FADisabledEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">2FA Disabled</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, Two-Factor Authentication (2FA) was just disabled on your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> \${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> \${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> \${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "2FA was disabled on your account",
    html: emailLayout(content, "Security Alert: 2FA was disabled."),
    text: \`2FA was disabled on your Qwik Mailer account from \${deviceName}.\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ 2FA disabled email sent to \${email}\`);
}

// ─── Send New Login Alert Email ─────────────────────────────────────────────

export async function sendNewLoginAlertEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string,
  ipAddress: string,
  time: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Login Alert</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, we noticed a new login to your <strong style="color:#111827;">Qwik Mailer</strong> account from a device we haven't seen recently.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Time:</strong> \${time}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Device:</strong> \${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> \${os}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Browser:</strong> \${browser}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>IP Address:</strong> \${ipAddress}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If this was you, you can ignore this email. If not, please change your password and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "New login to your account",
    html: emailLayout(content, "Security Alert: New Login."),
    text: \`New login to your Qwik Mailer account from \${deviceName} (\${os}, \${browser}) at \${ipAddress}.\\n\\nIf this wasn't you, please secure your account immediately.\`,
  });

  console.log(\`[EmailService] ✅ New login alert email sent to \${email}\`);
}
`;

if (!code.includes('sendNewLoginAlertEmail')) {
  fs.writeFileSync(filePath, code + '\\n' + newEmails);
  console.log('Appended and modified emails.');
} else {
  console.log('Emails already exist.');
}
