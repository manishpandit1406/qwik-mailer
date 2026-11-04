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
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;font-size:1px;color:#f9fafb;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:24px;font-weight:800;color:#000000;letter-spacing:-0.5px;">
                <span style="color:#000000;">Qwik Mailer</span>
              </span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:40px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="color:#6b7280;font-size:12px;margin:0;">
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

// ─── Septet Labs HTML Layout ──────────────────────────────────────────────────

function septetEmailLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Septet Labs</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;font-size:1px;color:#f8fafc;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="https://septetlabs.in/septet-logo.png" alt="Septet Labs" width="40" height="40" style="display:block;border-radius:8px;border:1px solid #e2e8f0;" />
                  </td>
                  <td style="vertical-align:middle;text-align:left;">
                    <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:0.5px;line-height:1.2;">
                      SEPTET <span style="color:#0284c7;">LABS</span>
                    </div>
                    <div style="font-size:10px;font-weight:600;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;">
                      Architecting the Unseen
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px;box-shadow:0 4px 12px -2px rgba(0,0,0,0.05);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:28px 16px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0 0 10px 0;line-height:1.6;">
                <a href="https://septetlabs.in" style="color:#0284c7;text-decoration:none;margin:0 8px;font-weight:500;">septetlabs.in</a> • 
                <a href="mailto:contact@septetlabs.in" style="color:#0284c7;text-decoration:none;margin:0 8px;font-weight:500;">contact@septetlabs.in</a> • 
                <a href="https://www.linkedin.com/company/septetlabs" style="color:#0284c7;text-decoration:none;margin:0 8px;font-weight:500;">LinkedIn</a>
              </p>
              <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5;">
                © ${new Date().getFullYear()} Septet Labs. All rights reserved.<br />
                This is an automated notification regarding your submission.
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
  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/verify-email?token=${token}`;

  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Verify your email</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      Hey ${name || "there"}, welcome to <strong style="color:#111827;">Qwik Mailer</strong>! Click the button below to verify your email address and activate your account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
         style="display:inline-block;background-color:#000000;color:#ffffff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Verify Email Address →
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      This link expires in <strong style="color:#111827;">24 hours</strong>. If you didn't create an account, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#4b5563;">${verifyUrl}</span>
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Verify your Qwik Mailer account",
    html: emailLayout(content, "Welcome! Please verify your email to get started."),
    text: `Welcome to Qwik Mailer!\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  console.log(`[EmailService] Verification email sent to ${email}`);
}

// ─── Send Password Reset Email ────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/reset-password?token=${token}`;

  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Reset your password</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      Hey ${name || "there"}, we received a request to reset your password for your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background-color:#000000;color:#ffffff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Reset Password →
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      This link expires in <strong style="color:#111827;">1 hour</strong>. If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#4b5563;">${resetUrl}</span>
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Reset your Qwik Mailer password",
    html: emailLayout(content, "Reset your password — link expires in 1 hour."),
    text: `Reset your Qwik Mailer password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });

  console.log(`[EmailService] Password reset email sent to ${email}`);
}

// ─── Send Password Reset Success Email ────────────────────────────────────────

export async function sendPasswordResetSuccessEmail(
  email: string,
  name: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Password Reset Successful</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      Hey ${name || "there"}, your password for your <strong style="color:#111827;">Qwik Mailer</strong> account has been successfully changed.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please contact our support team immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Your Qwik Mailer password has been changed",
    html: emailLayout(content, "Your password was recently changed."),
    text: `Your Qwik Mailer password has been successfully changed.\n\nIf you did not make this change, please contact support immediately.`,
  });

  console.log(`[EmailService] Password reset success email sent to ${email}`);
}

// ─── Send Welcome Email (after email verified) ────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/dashboard`;

  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Welcome to Qwik Mailer</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name}, your email is now verified. Welcome to <strong style="color:#111827;">Qwik Mailer</strong>! We're excited to have you on board.
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      You can now start setting up your sending domains and integrating our APIs.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${dashboardUrl}"
         style="display:inline-block;background-color:#000000;color:#ffffff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Go to Dashboard →
      </a>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "Welcome to Qwik Mailer — your account is ready",
    html: emailLayout(content, "Your account is ready — start sending emails today."),
    text: `Welcome to Qwik Mailer! Your account is verified.\n\nGo to your dashboard: ${dashboardUrl}`,
  });

  console.log(`[EmailService] Welcome email sent to ${email}`);
}

