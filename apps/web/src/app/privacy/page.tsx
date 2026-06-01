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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-bold">Qwik Mailer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
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
            At Qwik Mailer, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our email infrastructure platform.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number that you voluntarily give to us when registering with the site.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed.</li>
            <li><strong>Transmission Data:</strong> Contents of emails, metadata, sender/recipient addresses, and other data necessarily processed when you utilize our API to send emails.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Process transactions and send related information.</li>
            <li>Deliver and facilitate delivery of emails via our API.</li>
            <li>Monitor and analyze usage and trends to improve your experience.</li>
            <li>Prevent fraudulent transactions, monitor against spam, and protect against criminal activity.</li>
          </ul>

          <h2>4. Data Processing and GDPR/CCPA</h2>
          <p>
            As an email service provider, Qwik Mailer acts as a Data Processor for the email contents and recipient data you transmit through our API. You (the user) act as the Data Controller. We process this data strictly in accordance with your API instructions and our Data Processing Agreement (DPA).
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us at: <br/>
            <strong>privacy@qwikmailer.in</strong>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
