"use client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

export default function PrivacyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{name: string}>({ name: "User" });

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("mf_access_token"));
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white bg-[#fafafa]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full relative">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-bold">Qwik Mailer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {["Home", "Features", "Pricing", "Docs", "Blog"].map((item) => (
              <Link
                key={item}
                href={item === "Home" ? "/" : item === "Docs" ? "/docs" : item === "Blog" ? "/blog" : `/#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors duration-150 border-b-2 pb-1 hover:text-black text-gray-500 border-transparent`}
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center transition-transform hover:scale-105 font-bold uppercase text-sm shadow-sm"
                  title="Go to Dashboard"
                >
                  {user.name?.[0] || 'U'}
                </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-md font-medium text-sm text-gray-500 hover:bg-gray-100 hover:text-black transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-sm bg-black text-white hover:bg-gray-900 transition-all shadow-sm">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20 pb-32">
        <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: May 30, 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-10 [&>h2]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
          <h2>1. Introduction</h2>
          <p>
            At Qwik Mailer, we take your privacy and deliverability seriously. This Privacy Policy explains how we collect, use, process, and safeguard your information when you visit our website or use our developer-focused email automation platform.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We collect information necessary to provide a reliable email sending service:</p>
          <ul>
            <li><strong>Account Data:</strong> Information like your name, email address, API keys, and billing details provided during registration.</li>
            <li><strong>Transmission & Recipient Data:</strong> Email addresses, metadata, variables, and content you transmit through our API or SMTP servers for delivery.</li>
            <li><strong>Engagement Data (Tracking):</strong> If enabled, we collect IP addresses, User-Agents, and timestamps via tracking pixels to report on email opens, clicks, bounces, and spam complaints.</li>
            <li><strong>Suppression Data:</strong> We permanently store email addresses that bounce or report spam in our suppression lists to protect sender reputation.</li>
          </ul>

          <h2>3. How We Process & Use Your Information</h2>
          <p>Qwik Mailer utilizes third-party infrastructure, including Amazon Web Services (AWS) Simple Email Service (SES) and Simple Notification Service (SNS), to process and deliver emails.</p>
          <ul>
            <li><strong>Email Delivery:</strong> We transmit your email content to AWS SES for final delivery to recipients.</li>
            <li><strong>Bounce & Complaint Handling:</strong> We use AWS SNS webhooks to automatically monitor bounces and spam complaints. Any recipient who bounces or complains is immediately added to a suppression list, and future sends to them are blocked.</li>
            <li><strong>Unsubscribe Management:</strong> We inject unsubscribe links and "List-Unsubscribe" headers into outbound emails. When clicked, we process the opt-out and update your active mailing lists.</li>
            <li><strong>Analytics:</strong> We process engagement data to provide you with delivery rates, open rates, and geographic analytics in your dashboard.</li>
          </ul>

          <h2>4. Your Responsibilities (Acceptable Use)</h2>
          <p>As a user of Qwik Mailer, you must ensure that:</p>
          <ul>
            <li>You only send emails to recipients who have explicitly <strong>opted-in</strong> to receive communications from you.</li>
            <li>You do not use purchased, rented, or third-party mailing lists.</li>
            <li>You comply with our anti-spam policies and AWS's Acceptable Use Policy. High bounce rates (&gt;5%) or complaint rates (&gt;0.1%) will result in immediate account suspension.</li>
          </ul>

          <h2>5. Data Processing and GDPR/CCPA</h2>
          <p>
            Qwik Mailer acts as a Data Processor for the email contents and recipient data you transmit through our platform. You act as the Data Controller. We process this data strictly in accordance with your instructions, our automated deliverability rules (suppression), and our Data Processing Agreement (DPA).
          </p>

          <h2>6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or need to report abuse, please contact us at: <br/>
            <strong>privacy@qwikmailer.in</strong>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