// ─── Send Domain Verified Email ──────────────────────────────────────────────

export async function sendDomainVerifiedEmail(
  email: string,
  name: string,
  domainName: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Domain Verified</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, great news! Your domain <strong style="color:#111827;">${domainName}</strong> has reached 100% health and is now fully verified.
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
      You can now start sending emails using this domain.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: `Domain ${domainName} is now verified`,
    html: emailLayout(content, `Your domain ${domainName} is fully verified.`),
    text: `Your domain ${domainName} has reached 100% health and is fully verified.\nYou can now start sending emails.`,
  });

  console.log(`[EmailService] Domain verified email sent to ${email}`);
}

// ─── Send Passkey Added Email ─────────────────────────────────────────────────

export async function sendPasskeyAddedEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Passkey Added</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, a new passkey was just added to your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Device:</strong> ${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> ${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> ${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "A new passkey was added to your account",
    html: emailLayout(content, "Security Alert: A new passkey was added."),
    text: `A new passkey was added to your Qwik Mailer account from ${deviceName} (${os}, ${browser}).\n\nIf you did not authorize this, please review your security settings.`,
  });

  console.log(`[EmailService] Passkey added email sent to ${email}`);
}

// ─── Send Passkey Deleted Email ───────────────────────────────────────────────

export async function sendPasskeyDeletedEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Passkey Removed</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, a passkey was recently removed from your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> ${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> ${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> ${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "A passkey was removed from your account",
    html: emailLayout(content, "Security Alert: A passkey was removed."),
    text: `A passkey was removed from your Qwik Mailer account from ${deviceName}.\n\nIf you did not authorize this, please review your security settings.`,
  });

  console.log(`[EmailService] Passkey deleted email sent to ${email}`);
}

// ─── Send 2FA Enabled Email ─────────────────────────────────────────────────

export async function send2FAEnabledEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">2FA Enabled</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, Two-Factor Authentication (2FA) was just enabled on your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> ${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> ${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> ${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "2FA was enabled on your account",
    html: emailLayout(content, "Security Alert: 2FA was enabled."),
    text: `2FA was enabled on your Qwik Mailer account from ${deviceName}.\n\nIf you did not authorize this, please review your security settings.`,
  });

  console.log(`[EmailService] 2FA enabled email sent to ${email}`);
}

// ─── Send 2FA Disabled Email ────────────────────────────────────────────────

export async function send2FADisabledEmail(
  email: string,
  name: string,
  deviceName: string,
  os: string,
  browser: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">2FA Disabled</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, Two-Factor Authentication (2FA) was just disabled on your <strong style="color:#111827;">Qwik Mailer</strong> account.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Action taken from:</strong> ${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> ${os}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Browser:</strong> ${browser}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If you did not make this change, please log in and review your security settings immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "2FA was disabled on your account",
    html: emailLayout(content, "Security Alert: 2FA was disabled."),
    text: `2FA was disabled on your Qwik Mailer account from ${deviceName}.\n\nIf you did not authorize this, please review your security settings.`,
  });

  console.log(`[EmailService] 2FA disabled email sent to ${email}`);
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
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Login Alert</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, we noticed a new login to your <strong style="color:#111827;">Qwik Mailer</strong> account from a device we haven't seen recently.
    </p>
    <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Time:</strong> ${time}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Device:</strong> ${deviceName}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>OS:</strong> ${os}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Browser:</strong> ${browser}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>IP Address:</strong> ${ipAddress}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      If this was you, you can ignore this email. If not, please change your password and review your security settings immediately.
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: "New login to your account",
    html: emailLayout(content, "Security Alert: New Login."),
    text: `New login to your Qwik Mailer account from ${deviceName} (${os}, ${browser}) at ${ipAddress}.\n\nIf this wasn't you, please secure your account immediately.`,
  });

  console.log(`[EmailService] New login alert email sent to ${email}`);
}

