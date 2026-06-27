"use client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

export default function DPAPage() {
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
        <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Data Processing Agreement (DPA)</h1>
        <p className="text-gray-500 mb-12">Last updated: May 30, 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-10 [&>h2]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
          <h2>1. Introduction</h2>
          <p>
            This Data Processing Agreement ("DPA") supplements our Terms of Service and Privacy Policy and applies when Qwik Mailer processes personal data subject to the GDPR or similar data protection laws on your behalf.
          </p>

          <h2>2. Roles of the Parties</h2>
          <p>
            In relation to personal data processed through our Service, you act as the Data Controller (or Processor for another Controller), and Qwik Mailer acts as the Data Processor.
          </p>

          <h2>3. Processing of Personal Data</h2>
          <p>Qwik Mailer processes personal data to provide our email automation and delivery service. The types of personal data we process include:</p>
          <ul>
            <li><strong>Recipient Details:</strong> Email addresses and names provided via API or SMTP.</li>
            <li><strong>Template Variables:</strong> Dynamic variables injected into emails or PDFs (e.g., scores, certificates, custom identifiers).</li>
            <li><strong>Engagement Data:</strong> IP addresses and User-Agent strings collected via tracking pixels when recipients open or click emails.</li>
          </ul>

          <h2>4. Security Measures</h2>
          <p>
            We implement and maintain appropriate technical and organizational measures to ensure a level of security appropriate to the risk, protecting against unauthorized or unlawful processing and accidental loss, destruction, or damage. All databases are securely isolated.
          </p>

          <h2>5. Sub-processors</h2>
          <p>
            You authorize Qwik Mailer to engage third-party sub-processors to fulfill our service. Our primary sub-processor is <strong>Amazon Web Services (AWS)</strong>, which we use for:
          </p>
          <ul>
            <li>Email Delivery (AWS SES)</li>
            <li>Bounce & Complaint Tracking (AWS SNS)</li>
            <li>Core Cloud Infrastructure (Hosting & Database management)</li>
          </ul>
          <p>We remain fully liable for our sub-processors' compliance with this DPA and ensure they are bound by equivalent data protection obligations.</p>

          <h2>6. Data Subject Rights & Deletion</h2>
          <p>
            We will provide reasonable assistance to help you fulfill your obligations to respond to requests from data subjects exercising their rights. 
          </p>
          <p>
            <strong>Data Retention:</strong> We store email logs and event data for analytical purposes. Hard bounces and spam complaints are stored permanently in a suppression list to comply with anti-spam regulations. If you request account deletion, we will purge your data in accordance with our retention policy, excluding mandatory suppression records.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
