"use client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

export default function CookiePolicyPage() {
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
        <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Cookie Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: May 30, 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-10 [&>h2]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.
          </p>

          <h2>2. How Qwik Mailer Uses Cookies</h2>
          <p>When you use and access the Service, we may place a number of cookie files in your web browser. We use cookies for the following purposes:</p>
          <ul>
            <li>To enable certain functions of the Service (e.g., maintaining login sessions).</li>
            <li>To provide analytics and understand how the Service is used.</li>
            <li>To store your preferences.</li>
          </ul>

          <h2>3. Essential Cookies</h2>
          <p>
            We use essential cookies to authenticate users and prevent fraudulent use of user accounts. Without these cookies, the services that you have asked for cannot be provided.
          </p>

          <h2>4. Your Choices Regarding Cookies</h2>
          <p>
            If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