export async function sendSharedSenderOtpEmail(to: string, otp: string) {
  const content = `
    <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:16px;">Verify your Sender Identity</h2>
    <p style="color:#4b5563;font-size:16px;line-height:24px;margin-bottom:24px;">
      Use the verification code below to set up your shared domain sender identity. The code is valid for 10 minutes.
    </p>
    <div style="background-color:#f3f4f6;border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;">
      <span style="font-family:monospace;font-size:32px;font-weight:700;color:#111827;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
  `;

  const html = emailLayout(content, "Verify your Sender Identity");

  await getTransporter().sendMail({
    from: '"Qwik Mailer" <noreply@mail.qwikmailer.in>',
    to,
    subject: "Your Verification Code - Qwik Mailer",
    html,
  });
}

// ─── Send Team Invite Email ──────────────────────────────────────────────────

export async function sendTeamInviteEmail(
  to: string,
  inviterName: string,
  teamName: string,
  inviteLink: string,
  role: string,
  expiresAt: Date
): Promise<void> {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const expiryStr = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Team Invitation</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      <strong style="color:#111827;">${inviterName}</strong> has invited you to join the
      <strong style="color:#111827;">${teamName}</strong> team on Qwik Mailer as a
      <strong style="color:#111827;">${roleLabel}</strong>.
    </p>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 32px 0;">
      <p style="margin:0 0 6px 0;font-size:14px;color:#374151;"><strong>Team:</strong> ${teamName}</p>
      <p style="margin:0 0 6px 0;font-size:14px;color:#374151;"><strong>Your role:</strong> ${roleLabel}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Invited by:</strong> ${inviterName}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteLink}"
         style="display:inline-block;background-color:#000000;color:#ffffff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Accept Invitation &rarr;
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;text-align:center;">
      This invitation expires on <strong style="color:#111827;">${expiryStr}</strong>.
      If you don't have a Qwik Mailer account, you'll be prompted to create one.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;word-break:break-all;">
      Or copy this link: <span style="color:#4b5563;">${inviteLink}</span>
    </p>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to,
    subject: `${inviterName} invited you to join ${teamName} on Qwik Mailer`,
    html: emailLayout(content, `You've been invited to join ${teamName} as a ${roleLabel}.`),
    text: `${inviterName} has invited you to join ${teamName} on Qwik Mailer as a ${roleLabel}.\n\nAccept here: ${inviteLink}\n\nExpires: ${expiryStr}`,
  });

  console.log(`[EmailService] Team invite email sent to ${to}`);
}

// ─── Send Support Reply Email ──────────────────────────────────────────────────

export async function sendSupportReplyEmail(
  email: string,
  name: string,
  subject: string,
  originalIssue: string,
  replyMessage: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">New Reply: ${subject}</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
      Hey ${name || "there"}, our support team has replied to your ticket.
    </p>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 32px 0;white-space:pre-wrap;">
      <p style="margin:0;font-size:14px;color:#111827;"><strong>Reply from Admin:</strong></p>
      <p style="margin:8px 0 0 0;font-size:14px;color:#374151;">${replyMessage}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/dashboard/support"
         style="display:inline-block;background-color:#000000;color:#ffffff;font-size:14px;font-weight:500;padding:12px 32px;border-radius:6px;text-decoration:none;">
        View Ticket in Dashboard &rarr;
      </a>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer Support"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
    to: email,
    subject: `Re: ${subject}`,
    html: emailLayout(content, "You have a new reply to your support ticket."),
    text: `New reply to your ticket: ${subject}\n\n${replyMessage}\n\nView your ticket: ${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/dashboard/support`,
  });

  console.log(`[EmailService] Support reply email sent to ${email}`);
}

// ─── Form Submission Helpers & Email Handlers ──────────────────────────────────

