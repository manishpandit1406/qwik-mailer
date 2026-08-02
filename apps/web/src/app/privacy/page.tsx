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

      <main className="max-w-5xl mx-auto px-6 py-20 pb-32 flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="md:w-64 shrink-0 hidden md:block">
          <div className="sticky top-24">
            <h3 className="font-bold text-black text-sm uppercase tracking-wider mb-4">Table of Contents</h3>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li><a href="#introduction" className="hover:text-black transition-colors">1. Introduction</a></li>
              <li><a href="#information-collection" className="hover:text-black transition-colors">2. Information We Collect</a></li>
              <li><a href="#data-usage" className="hover:text-black transition-colors">3. How We Use Data</a></li>
              <li><a href="#sharing" className="hover:text-black transition-colors">4. Data Sharing & Sub-processors</a></li>
              <li><a href="#tracking" className="hover:text-black transition-colors">5. Cookies & Tracking</a></li>
              <li><a href="#rights" className="hover:text-black transition-colors">6. Your Privacy Rights</a></li>
              <li><a href="#contact" className="hover:text-black transition-colors">7. Contact Us</a></li>
            </ul>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Privacy Policy</h1>
            <p className="text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Effective Date: August 1, 2026
            </p>
          </div>

          <div className="prose prose-gray max-w-none text-gray-600 space-y-8 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-gray-100 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
            
            <h2 id="introduction">1. Introduction</h2>
            <p>
              At Qwik Mailer, we prioritize your privacy and data security. This Privacy Policy explains how we collect, use, process, and safeguard your personal information when you visit our website, use our application, or integrate with our email automation infrastructure.
            </p>

            <h2 id="information-collection">2. Information We Collect</h2>
            <p>We collect information strictly necessary to provide a reliable email delivery service and protect our network reputation:</p>
            <ul>
              <li><strong>Account & Billing Data:</strong> Your name, email address, API keys, password (encrypted), and payment information provided during registration and subscription.</li>
              <li><strong>Transmission & Recipient Data:</strong> Email addresses, metadata, variables, and body content you transmit through our API or SMTP servers for final delivery.</li>
              <li><strong>Engagement Data:</strong> If open and click tracking is enabled, we collect IP addresses, User-Agents, and timestamps via tracking pixels to report on email engagement.</li>
              <li><strong>Suppression Data:</strong> We automatically collect and permanently store email addresses that hard bounce or report spam to protect sender reputation.</li>
            </ul>

            <h2 id="data-usage">3. How We Process & Use Your Information</h2>
            <p>We use the collected information for the following core purposes:</p>
            <ul>
              <li><strong>Email Delivery:</strong> To securely transmit your email content to upstream providers (AWS SES) for final delivery.</li>
              <li><strong>Reputation Protection:</strong> We use AWS SNS webhooks to automatically monitor bounces and spam complaints. Any recipient who bounces or complains is immediately added to an isolated suppression list.</li>
              <li><strong>Analytics:</strong> To provide you with accurate delivery rates, open rates, and geographic engagement metrics within your dashboard.</li>
              <li><strong>Compliance:</strong> To inject mandatory "List-Unsubscribe" headers and manage opt-out requests automatically.</li>
            </ul>

            <h2 id="sharing">4. Data Sharing & Sub-processors</h2>
            <p>
              Qwik Mailer acts as a Data Processor, and you act as the Data Controller. We do not sell your data. We share data only with authorized sub-processors necessary to provide our service, primarily <strong>Amazon Web Services (AWS)</strong>. Data is transmitted securely and is subject to strict confidentiality agreements.
            </p>

            <h2 id="tracking">5. Cookies & Tracking Technologies</h2>
            <p>
              Our website uses essential cookies to maintain user sessions and authentication states. We also use analytics cookies to understand website traffic. Within the emails you send, we may embed invisible 1x1 tracking pixels to provide you with open-rate analytics, which you can disable in your dashboard settings.
            </p>

            <h2 id="rights">6. Your Privacy Rights (GDPR & CCPA)</h2>
            <p>
              Depending on your location, you have the right to access, correct, delete, or restrict the processing of your personal data. 
            </p>
            <ul>
              <li>You may export your account data at any time from the dashboard.</li>
              <li>You may request full account deletion, which will purge your active lists and campaign history. Note: Suppression lists (bounces/complaints) are exempt from deletion to comply with federal anti-spam laws.</li>
            </ul>

            <h2 id="contact">7. Contact Us</h2>
            <p>
              If you have questions, concerns, or wish to exercise your privacy rights, please contact our Data Protection Officer at: <br/>
              <strong>privacy@qwikmailer.in</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
