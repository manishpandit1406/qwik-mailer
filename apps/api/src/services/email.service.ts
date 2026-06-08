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
                <span style="color:#000000;">✉️ Qwik Mailer</span>
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

  console.log(`[EmailService] ✅ Verification email sent to ${email}`);
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

  console.log(`[EmailService] ✅ Password reset email sent to ${email}`);
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

  console.log(`[EmailService] ✅ Password reset success email sent to ${email}`);
}

// ─── Send Welcome Email (after email verified) ────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "https://qwikmailer.in"}/dashboard`;

  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">You're in! 🎉</h1>
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
    subject: "Welcome to Qwik Mailer — you're all set! 🎉",
    html: emailLayout(content, "Your account is ready — start sending emails today."),
    text: `Welcome to Qwik Mailer! Your account is verified.\n\nGo to your dashboard: ${dashboardUrl}`,
  });

  console.log(`[EmailService] ✅ Welcome email sent to ${email}`);
}

// ─── Send Domain Verified Email ──────────────────────────────────────────────

export async function sendDomainVerifiedEmail(
  email: string,
  name: string,
  domainName: string
): Promise<void> {
  const content = `
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">Domain Verified! 🎉</h1>
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
    subject: `Domain ${domainName} is now verified 🎉`,
    html: emailLayout(content, `Your domain ${domainName} is fully verified.`),
    text: `Your domain ${domainName} has reached 100% health and is fully verified.\nYou can now start sending emails.`,
  });

  console.log(`[EmailService] ✅ Domain verified email sent to ${email}`);
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

  console.log(`[EmailService] ✅ Passkey added email sent to ${email}`);
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

  console.log(`[EmailService] ✅ Passkey deleted email sent to ${email}`);
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

  console.log(`[EmailService] ✅ 2FA enabled email sent to ${email}`);
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

  console.log(`[EmailService] ✅ 2FA disabled email sent to ${email}`);
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

  console.log(`[EmailService] ✅ New login alert email sent to ${email}`);
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
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 16px 0;">You're invited to join a team 🎉</h1>
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