function escapeHtml(str: any): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatSubmissionFields(data: Record<string, any>, schema?: any[]): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  const seenKeys = new Set<string>();

  if (schema && Array.isArray(schema) && schema.length > 0) {
    for (const f of schema) {
      const candidates = [f.name, f.id, f.label].filter(Boolean);
      let val: any = undefined;
      for (const k of candidates) {
        if (data[k] !== undefined && data[k] !== null && data[k] !== "") {
          val = data[k];
          seenKeys.add(k);
          break;
        }
      }
      if (val !== undefined) {
        let displayVal = "";
        if (Array.isArray(val)) {
          displayVal = val.join(", ");
        } else if (typeof val === "object") {
          displayVal = JSON.stringify(val);
        } else {
          displayVal = String(val);
        }
        result.push({ label: f.label || f.name, value: displayVal });
      }
    }
  }

  // Include any remaining keys not covered by schema
  for (const [k, v] of Object.entries(data)) {
    if (!seenKeys.has(k) && v !== undefined && v !== null && v !== "") {
      const displayVal = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
      result.push({ label: k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), value: displayVal });
    }
  }

  return result;
}

export function isSeptetLabsForm(form: { id?: string; name?: string }, originOrHost?: string): boolean {
  if (form.id === "ab27b2af-2811-4ad1-8c62-1aaa1523d27c" || form.id === "53e54dc1-4836-47aa-bdd6-b38a56f04ab5") {
    return true;
  }
  if (form.name && form.name.toLowerCase().includes("septet")) {
    return true;
  }
  if (originOrHost) {
    const lower = originOrHost.toLowerCase();
    if (lower.includes("septetlabs.in") || lower.includes("septet.")) {
      return true;
    }
  }
  return false;
}

export async function sendFormSubmissionConfirmationEmail(params: {
  toEmail: string;
  respondentName?: string;
  formName: string;
  formId: string;
  isSeptet: boolean;
  data: Record<string, any>;
  schema?: any[];
}): Promise<void> {
  const { toEmail, respondentName, formName, isSeptet, data, schema } = params;

  const formattedFields = formatSubmissionFields(data, schema);
  const rowsHtml = formattedFields.map(f => `
    <tr>
      <td style="padding:10px 12px;font-size:13px;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;width:40%;">
        ${escapeHtml(f.label)}
      </td>
      <td style="padding:10px 12px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;word-break:break-word;">
        ${escapeHtml(f.value)}
      </td>
    </tr>
  `).join("");

  if (isSeptet) {
    const isInternship = formName.toLowerCase().includes("internship");
    const content = `
      <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px 0;">Application Received</h1>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Hi <strong>${escapeHtml(respondentName || "there")}</strong>,
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        ${isInternship 
          ? "Thank you for applying to the <strong>Remote Internship Program</strong> at Septet Labs! We have successfully received your application." 
          : `Thank you for reaching out to Septet Labs. We have successfully received your submission for <strong>${escapeHtml(formName)}</strong>.`
        }
      </p>
      
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:0 0 24px 0;">
        <div style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
          Submission Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </div>

      <div style="background-color:#f0f9ff;border-left:3px solid #0284c7;border-radius:4px;padding:14px 16px;margin:0 0 24px 0;">
        <div style="font-size:13px;font-weight:700;color:#0369a1;margin-bottom:4px;">Next Steps</div>
        <p style="font-size:13px;color:#334155;line-height:1.5;margin:0;">
          Our talent and technical team evaluates every application thoroughly. If shortlisted, you will hear back from us via <strong>Email or WhatsApp</strong> within <strong>5–7 business days</strong>.
        </p>
      </div>

      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
        Make sure you follow Septet Labs on <a href="https://www.linkedin.com/company/septetlabs" style="color:#0284c7;text-decoration:none;font-weight:600;">LinkedIn</a> for updates, project launches, and announcements. If you have any queries, feel free to reply directly to this email or contact us at <a href="mailto:contact@septetlabs.in" style="color:#0284c7;text-decoration:none;font-weight:600;">contact@septetlabs.in</a>.
      </p>

      <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">
        Best regards,<br/>
        <strong style="color:#0f172a;">Septet Labs Team</strong>
      </p>
    `;

    await getTransporter().sendMail({
      from: `"Septet Labs" <hello@septetlabs.in>`,
      to: toEmail,
      replyTo: "contact@septetlabs.in",
      subject: `Application Received — ${formName}`,
      html: septetEmailLayout(content, `We have received your application for ${formName}`),
      text: `Hi ${respondentName || "there"},\n\nThank you for applying to Septet Labs for ${formName}. We have received your submission.\n\nOur team will review your application and reach out if shortlisted.\n\nIf you have any queries, reply directly to this email or reach us at contact@septetlabs.in.\n\nBest regards,\nSeptet Labs Team`,
    });

    console.log(`[EmailService] Sent Septet Labs confirmation email to ${toEmail} for ${formName}`);
  } else {
    // Platform-related (Qwik Mailer)
    const content = `
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px 0;">Submission Confirmed</h1>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Hi <strong>${escapeHtml(respondentName || "there")}</strong>,
      </p>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Thank you for submitting <strong>${escapeHtml(formName)}</strong>. We have successfully received your response.
      </p>

      <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:0 0 24px 0;">
        <div style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
          Submission Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </div>

      <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;">
        Best regards,<br/>
        <strong style="color:#111827;">Qwik Mailer</strong>
      </p>
    `;

    await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
      to: toEmail,
      replyTo: process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in",
      subject: `Submission Confirmed — ${formName}`,
      html: emailLayout(content, `Your response for ${formName} was recorded successfully.`),
      text: `Hi ${respondentName || "there"},\n\nYour response for ${formName} was recorded successfully.\n\nBest regards,\nQwik Mailer`,
    });

    console.log(`[EmailService] Sent Qwik Mailer confirmation email to ${toEmail} for ${formName}`);
  }
}

