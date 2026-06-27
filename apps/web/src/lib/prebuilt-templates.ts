export type TemplateCategory = "Welcome" | "E-commerce" | "Marketing" | "Transactional";

export interface PrebuiltTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  htmlBody: string;
  description: string;
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: "welcome-minimal",
    name: "Minimal Welcome",
    category: "Welcome",
    subject: "Welcome to {{companyName}}! 🎉",
    description: "A clean, text-focused welcome email for new signups.",
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Welcome to {{companyName}}!</h1>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Hi {{name | "there"}},</p>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">We're thrilled to have you on board. Our goal is to help you achieve the best results with our platform.</p>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">To get started, check out our quick start guide below:</p>
  <div style="margin: 32px 0;">
    <a href="{{loginUrl}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Get Started</a>
  </div>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">If you have any questions, simply reply to this email. We're here to help!</p>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Best regards,<br>The {{companyName}} Team</p>
</div>`,
  },
  {
    id: "welcome-hero",
    name: "Hero Welcome",
    category: "Welcome",
    subject: "You're in! Welcome to the family 🚀",
    description: "A visually striking welcome email with a large header.",
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
  <div style="background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, {{name | "Friend"}}!</h1>
    <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">We are so excited to see you here.</p>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.5;">Thanks for joining us. You now have access to all our exclusive features and community resources.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" style="background-color: #111827; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Explore Dashboard</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
    <p style="font-size: 14px; color: #6b7280; text-align: center;">Need help? Visit our <a href="{{helpUrl}}" style="color: #4f46e5;">Help Center</a>.</p>
  </div>
</div>`,
  },
  {
    id: "ecommerce-receipt",
    name: "Order Receipt",
    category: "E-commerce",
    subject: "Order Confirmation #{{orderId}}",
    description: "A clean layout for order confirmations and receipts.",
    htmlBody: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
    <h1 style="color: #111827; font-size: 24px; margin: 0;">Order Confirmed</h1>
    <p style="color: #6b7280; margin-top: 5px;">Order #{{orderId}}</p>
  </div>
  <div style="padding: 20px 0;">
    <p style="font-size: 16px; color: #374151;">Hi {{name}},</p>
    <p style="font-size: 16px; color: #374151;">Thank you for your purchase! We're getting your order ready to be shipped. We will notify you when it has been sent.</p>
  </div>
  <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #111827; font-size: 18px;">Order Summary</h3>
    <table width="100%" style="font-size: 15px; color: #374151; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{{productName | "Awesome Product"}}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">{{productPrice | "$99.00"}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0 0 0; font-weight: bold;">Total</td>
        <td style="padding: 12px 0 0 0; font-weight: bold; text-align: right;">{{totalPrice | "$99.00"}}</td>
      </tr>
    </table>
  </div>
  <div style="text-align: center;">
    <a href="{{statusUrl}}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">View Order Status</a>
  </div>
</div>`,
  },
  {
    id: "ecommerce-abandoned",
    name: "Abandoned Cart",
    category: "E-commerce",
    subject: "You left something behind...",
    description: "Remind users of items left in their shopping cart.",
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 20px;">
  <h1 style="color: #111827; font-size: 28px; margin-bottom: 10px;">Did you forget something?</h1>
  <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi {{name}}, we noticed you left some great items in your cart. They are selling out fast, so complete your purchase before they're gone!</p>
  <div style="margin: 40px 0;">
    <a href="{{checkoutUrl}}" style="background-color: #ef4444; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);">Return to Checkout</a>
  </div>
  <p style="color: #6b7280; font-size: 14px;">Use code <strong>COMEBACK10</strong> for 10% off your entire order!</p>
</div>`,
  },
  {
    id: "marketing-newsletter",
    name: "Monthly Newsletter",
    category: "Marketing",
    subject: "Your Monthly Update from {{companyName}}",
    description: "A standard layout for monthly company updates.",
    htmlBody: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="padding: 30px 20px; text-align: center; background-color: #f3f4f6;">
    <h2 style="margin: 0; color: #111827; letter-spacing: 1px; text-transform: uppercase;">The Monthly Brief</h2>
  </div>
  <div style="padding: 30px 20px;">
    <h3 style="color: #111827; font-size: 22px; margin-top: 0;">What's new this month?</h3>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello {{name}}, here is a quick round-up of everything new and exciting happening at {{companyName}}.</p>
    
    <div style="margin-top: 30px; background: #f9fafb; padding: 20px; border-left: 4px solid #3b82f6;">
      <h4 style="margin-top: 0; color: #1f2937; font-size: 18px;">✨ Feature Update</h4>
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 15px;">We just launched an amazing new feature that lets you do things 10x faster.</p>
      <a href="{{featureUrl}}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Read more &rarr;</a>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      <a href="{{blogUrl}}" style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Read our Blog</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "transactional-password",
    name: "Password Reset",
    category: "Transactional",
    subject: "Reset your password",
    description: "Simple, secure password reset template.",
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 20px;">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  </div>
  <h2 style="color: #111827; text-align: center; margin-top: 0;">Password Reset Request</h2>
  <p style="color: #4b5563; font-size: 15px; text-align: center; line-height: 1.5;">We received a request to reset your password. Click the button below to choose a new one.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetUrl}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
  </div>
  <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
</div>`,
  },
];
