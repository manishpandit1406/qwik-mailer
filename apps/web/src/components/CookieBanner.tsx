"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname() || "";

  useEffect(() => {
    // Check if current view is a public form, custom form domain, or embedded iframe
    const isFormRoute = () => {
      if (typeof window === "undefined") return false;

      // 1. Path check for public form routes
      if (
        pathname.startsWith("/f/") ||
        pathname === "/f" ||
        pathname.includes("-form") ||
        pathname.includes("-application")
      ) {
        return true;
      }

      // 2. Host check: custom domain / subdomain for forms or septet labs
      const host = window.location.hostname.toLowerCase();
      if (
        host.startsWith("apply.") ||
        host.startsWith("forms.") ||
        host.includes("septetlabs") ||
        host.includes("septet")
      ) {
        return true;
      }

      // 3. Embedded in an iframe
      if (window.self !== window.top) {
        return true;
      }

      // 4. Form marker class on body or DOM
      if (
        document.body.classList.contains("no-cookie-banner") ||
        document.querySelector("[data-qwik-form]") !== null
      ) {
        return true;
      }

      return false;
    };

    if (isFormRoute()) {
      setIsVisible(false);
      return;
    }

    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem("mf_cookie_consent");
    if (!cookieConsent) {
      // Small delay to ensure it doesn't flash immediately on load
      const timer = setTimeout(() => {
        if (!isFormRoute()) {
          setIsVisible(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const acceptCookies = () => {
    localStorage.setItem("mf_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem("mf_cookie_consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner-root fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[400px] bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-black font-semibold">
          <Cookie size={18} className="text-black" />
          <span>We value your privacy</span>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-black transition-colors"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience and analyze website traffic. For more information, please read our{" "}
        <Link href="/cookie" className="text-black underline font-medium hover:text-gray-700">
          Cookie Policy
        </Link>.
      </p>

      <div className="flex items-center gap-3">
        <button 
          onClick={declineCookies}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Decline Optional
        </button>
        <button 
          onClick={acceptCookies}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-900 rounded-lg transition-colors"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