export async function sendFormSubmissionAdminNotification(params: {
  toEmail: string;
  formName: string;
  formId: string;
  isSeptet: boolean;
  data: Record<string, any>;
  schema?: any[];
  respondentEmail?: string;
  respondentName?: string;
  submittedAt: Date;
  ip?: string;
}): Promise<void> {
  const { toEmail, formName, isSeptet, data, schema, respondentEmail, respondentName, submittedAt, ip } = params;

  const formattedFields = formatSubmissionFields(data, schema);
  const rowsHtml = formattedFields.map(f => `
    <tr>
      <td style="padding:10px 12px;font-size:13px;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;width:40%;">
        ${escapeHtml(f.label)}
      </td>
      <td style="padding:10px 12px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;word-break:break-word;">
        ${escapeHtml(f.value)}
      </td>
    </tr>
  `).join("");

  const sender = isSeptet
    ? `"Septet Labs" <hello@septetlabs.in>`
    : `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`;

  const subject = isSeptet
    ? `New Application: ${formName} — ${respondentName || respondentEmail || "Applicant"}`
    : `New Form Submission: ${formName} — ${respondentName || respondentEmail || "Respondent"}`;

  const content = isSeptet ? `
    <h1 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px 0;">New Application Received</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 16px 0;">
      A new response has been submitted for <strong style="color:#0284c7;">${escapeHtml(formName)}</strong>.
    </p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:0 0 20px 0;">
      <div style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        Candidate Details
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${rowsHtml}
      </table>
    </div>

    <p style="color:#64748b;font-size:12px;margin:0;">
      Submitted at: ${submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST | IP: ${ip || "Unknown"}
    </p>
  ` : `
    <h1 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px 0;">New Form Submission</h1>
    <p style="color:#4b5563;font-size:14px;line-height:1.5;margin:0 0 16px 0;">
      A new response has been submitted for <strong>${escapeHtml(formName)}</strong>.
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:0 0 20px 0;">
      <div style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        Response Details
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${rowsHtml}
      </table>
    </div>

    <p style="color:#6b7280;font-size:12px;margin:0;">
      Submitted at: ${submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST | IP: ${ip || "Unknown"}
    </p>
  `;

  await getTransporter().sendMail({
    from: sender,
    to: toEmail,
    replyTo: respondentEmail || undefined,
    subject,
    html: isSeptet ? septetEmailLayout(content, `New submission on ${formName}`) : emailLayout(content, `New submission on ${formName}`),
    text: `New submission for ${formName}\nFrom: ${respondentName || ""} <${respondentEmail || ""}>\n\nTime: ${submittedAt.toISOString()}\nIP: ${ip || ""}`,
  });

  console.log(`[EmailService] Sent admin submission alert to ${toEmail} for ${formName}`);
}
