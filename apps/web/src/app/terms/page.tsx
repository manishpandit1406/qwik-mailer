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

      <main className="max-w-5xl mx-auto px-6 py-20 pb-32 flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="md:w-64 shrink-0 hidden md:block">
          <div className="sticky top-24">
            <h3 className="font-bold text-black text-sm uppercase tracking-wider mb-4">Table of Contents</h3>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li><a href="#acceptance" className="hover:text-black transition-colors">1. Acceptance of Terms</a></li>
              <li><a href="#service" className="hover:text-black transition-colors">2. Description of Service</a></li>
              <li><a href="#obligations" className="hover:text-black transition-colors">3. Account Obligations</a></li>
              <li><a href="#anti-spam" className="hover:text-black transition-colors">4. Anti-Spam Policy</a></li>
              <li><a href="#billing" className="hover:text-black transition-colors">5. Billing & Refunds</a></li>
              <li><a href="#termination" className="hover:text-black transition-colors">6. Termination</a></li>
              <li><a href="#liability" className="hover:text-black transition-colors">7. Limitation of Liability</a></li>
            </ul>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Terms of Service</h1>
            <p className="text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Effective Date: August 1, 2026
            </p>
          </div>

          <div className="prose prose-gray max-w-none text-gray-600 space-y-8 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-gray-100 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
            
            <h2 id="acceptance">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Qwik Mailer ("we", "our", "the Service"), you accept and agree to be bound by the terms and provisions of this agreement. Our platform leverages Amazon Web Services (AWS) infrastructure; therefore, your usage must concurrently comply with the <a href="https://aws.amazon.com/aup/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">AWS Acceptable Use Policy</a>. If you do not agree to these terms, you must not use our Service.
            </p>

            <h2 id="service">2. Description of Service</h2>
            <p>
              Qwik Mailer is a B2B SaaS platform providing developers and businesses with advanced email infrastructure to send, receive, and track transactional and marketing emails through API integration and SMTP. We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice.
            </p>

            <h2 id="obligations">3. Account Registration & Obligations</h2>
            <p>To use Qwik Mailer, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide true, accurate, current, and complete corporate and billing information.</li>
              <li>Maintain a valid, verified sending domain configured with necessary DNS records (SPF, DKIM, and DMARC).</li>
              <li>Maintain the strict confidentiality of your API keys. You are fully responsible for all activities that occur under your account.</li>
            </ul>

            <h2 id="anti-spam">4. Anti-Spam Policy & Deliverability Enforcement</h2>
            <p>
              Qwik Mailer operates a strict zero-tolerance policy against spam to protect the reputation of our shared IP pools and AWS SES architecture. You explicitly agree <strong>NOT</strong> to:
            </p>
            <ul>
              <li>Send emails to recipients who have not explicitly and verifiably <strong>opted-in</strong>.</li>
              <li>Import or send to purchased, rented, scraped, or third-party mailing lists.</li>
              <li>Send unsolicited bulk commercial messages.</li>
              <li>Attempt to bypass our automated unsubscribe and suppression mechanisms.</li>
            </ul>
            <div className="bg-red-50 text-red-900 p-4 rounded-lg border border-red-100 my-4">
              <strong>Deliverability Enforcement:</strong> We actively monitor bounce and complaint rates via AWS SNS webhooks in real-time. If your account exceeds a <strong>5% bounce rate</strong> or a <strong>0.1% spam complaint rate</strong>, your account and API access will be immediately and automatically suspended without refund.
            </div>

            <h2 id="billing">5. Billing, Quotas & Refunds</h2>
            <p>
              The Service is billed in advance on a recurring basis. You agree to pay all charges associated with your selected plan. Rate limits and monthly email quotas apply as specified in your dashboard. Unused email credits do not roll over to the next billing cycle. 
            </p>
            <p>
              Due to the infrastructural costs incurred upon email transmission, all payments are <strong>non-refundable</strong> unless required by law.
            </p>

            <h2 id="termination">6. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of these Terms or the AWS Acceptable Use Policy.
            </p>

            <h2 id="liability">7. Limitation of Liability</h2>
            <p>
              In no event shall Qwik Mailer, its directors, employees, partners, agents, or suppliers, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; and (iii) disruptions caused by upstream infrastructure providers.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
