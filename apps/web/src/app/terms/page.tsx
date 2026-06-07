"use client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

export default function TermsPage() {
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
        <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Terms of Service</h1>
        <p className="text-gray-500 mb-12">Last updated: May 30, 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-10 [&>h2]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Qwik Mailer, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Qwik Mailer provides developers with email infrastructure to send, receive, and track transactional emails through API integration (the "Service"). You understand that the Service may include certain communications from Qwik Mailer, such as service announcements and administrative messages.
          </p>

          <h2>3. Account Registration & Obligations</h2>
          <p>In consideration of your use of the Service, you agree to:</p>
          <ul>
            <li>Provide true, accurate, current and complete information about yourself as prompted by the Service's registration form.</li>
            <li>Maintain and promptly update the Registration Data to keep it true, accurate, current and complete.</li>
            <li>Be responsible for maintaining the confidentiality of your password and account.</li>
          </ul>

          <h2>4. Anti-Spam Policy & Acceptable Use</h2>
          <p>
            Qwik Mailer has a strict zero-tolerance policy against spam. You agree <strong>not</strong> to use the Service to:
          </p>
          <ul>
            <li>Send unsolicited bulk emails or commercial messages ("spam").</li>
            <li>Use purchased, rented, or third-party mailing lists.</li>
            <li>Transmit any content that is unlawful, harmful, threatening, abusive, harassing, or otherwise objectionable.</li>
            <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
          </ul>
          <p>
            Violation of our anti-spam policy will result in immediate and permanent account suspension without refund.
          </p>

          <h2>5. API Usage and Rate Limits</h2>
          <p>
            You agree to use the Qwik Mailer API in accordance with the documented rate limits. Attempting to bypass these rate limits or circumvent security features of the API is strictly prohibited.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            You expressly understand and agree that Qwik Mailer shall not be liable for any direct, indirect, incidental, special, consequential or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data or other intangible losses resulting from the use or the inability to use the service.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
