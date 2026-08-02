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
              <li><a href="#what-are-cookies" className="hover:text-black transition-colors">1. What Are Cookies</a></li>
              <li><a href="#how-we-use" className="hover:text-black transition-colors">2. How We Use Cookies</a></li>
              <li><a href="#types" className="hover:text-black transition-colors">3. Types of Cookies We Use</a></li>
              <li><a href="#third-party" className="hover:text-black transition-colors">4. Third-Party Cookies</a></li>
              <li><a href="#your-choices" className="hover:text-black transition-colors">5. Your Choices</a></li>
              <li><a href="#contact" className="hover:text-black transition-colors">6. Contact Us</a></li>
            </ul>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Cookie Policy</h1>
            <p className="text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Effective Date: August 1, 2026
            </p>
          </div>

          <div className="prose prose-gray max-w-none text-gray-600 space-y-8 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-gray-100 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_strong]:text-black">
            
            <h2 id="what-are-cookies">1. What Are Cookies</h2>
            <p>
              Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows Qwik Mailer or a third-party to recognize you, making your next visit easier and the Service more useful. Cookies can be "persistent" or "session" cookies.
            </p>

            <h2 id="how-we-use">2. How We Use Cookies</h2>
            <p>When you use and access the Qwik Mailer platform, we may place a number of cookie files in your web browser. We use cookies for the following core purposes:</p>
            <ul>
              <li><strong>Authentication:</strong> To verify your account and prevent fraudulent use of login credentials.</li>
              <li><strong>Preferences:</strong> To remember information that changes the way the service behaves or looks (e.g., "remember me" functionality or theme preferences).</li>
              <li><strong>Analytics:</strong> To track information on how the Service is used so that we can make improvements.</li>
            </ul>

            <h2 id="types">3. Types of Cookies We Use</h2>
            <p>We classify the cookies we use into the following categories:</p>
            <ul>
              <li><strong>Essential Cookies:</strong> These are strictly necessary to provide you with services available through our website. For example, they allow you to log in to secure areas of our dashboard. Without these cookies, the services cannot be provided.</li>
              <li><strong>Functional Cookies:</strong> These cookies allow our website to remember choices you make when you use our website, such as remembering your login details or language preference.</li>
              <li><strong>Performance & Analytics Cookies:</strong> These cookies collect information about traffic to our website and how users use our service. The information gathered does not identify any individual visitor.</li>
            </ul>

            <h2 id="third-party">4. Third-Party Cookies</h2>
            <p>
              In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and deliver advertisements on and through the Service. For example, we use Google Analytics to help us understand how our customers use the site.
            </p>

            <h2 id="your-choices">5. Your Choices Regarding Cookies</h2>
            <p>
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in our Cookie Consent banner. 
            </p>
            <p>
              If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages (such as the authenticated dashboard) might not function properly.
            </p>

            <h2 id="contact">6. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies or other technologies, please email us at: <br/>
              <strong>privacy@qwikmailer.in</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
