const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/services/email.service.ts');
let code = fs.readFileSync(filePath, 'utf8');

const newEmails = `
// ─── Send Domain Verified Email ──────────────────────────────────────────────

export async function sendDomainVerifiedEmail(
  email: string,
  name: string,
  domainName: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Domain Verified! 🎉</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, great news! Your domain <strong style="color:#111827;">\${domainName}</strong> has reached 100% health and is now fully verified.
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      You can now start sending emails using this domain.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\\"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}\\" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: \`Domain \${domainName} is now verified 🎉\`,
    html: emailLayout(content, \`Your domain \${domainName} is fully verified.\`),
    text: \`Your domain \${domainName} has reached 100% health and is fully verified.\\nYou can now start sending emails.\`,
  });

  console.log(\`[EmailService] ✅ Domain verified email sent to \${email}\`);
}

// ─── Send Passkey Added Email ─────────────────────────────────────────────────

export async function sendPasskeyAddedEmail(
  email: string,
  name: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Passkey Added</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, a new passkey was just added to your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\\"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}\\" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "A new passkey was added to your account",
    html: emailLayout(content, "Security Alert: A new passkey was added."),
    text: \`A new passkey was added to your Qwik Mailer account.\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ Passkey added email sent to \${email}\`);
}

// ─── Send Passkey Deleted Email ───────────────────────────────────────────────

export async function sendPasskeyDeletedEmail(
  email: string,
  name: string
): Promise<void> {
  const content = \`
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Passkey Removed</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey \${name || "there"}, a passkey was recently removed from your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  \`;

  await getTransporter().sendMail({
    from: \`"\\"\${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}\\" <\${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>\`,
    to: email,
    subject: "A passkey was removed from your account",
    html: emailLayout(content, "Security Alert: A passkey was removed."),
    text: \`A passkey was removed from your Qwik Mailer account.\\n\\nIf you did not authorize this, please review your security settings.\`,
  });

  console.log(\`[EmailService] ✅ Passkey deleted email sent to \${email}\`);
}
`;

if (!code.includes('sendDomainVerifiedEmail')) {
  fs.writeFileSync(filePath, code + '\\n' + newEmails);
  console.log('Appended new emails.');
} else {
  console.log('Emails already exist.');
}
