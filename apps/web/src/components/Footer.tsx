"use client";
import Link from "next/link";
import { Mail, Twitter, Github, Linkedin } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`${API}/v1/marketing/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const footerLinks = {
    product: [
      { name: "Features", href: "/#features" },
      { name: "Pricing", href: "/#pricing" },
      { name: "Documentation", href: "/docs" },
      { name: "API Reference", href: "/docs#api-reference" },
    ],
    company: [
      { name: "About", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
    ],
    legal: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Cookie Policy", href: "/cookie" },
      { name: "DPA", href: "/dpa" },
    ],
  };

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-bold mb-4">
              <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
                <Mail size={16} className="text-white" />
              </div>
              <span className="text-black tracking-tight text-lg">Qwik Mailer</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
              The AI-native email infrastructure for modern developers. Send, track, and optimize with confidence.
            </p>
            <div className="flex items-center gap-4 text-gray-400">
              <a href="#" className="hover:text-black transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-black transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="hover:text-black transition-colors">
                <Linkedin size={20} />
              </a>
            </div>

            <div className="mt-8">
              <h4 className="font-bold text-black mb-2 text-sm">Subscribe to our newsletter</h4>
              <p className="text-gray-500 text-xs mb-3">Get the latest news and updates delivered to your inbox.</p>
              
              {status === "success" ? (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                  Thanks for subscribing!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                  <div className="flex">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-sm rounded-l-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="bg-black text-white px-3 py-2 text-sm font-medium rounded-r-md hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                      {status === "loading" ? "..." : "Subscribe"}
                    </button>
                  </div>
                  {status === "error" && <p className="text-xs text-red-500">{errorMessage}</p>}
                </form>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-black mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link href={link.href as any} className="text-sm text-gray-500 hover:text-black transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href as any} className="text-sm text-gray-500 hover:text-black transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link href={link.href as any} className="text-sm text-gray-500 hover:text-black transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {currentYear} Qwik Mailer Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-black">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
