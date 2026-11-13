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
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="https://qwikmailer.in/qwikmailer-icon.png" alt="Qwik Mailer" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#000000;letter-spacing:-0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Qwikmailer</span>
                  </td>
                </tr>
              </table>
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
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Septet Labs</title>
  <style>
    /* Mobile responsive overrides */
    @media only screen and (max-width: 600px) {
      .outer-wrapper {
        padding: 20px 10px !important;
      }
      .main-table {
        width: 100% !important;
        max-width: 100% !important;
      }
      .main-card {
        padding: 24px 16px !important;
        border-radius: 12px !important;
      }
      .header-logo {
        width: 34px !important;
        height: 34px !important;
      }
      .header-title {
        font-size: 18px !important;
      }
      .btn-cta {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        padding: 14px 16px !important;
      }
      .overview-row td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 6px 0 !important;
      }
      .overview-label {
        font-size: 12px !important;
        padding-bottom: 2px !important;
      }
      .overview-value {
        padding-bottom: 8px !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .submission-row td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 6px 8px !important;
      }
      .submission-label {
        font-size: 12px !important;
        padding-bottom: 2px !important;
        border-bottom: none !important;
      }
      .submission-value {
        padding-bottom: 10px !important;
      }
      .break-link {
        word-break: break-all !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <span style="display:none;font-size:1px;color:#f8fafc;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
  <table width="100%" class="outer-wrapper" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;width:100%;">
    <tr>
      <td align="center">
        <table width="580" class="main-table" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="https://septetlabs.in/septet-logo.png" alt="Septet Labs" width="40" height="40" class="header-logo" style="display:block;border-radius:8px;border:1px solid #e2e8f0;" />
                  </td>
                  <td style="vertical-align:middle;text-align:left;">
                    <div class="header-title" style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:0.5px;line-height:1.2;">
                      SEPTET <span style="color:#175bf2;">LABS</span>
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
            <td class="main-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px;box-shadow:0 4px 12px -2px rgba(0,0,0,0.05);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:28px 16px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0 0 10px 0;line-height:1.6;">
                <a href="https://septetlabs.in" style="color:#175bf2;text-decoration:none;margin:0 8px;font-weight:500;">septetlabs.in</a> • 
                <a href="mailto:contact@septetlabs.in" style="color:#175bf2;text-decoration:none;margin:0 8px;font-weight:500;">contact@septetlabs.in</a> • 
                <a href="https://www.linkedin.com/company/septetlabs" style="color:#175bf2;text-decoration:none;margin:0 8px;font-weight:500;">LinkedIn</a>
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
    from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
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
  if (
    form.id === "ab27b2af-2811-4ad1-8c62-1aaa1523d27c" ||
    form.id === "53e54dc1-4836-47aa-bdd6-b38a56f04ab5" ||
    form.id === "0d4ed8cc-5995-46c7-a2d6-2ce73f97899f"
  ) {
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
  customSubject?: string;
  customBody?: string;
  includeSummary?: boolean;
}): Promise<void> {
  const { toEmail, respondentName, formName, isSeptet, data, schema, customSubject, customBody, includeSummary = true } = params;

  const formattedFields = formatSubmissionFields(data, schema);
  const rowsHtml = formattedFields.map(f => `
    <tr class="submission-row">
      <td class="submission-label" style="padding:10px 12px;font-size:13px;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;width:40%;">
        ${escapeHtml(f.label)}
      </td>
      <td class="submission-value" style="padding:10px 12px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;word-break:break-word;">
        ${escapeHtml(f.value)}
      </td>
    </tr>
  `).join("");

  if (isSeptet) {
    const isInterview = formName.toLowerCase().includes("interview");
    const isInternship = formName.toLowerCase().includes("internship");

    const headingText = isInterview ? "Interview Availability Confirmed" : "Application Received";
    const subText = isInterview
      ? `Thank you for providing your availability for the <strong>Septet Labs Internship Interview</strong>! We have successfully recorded your preferred date and time slot.`
      : isInternship 
        ? "Thank you for applying to the <strong>Remote Internship Program</strong> at Septet Labs! We have successfully received your application." 
        : `Thank you for reaching out to Septet Labs. We have successfully received your submission for <strong>${escapeHtml(formName)}</strong>.`;

    const nextStepsTitle = isInterview ? "What to Expect Next" : "Next Steps";
    const nextStepsBody = isInterview
      ? "Our technical panel will review your chosen slot and send an official <strong>Google Meet invitation link</strong> directly to this email address within 24 hours. Please ensure you are in a quiet room with a working webcam, microphone, and stable internet connection."
      : "Our technical team evaluates every application thoroughly. If shortlisted, you will hear back from us via <strong>Email or WhatsApp</strong> within <strong>5–7 business days</strong>.";

    const emailSubject = isInterview
      ? `Interview Availability Confirmed — ${formName}`
      : `Application Received — ${formName}`;

    const content = `
      <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px 0;">${headingText}</h1>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Hi <strong>${escapeHtml(respondentName || "there")}</strong>,
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        ${subText}
      </p>
      
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:0 0 24px 0;">
        <div style="font-size:11px;font-weight:700;color:#175bf2;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
          Submission Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </div>

      <div style="background-color:#eff5ff;border-left:3px solid #175bf2;border-radius:4px;padding:14px 16px;margin:0 0 24px 0;">
        <div style="font-size:13px;font-weight:700;color:#175bf2;margin-bottom:4px;">${nextStepsTitle}</div>
        <p style="font-size:13px;color:#334155;line-height:1.5;margin:0;">
          ${nextStepsBody}
        </p>
      </div>

      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
        Make sure you follow Septet Labs on <a href="https://www.linkedin.com/company/septetlabs" style="color:#175bf2;text-decoration:none;font-weight:600;">LinkedIn</a> for updates, project launches, and announcements. If you have any queries, feel free to reply directly to this email or contact us at <a href="mailto:contact@septetlabs.in" style="color:#175bf2;text-decoration:none;font-weight:600;">contact@septetlabs.in</a>.
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
      subject: emailSubject,
      html: septetEmailLayout(content, `Your response for ${formName} was recorded successfully.`),
      text: `Hi ${respondentName || "there"},\n\nThank you for submitting ${formName}. We have received your availability.\n\nBest regards,\nSeptet Labs Team`,
    });

    console.log(`[EmailService] Sent Septet Labs confirmation email to ${toEmail} for ${formName}`);
  } else {
    // Platform-related (Qwik Mailer)
    const summarySection = includeSummary !== false ? `
      <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:0 0 24px 0;">
        <div style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
          Submission Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </div>
    ` : "";

    const userMessage = customBody?.trim()
      ? `<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${escapeHtml(customBody).replace(/\n/g, '<br/>')}</p>`
      : `<p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Thank you for submitting <strong>${escapeHtml(formName)}</strong>. We have successfully received your response.</p>`;

    const subjectLine = customSubject?.trim()
      ? customSubject.replace(/\{form_name\}/gi, formName)
      : `Submission Confirmed — ${formName}`;

    const content = `
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px 0;">Submission Confirmed</h1>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Hi <strong>${escapeHtml(respondentName || "there")}</strong>,
      </p>
      ${userMessage}
      ${summarySection}
      <p style="color:#6b7280;font-size:13px;margin:24px 0 0 0;">
        Best regards,<br/>
        <strong style="color:#111827;">Qwik Mailer</strong>
      </p>
    `;

    await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`,
      to: toEmail,
      replyTo: process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in",
      subject: subjectLine,
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
    <tr class="submission-row">
      <td class="submission-label" style="padding:10px 12px;font-size:13px;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;width:40%;">
        ${escapeHtml(f.label)}
      </td>
      <td class="submission-value" style="padding:10px 12px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;word-break:break-word;">
        ${escapeHtml(f.value)}
      </td>
    </tr>
  `).join("");

  const sender = isSeptet
    ? `"Septet Labs" <hello@septetlabs.in>`
    : `"${process.env.SMTP_FROM_NAME ?? "Qwik Mailer"}" <${process.env.SMTP_FROM_EMAIL ?? "noreply@qwikmailer.in"}>`;

  const isInterview = formName.toLowerCase().includes("interview");
  const subject = isSeptet
    ? isInterview
      ? `Interview Scheduled: ${formName} — ${respondentName || respondentEmail || "Candidate"}`
      : `New Application: ${formName} — ${respondentName || respondentEmail || "Applicant"}`
    : `New Form Submission: ${formName} — ${respondentName || respondentEmail || "Respondent"}`;

  const headerTitle = isInterview ? "Interview Availability Submitted" : "New Application Received";

  const content = isSeptet ? `
    <h1 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px 0;">${headerTitle}</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 16px 0;">
      A candidate has submitted their availability for <strong style="color:#175bf2;">${escapeHtml(formName)}</strong>.
    </p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:0 0 20px 0;">
      <div style="font-size:11px;font-weight:700;color:#175bf2;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
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

// ─── Send Interview Invitation Email ───────────────────────────────────────────

export async function sendInterviewInvitationEmail(params: {
  toEmail: string;
  candidateName?: string;
  role?: string;
}): Promise<void> {
  const { toEmail, candidateName, role } = params;
  const scheduleUrl = "https://apply.septetlabs.in/interview";

  const roleText = role ? ` for the <strong>${escapeHtml(role)}</strong> role` : "";
  const roleTextPlain = role ? ` for the ${role} role` : "";

  const content = `
    <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px 0;line-height:1.3;">Interview Invitation</h1>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
      Hi <strong>${escapeHtml(candidateName || "there")}</strong>,
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
      Thank you for applying for the <strong>Remote Internship Program</strong> at Septet Labs. 
      Our technical panel reviewed your application and project background, and we would like to invite you for a <strong>1-on-1 technical and introductory interview</strong>${roleText}.
    </p>

    <!-- Interview Format Box -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin:0 0 24px 0;">
      <div style="font-size:11px;font-weight:700;color:#175bf2;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        Interview Overview
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
        <tr class="overview-row">
          <td class="overview-label" style="padding:8px 0;font-size:13px;color:#475569;font-weight:600;width:35%;border-bottom:1px solid #f1f5f9;">Format</td>
          <td class="overview-value" style="padding:8px 0;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">Remote (Google Meet)</td>
        </tr>
        <tr class="overview-row">
          <td class="overview-label" style="padding:8px 0;font-size:13px;color:#475569;font-weight:600;width:35%;border-bottom:1px solid #f1f5f9;">Duration</td>
          <td class="overview-value" style="padding:8px 0;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">20–30 Minutes</td>
        </tr>
        <tr class="overview-row">
          <td class="overview-label" style="padding:8px 0;font-size:13px;color:#475569;font-weight:600;width:35%;">Discussion Focus</td>
          <td class="overview-value" style="padding:8px 0;font-size:13px;color:#0f172a;font-weight:600;">Core Tech Stack, Highlighted Project Walk-through &amp; Q&amp;A</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:28px 0 32px 0;">
      <a href="${scheduleUrl}"
         class="btn-cta"
         style="display:inline-block;background-color:#175bf2;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 10px -2px rgba(23,91,242,0.35);">
        Choose Your Interview Date &amp; Time
      </a>
      <p style="color:#64748b;font-size:12px;margin:12px 0 0 0;line-height:1.5;">
        Or open directly: <a href="${scheduleUrl}" class="break-link" style="color:#175bf2;text-decoration:none;">${scheduleUrl}</a>
      </p>
    </div>

    <!-- Preparation Note -->
    <div style="background-color:#eff5ff;border-left:3px solid #175bf2;border-radius:4px;padding:14px 16px;margin:0 0 24px 0;">
      <div style="font-size:13px;font-weight:700;color:#175bf2;margin-bottom:4px;">Next Steps</div>
      <p style="font-size:13px;color:#334155;line-height:1.5;margin:0;">
        Please confirm your preferred slot within the next <strong>48 hours</strong>. Once submitted, our team will review the slot and send you the official Google Meet calendar invite.
      </p>
    </div>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
      If you have any questions or need to reschedule, reply directly to this email or reach us at <a href="mailto:contact@septetlabs.in" style="color:#175bf2;text-decoration:none;font-weight:600;">contact@septetlabs.in</a>.
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
    subject: `Interview Invitation — Septet Labs Remote Internship Program`,
    html: septetEmailLayout(content, "You have been shortlisted for an interview with Septet Labs."),
    text: `Hi ${candidateName || "there"},\n\nCongratulations! Your application for the Septet Labs Remote Internship Program has been shortlisted${roleTextPlain}.\n\nPlease choose your preferred interview date and time slot using the link below:\n${scheduleUrl}\n\nIf you have any queries, reply directly to this email or contact us at contact@septetlabs.in.\n\nBest regards,\nSeptet Labs Team`,
  });

  console.log(`[EmailService] Sent interview invitation email to ${toEmail}`);
}
