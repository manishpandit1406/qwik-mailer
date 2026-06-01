import nodemailer from "nodemailer";

// ─── Transporter (Singleton) ──────────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });

  return _transporter;
}

// ─── Base HTML Layout ─────────────────────────────────────────────────────────

function emailLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Qwik Mailer</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <span style="display:none;font-size:1px;color:#0f0f13;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
                ⚡ Qwik Mailer
              </span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid #2d2d4e;border-radius:16px;padding:40px;box-shadow:0 20px 60px rgba(124,58,237,0.15);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="color:#4a4a6a;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Qwik Mailer. All rights reserved.<br />
                You received this because you have an account with us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send Verification Email ──────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;

  const content = `
    <h1 style="color:#f8f8ff;font-size:26px;font-weight:700;margin:0 0 8px 0;">Verify your email ✉️</h1>
    <p style="color:#a0a0c0;font-size:16px;margin:0 0 32px 0;">
      Hey ${name || "there"}, welcome to <strong style="color:#a78bfa;">Qwik Mailer</strong>! Click the button below to verify your email address and activate your account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:16px;font-weight:600;padding:14px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
        Verify Email Address →
      </a>
    </div>
    <p style="color:#6b6b8a;font-size:13px;margin:24px 0 0 0;text-align:center;">
      This link expires in <strong style="color:#a78bfa;">24 hours</strong>. If you didn't create an account, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #2d2d4e;margin:24px 0;" />
    <p style="color:#4a4a6a;font-size:12px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#7c3aed;">${verifyUrl}</span>
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Verify your Qwik Mailer account",
    html: emailLayout(content, "Welcome! Please verify your email to get started."),
    text: `Welcome to Qwik Mailer!\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  console.log(`[EmailService] ✅ Verification email sent to ${email}`);
}

// ─── Send Password Reset Email ────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

  const content = `
    <h1 style="color:#f8f8ff;font-size:26px;font-weight:700;margin:0 0 8px 0;">Reset your password 🔑</h1>
    <p style="color:#a0a0c0;font-size:16px;margin:0 0 32px 0;">
      Hey ${name || "there"}, we received a request to reset your password for your <strong style="color:#a78bfa;">Qwik Mailer</strong> account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:16px;font-weight:600;padding:14px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
        Reset Password →
      </a>
    </div>
    <p style="color:#6b6b8a;font-size:13px;margin:24px 0 0 0;text-align:center;">
      This link expires in <strong style="color:#a78bfa;">1 hour</strong>. If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
    <hr style="border:none;border-top:1px solid #2d2d4e;margin:24px 0;" />
    <p style="color:#4a4a6a;font-size:12px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#7c3aed;">${resetUrl}</span>
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Reset your Qwik Mailer password",
    html: emailLayout(content, "Reset your password — link expires in 1 hour."),
    text: `Reset your Qwik Mailer password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });

  console.log(`[EmailService] ✅ Password reset email sent to ${email}`);
}

// ─── Send Welcome Email (after email verified) ────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard`;

  const content = `
    <h1 style="color:#f8f8ff;font-size:26px;font-weight:700;margin:0 0 8px 0;">You're in! 🎉</h1>
    <p style="color:#a0a0c0;font-size:16px;margin:0 0 24px 0;">
      Hey ${name || "there"}, your email is verified and your <strong style="color:#a78bfa;">Qwik Mailer</strong> account is ready to go!
    </p>
    <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin:0 0 28px 0;">
      <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px 0;font-weight:600;">🚀 What you can do:</p>
      <ul style="color:#a0a0c0;font-size:14px;margin:0;padding-left:20px;line-height:2;">
        <li>Send transactional emails via API</li>
        <li>Create & manage email templates</li>
        <li>Monitor deliverability & analytics</li>
        <li>Set up webhook notifications</li>
      </ul>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:16px;font-weight:600;padding:14px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
        Go to Dashboard →
      </a>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Welcome to Qwik Mailer — you're all set! 🎉",
    html: emailLayout(content, "Your account is ready — start sending emails today."),
    text: `Welcome to Qwik Mailer! Your account is verified.\n\nGo to your dashboard: ${dashboardUrl}`,
  });

  console.log(`[EmailService] ✅ Welcome email sent to ${email}`);
}
