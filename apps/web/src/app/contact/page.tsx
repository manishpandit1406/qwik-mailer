"use client";
import Link from "next/link";
import { Mail, MapPin, Phone, Mail as MailIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

export default function ContactPage() {
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

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch(`${API}/v1/marketing/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to send message");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    }
  }

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

      <main className="max-w-5xl mx-auto px-6 py-20 pb-32">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Get in touch</h1>
          <p className="text-gray-500 text-lg">We'd love to hear from you. Please fill out the form below or reach out to us directly.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
            {status === "success" ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">Message Sent!</h3>
                <p className="text-gray-500 mb-6">Thanks for reaching out. We'll get back to you shortly.</p>
                <button onClick={() => setStatus("idle")} className="text-black font-medium hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {status === "error" && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-200">
                    {errorMessage}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input name="name" type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="John Doe" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="john@example.com" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input name="subject" type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" placeholder="How can we help?" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea name="message" required rows={5} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all resize-none" placeholder="Your message here..."></textarea>
                </div>
                
                <button type="submit" disabled={status === "loading"} className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-50">
                  {status === "loading" ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
          
          <div className="space-y-8 lg:pl-8">
            <div>
              <h3 className="text-xl font-bold text-black mb-4">Contact Information</h3>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <MailIcon size={20} className="text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <a href="mailto:support@qwikmailer.in" className="hover:text-black transition-colors">support@qwikmailer.in</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Office</p>
                    <p>123 Startup Blvd, Suite 404<br />San Francisco, CA 94107</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xl font-bold text-black mb-4">Support Hours</h3>
              <p className="text-gray-600">
                Our support team is available Monday through Friday, 9:00 AM to 5:00 PM PST. 
                We aim to respond to all inquiries within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
