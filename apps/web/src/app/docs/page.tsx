"use client";
import Link from "next/link";
import { Mail, ArrowLeft, Key, Shield, Webhook, Zap, FileJson, Send, BrainCircuit, Clock, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Footer } from "../../components/Footer";

const DOCS_SECTIONS = [
  { id: "authentication", label: "Authentication", icon: <Key size={14} /> },
  { id: "send-email", label: "Send Email", icon: <Send size={14} /> },
  { id: "templates", label: "Templates & Variables", icon: <FileJson size={14} /> },
  { id: "scheduling", label: "Scheduling", icon: <Clock size={14} /> },
  { id: "ai-spam", label: "AI Spam Check", icon: <BrainCircuit size={14} /> },
  { id: "webhooks", label: "Webhooks", icon: <Webhook size={14} /> },
  { id: "rate-limits", label: "Rate Limits & Errors", icon: <Zap size={14} /> },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("authentication");
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
    <div className="min-h-screen font-sans selection:bg-black selection:text-white bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full relative">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
            <Mail size={16} className="text-white" />
          </div>
          <span className="text-black tracking-tight font-bold">Qwik Mailer Docs</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {["Home", "Features", "Pricing", "Docs", "Blog"].map((item) => (
            <Link
              key={item}
              href={item === "Home" ? "/" : item === "Docs" ? "/docs" : item === "Blog" ? "/blog" : `/#${item.toLowerCase()}`}
              className={`text-sm font-medium transition-colors duration-150 border-b-2 pb-1 hover:text-black ${
                item === "Docs" ? "text-black border-black" : "text-gray-500 border-transparent"
              }`}
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

      {/* Main Content */}
      <div className="flex flex-1 max-w-[1400px] mx-auto w-full relative">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block py-10 pr-8 pl-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-100">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">API Reference</h4>
          <ul className="space-y-0.5">
            {DOCS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-all ${
                    activeSection === section.id
                      ? "bg-black text-white font-medium"
                      : "text-gray-500 hover:bg-gray-50 hover:text-black"
                  }`}
                >
                  {section.icon} {section.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Area */}
        <main className="flex-1 py-12 px-8 lg:px-16 max-w-4xl">
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">API Documentation</h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
              Integrate Qwik Mailer into your stack in minutes. Our REST API is built for developers, offering low-latency sending, AI spam analysis, and real-time webhooks.
            </p>
          </div>

          <div className="space-y-24">
            
            {/* Authentication */}
            <section id="authentication" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Authentication</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                All API requests require your secret API key. You can generate and manage API keys from the <Link href="/dashboard/api-keys" className="text-black font-semibold underline">Dashboard</Link>.
                Include the key in the <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-sm font-mono text-black border border-gray-200">X-API-Key</code> header for every request.
              </p>
              <div className="bg-[#0a0a0a] rounded-lg p-5 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-loose">
                  <span className="text-green-400">GET</span> https://api.qwikmailer.in/v1/health{"\n"}
                  <span className="text-gray-400">X-API-Key</span>: mf_live_YOUR_API_KEY
                </pre>
              </div>
            </section>

            {/* Send Email */}
            <section id="send-email" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Send an Email</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                The primary endpoint for dispatching emails. You can send raw HTML, plain text, or utilize dynamic templates.
              </p>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-black bg-black text-white px-2 py-1 rounded tracking-wider uppercase">POST</span> 
                <code className="text-sm font-mono font-semibold text-black">/v1/send</code>
              </div>
              
              <div className="bg-[#0a0a0a] rounded-lg p-5 mb-8 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                  <span className="text-gray-500">// Example: Sending a standard HTML email</span>{"\n"}
                  {"{"}
                  {"\n  "}<span className="text-blue-300">"to"</span>: <span className="text-green-300">"customer@startup.com"</span>,
                  {"\n  "}<span className="text-blue-300">"from"</span>: <span className="text-green-300">"notifications@yourdomain.com"</span>,
                  {"\n  "}<span className="text-blue-300">"subject"</span>: <span className="text-green-300">"Welcome to the platform!"</span>,
                  {"\n  "}<span className="text-blue-300">"html"</span>: <span className="text-green-300">"&lt;h1&gt;Hello World&lt;/h1&gt;"</span>,
                  {"\n  "}<span className="text-blue-300">"trackOpens"</span>: <span className="text-yellow-300">true</span>,
                  {"\n  "}<span className="text-blue-300">"trackClicks"</span>: <span className="text-yellow-300">true</span>
                  {"\n"}{"}"}
                </pre>
              </div>
              
              <h3 className="font-bold text-black mb-3">Request Parameters</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr><th className="px-4 py-3 font-semibold text-gray-900">Field</th><th className="px-4 py-3 font-semibold text-gray-900">Type</th><th className="px-4 py-3 font-semibold text-gray-900">Description</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-black">to</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">string (required)</td>
                      <td className="px-4 py-3 text-gray-600">The recipient's email address.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-black">from</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">string (optional)</td>
                      <td className="px-4 py-3 text-gray-600">Sender email. Must be a verified domain.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-black">subject</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">string</td>
                      <td className="px-4 py-3 text-gray-600">Email subject. Required unless using a template.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-black">html</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">string</td>
                      <td className="px-4 py-3 text-gray-600">Raw HTML content.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-bold text-black">trackOpens</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">boolean</td>
                      <td className="px-4 py-3 text-gray-600">Injects a tracking pixel. Default: <code className="text-xs font-mono">false</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Templates */}
            <section id="templates" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Templates & Variables</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Instead of sending raw HTML, you can create Templates in the dashboard and trigger them via the API. 
                Pass a <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-black border border-gray-200">variables</code> object to automatically replace <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-black border border-gray-200">{"{{key}}"}</code> tags.
              </p>
              
              <div className="bg-[#0a0a0a] rounded-lg p-5 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                  {"{"}
                  {"\n  "}<span className="text-blue-300">"to"</span>: <span className="text-green-300">"customer@startup.com"</span>,
                  {"\n  "}<span className="text-blue-300">"templateId"</span>: <span className="text-green-300">"tpl_8f73b2a1"</span>,
                  {"\n  "}<span className="text-blue-300">"variables"</span>: {"{"}
                  {"\n    "}<span className="text-blue-300">"name"</span>: <span className="text-green-300">"Alice"</span>,
                  {"\n    "}<span className="text-blue-300">"resetLink"</span>: <span className="text-green-300">"https://app.com/reset/123"</span>
                  {"\n  "}{"}"}
                  {"\n"}{"}"}
                </pre>
              </div>
            </section>

            {/* Scheduling */}
            <section id="scheduling" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Scheduling Emails</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Delay the delivery of your emails by passing an ISO-8601 timestamp in the <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-black border border-gray-200">scheduledAt</code> parameter.
              </p>
              <div className="bg-[#0a0a0a] rounded-lg p-5 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                  {"{"}
                  {"\n  "}<span className="text-blue-300">"to"</span>: <span className="text-green-300">"customer@startup.com"</span>,
                  {"\n  "}<span className="text-blue-300">"subject"</span>: <span className="text-green-300">"Your trial ends tomorrow!"</span>,
                  {"\n  "}<span className="text-blue-300">"html"</span>: <span className="text-green-300">"&lt;p&gt;Upgrade now.&lt;/p&gt;"</span>,
                  {"\n  "}<span className="text-blue-300">"scheduledAt"</span>: <span className="text-green-300">"2026-06-01T08:00:00Z"</span>
                  {"\n"}{"}"}
                </pre>
              </div>
            </section>

            {/* AI Spam Check */}
            <section id="ai-spam" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">AI Spam Analysis</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Test your email content against our AI engine before sending to ensure it won't hit spam filters. Returns a score from 0 (perfect) to 100 (definitely spam) along with improvement suggestions.
              </p>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-black bg-black text-white px-2 py-1 rounded tracking-wider uppercase">POST</span> 
                <code className="text-sm font-mono font-semibold text-black">/v1/ai/spam-score</code>
              </div>
              
              <div className="bg-[#0a0a0a] rounded-lg p-5 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                  <span className="text-gray-500">// Request</span>
                  {"\n{"} <span className="text-blue-300">"html"</span>: <span className="text-green-300">"CLICK HERE TO BUY VIAGRA NOW!!!"</span> {"}"}
                  {"\n\n"}<span className="text-gray-500">// Response</span>
                  {"\n{"}
                  {"\n  "}<span className="text-blue-300">"success"</span>: <span className="text-yellow-300">true</span>,
                  {"\n  "}<span className="text-blue-300">"data"</span>: {"{"}
                  {"\n    "}<span className="text-blue-300">"score"</span>: <span className="text-orange-300">95</span>,
                  {"\n    "}<span className="text-blue-300">"reasons"</span>: [<span className="text-green-300">"Excessive capitalization"</span>, <span className="text-green-300">"Known spam keywords"</span>],
                  {"\n    "}<span className="text-blue-300">"isSpam"</span>: <span className="text-yellow-300">true</span>
                  {"\n  "}{"}"}
                  {"\n"}{"}"}
                </pre>
              </div>
            </section>

            {/* Webhooks */}
            <section id="webhooks" className="scroll-mt-28">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Webhooks</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Qwik Mailer sends real-time HTTP POST payloads to your server when events occur. 
                Verify incoming webhooks using the <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-black border border-gray-200">x-webhook-signature</code> header, which contains an HMAC SHA-256 hash of the request body signed with your Webhook Secret.
              </p>
              
              <h3 className="font-bold text-black mb-3">Supported Events</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-8 ml-2">
                <li><code className="font-mono text-black font-semibold">email.delivered</code> — Successfully placed in recipient inbox.</li>
                <li><code className="font-mono text-black font-semibold">email.bounced</code> — Hard or soft bounce occurred.</li>
                <li><code className="font-mono text-black font-semibold">email.opened</code> — Recipient loaded the tracking pixel.</li>
                <li><code className="font-mono text-black font-semibold">email.clicked</code> — Recipient clicked a tracked link.</li>
                <li><code className="font-mono text-black font-semibold">email.complained</code> — Recipient marked the email as spam.</li>
              </ul>
              
              <div className="bg-[#0a0a0a] rounded-lg p-5 overflow-x-auto shadow-sm border border-gray-800">
                <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                  <span className="text-gray-500">// Example Webhook Payload</span>{"\n"}
                  {"{"}
                  {"\n  "}<span className="text-blue-300">"event"</span>: <span className="text-green-300">"email.opened"</span>,
                  {"\n  "}<span className="text-blue-300">"data"</span>: {"{"}
                  {"\n    "}<span className="text-blue-300">"emailId"</span>: <span className="text-green-300">"log_a1b2c3d4"</span>,
                  {"\n    "}<span className="text-blue-300">"to"</span>: <span className="text-green-300">"user@example.com"</span>,
                  {"\n    "}<span className="text-blue-300">"timestamp"</span>: <span className="text-green-300">"2026-05-30T10:00:00Z"</span>,
                  {"\n    "}<span className="text-blue-300">"userAgent"</span>: <span className="text-green-300">"Mozilla/5.0 (iPhone; CPU iPhone OS)..."</span>
                  {"\n  "}{"}"}
                  {"\n"}{"}"}
                </pre>
              </div>
            </section>
            
            {/* Rate Limits */}
            <section id="rate-limits" className="scroll-mt-28 pb-32">
              <h2 className="text-2xl font-black text-black mb-4 tracking-tight border-b border-gray-100 pb-2">Rate Limits & Errors</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Our infrastructure is highly scalable, but standard API keys are subject to rate limiting to prevent abuse. 
                If you exceed the limits, you will receive a <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-black border border-gray-200">429 Too Many Requests</code> response.
              </p>
              
              <div className="space-y-4">
                {[
                  { code: "400", label: "Bad Request", desc: "Invalid JSON, missing required fields, or malformed data." },
                  { code: "401", label: "Unauthorized", desc: "Missing, invalid, or revoked API key." },
                  { code: "403", label: "Forbidden", desc: "Your domain is unverified or your account is suspended." },
                  { code: "429", label: "Too Many Requests", desc: "Exceeded the default limit of 100 requests per minute." },
                  { code: "500", label: "Internal Server Error", desc: "Something went wrong on our end." },
                ].map(err => (
                  <div key={err.code} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="px-2 py-1 bg-black text-white text-xs font-bold rounded font-mono mt-0.5">{err.code}</div>
                    <div>
                      <h4 className="font-bold text-black">{err.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{err.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
