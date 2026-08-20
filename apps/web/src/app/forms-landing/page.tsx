"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MousePointerClick,
  Zap,
  Download,
  Webhook,
  Palette,
  Code2,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "Drag & Drop Builder",
    desc: "Build forms visually — no code needed. Add fields, reorder with drag & drop, preview instantly.",
  },
  {
    icon: Zap,
    title: "Real-time Submissions",
    desc: "Watch responses come in as they happen. Every submission is stored securely in your dashboard.",
  },
  {
    icon: Download,
    title: "CSV Export",
    desc: "Export all submissions as a clean CSV file with one click. Works in Excel, Google Sheets, and more.",
  },
  {
    icon: Webhook,
    title: "Webhook Integrations",
    desc: "Forward submissions to any URL in real-time. Connect to Zapier, Make, Slack, or your own backend.",
  },
  {
    icon: Palette,
    title: "Custom Themes",
    desc: "Match your brand — pick background colors, gradients, fonts, and accent colors from the builder.",
  },
  {
    icon: Code2,
    title: "API & Embed",
    desc: "Submit via REST API from any stack, or embed as an iframe on your website — one line of code.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Create",
    desc: "Use the drag & drop builder to add fields, design your form, and configure settings.",
  },
  {
    num: "02",
    title: "Share",
    desc: "Get a hosted link at forms.qwikmailer.in/f/[id], embed as an iframe, or submit via API.",
  },
  {
    num: "03",
    title: "Collect",
    desc: "Submissions flow into your dashboard. Export as CSV, trigger webhooks, or view in real-time.",
  },
];

export default function FormsLandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <ClipboardList size={16} className="text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-gray-900 group-hover:text-black transition-colors">
                QwikForms
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 rounded-md px-2 py-0.5 ml-1 bg-gray-50">
              by QwikMailer
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#developers" className="hover:text-gray-900 transition-colors">Developers</a>
            <a href="#templates" className="hover:text-gray-900 transition-colors">Templates</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://qwikmailer.in/login"
              className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="https://qwikmailer.in/dashboard/forms"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-16">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Part of the QwikMailer platform
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Collect responses.
            <br />
            <span className="text-gray-400">Build forms that</span>
            <br />
            convert.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
            Create beautiful, embeddable forms in minutes. Submissions flow directly into your
            QwikMailer CRM — no code required.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="https://qwikmailer.in/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Start building for free <ArrowRight size={16} />
            </Link>
            <Link
              href="https://qwikmailer.in/dashboard/forms"
              className="inline-flex items-center gap-2 px-5 py-3.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
            >
              View Templates
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-5 mt-8">
            {["No credit card required", "Free to start", "Instant setup"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form Preview Card (dark themed, inspired by the screenshot) */}
        <div className="flex-1 flex justify-center lg:justify-end w-full max-w-lg">
          <div
            className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-gray-800 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ background: "#0d1117" }}
          >
            {/* Window controls */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700/60">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-gray-500 font-mono">forms.qwikmailer.in/f/...</span>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-1">Send me a message</h2>
              <p className="text-sm text-gray-400 mb-7 font-mono">
                // Fill out the form and I'll reply within 24 hours.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Your Name
                  </label>
                  <div className="h-11 bg-gray-800 border border-gray-700 rounded-lg flex items-center px-3">
                    <span className="text-sm text-gray-500">Manish Pandit</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="h-11 bg-gray-800 border border-gray-700 rounded-lg flex items-center px-3">
                    <span className="text-sm text-gray-500">hello@example.com</span>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Subject
                </label>
                <div className="h-11 bg-gray-800 border border-gray-700 rounded-lg flex items-center px-3">
                  <span className="text-sm text-gray-500">Brief subject or topic...</span>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Message
                </label>
                <div className="h-24 bg-gray-800 border border-gray-700 rounded-lg flex items-start px-3 pt-3">
                  <span className="text-sm text-gray-500">Tell me what you're building or thinking about...</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "#f97316" }}>
                  Send Message →
                </button>
                <span className="text-xs text-gray-500">No spam. Honest reply guaranteed.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Everything you need to collect data
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From simple contact forms to complex lead capture — QwikForms handles it all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-lg">Three simple steps from idea to live form.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gray-200" />
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-5 shadow-lg z-10">
                  <span className="text-white font-black text-lg font-mono">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integration Snippet ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 max-w-md">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 mb-5">
              <Code2 size={12} /> Developer-friendly
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Submit from any stack.
              <br />
              One API call.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              No SDK needed. POST JSON to your form endpoint from your backend, a workflow tool,
              or even cURL. Responses instantly appear in your dashboard.
            </p>
            <Link
              href="https://qwikmailer.in/dashboard/forms"
              className="inline-flex items-center gap-2 px-5 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              See API docs in builder <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex-1 w-full max-w-lg">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-gray-400 font-mono">cURL</span>
              </div>
              <pre className="bg-gray-900 text-gray-300 text-xs font-mono p-5 leading-relaxed overflow-x-auto">
{`curl -X POST \\
  https://api.qwikmailer.in/v1/forms/{id}/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
      "name": "Manish Pandit",
      "email": "hello@example.com",
      "message": "Love the product!"
    }
  }'`}
              </pre>
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-t border-green-100">
                <CheckCircle size={14} className="text-green-600 shrink-0" />
                <span className="text-xs text-green-700 font-semibold">
                  {"{ \"success\": true, \"message\": \"Form submitted successfully\" }"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5 tracking-tight">
            Ready to start collecting?
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Join thousands of teams using QwikMailer to build forms, collect leads, and grow their
            audience — all in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="https://qwikmailer.in/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
            >
              Get started free <ArrowRight size={18} />
            </Link>
            <Link
              href="https://qwikmailer.in/dashboard/forms"
              className="inline-flex items-center gap-2 px-6 py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-gray-50 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-sm">
                  <ClipboardList size={16} className="text-white" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-gray-900">
                  QwikForms
                </span>
              </div>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
                The easiest way to build beautiful forms, collect submissions, and integrate with your favorite tools. Seamlessly powered by the QwikMailer ecosystem.
              </p>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-gray-200/50 rounded-lg text-xs font-semibold text-gray-600">
                  Status: All systems operational
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-5">Product</h4>
              <ul className="space-y-3.5 text-sm font-medium text-gray-500">
                <li><Link href="#" className="hover:text-black transition-colors flex items-center gap-2">Form Builder</Link></li>
                <li><Link href="#" className="hover:text-black transition-colors flex items-center gap-2">Integrations <span className="text-[9px] uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-sm">New</span></Link></li>
                <li><Link href="#" className="hover:text-black transition-colors flex items-center gap-2">Templates</Link></li>
                <li><Link href="#" className="hover:text-black transition-colors flex items-center gap-2">API Reference</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-5">Company</h4>
              <ul className="space-y-3.5 text-sm font-medium text-gray-500">
                <li><Link href="https://qwikmailer.in" className="hover:text-black transition-colors">QwikMailer CRM</Link></li>
                <li><Link href="https://qwikmailer.in/privacy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
                <li><Link href="https://qwikmailer.in/terms" className="hover:text-black transition-colors">Terms of Service</Link></li>
                <li><Link href="mailto:admin@qwikmailer.in" className="hover:text-black transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-400">
              © {new Date().getFullYear()} QwikMailer. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
              <span>Built by</span>
              <Link href="https://qwikmailer.in" className="font-bold text-gray-900 hover:text-black transition-colors flex items-center gap-1.5">
                <Zap size={14} className="text-yellow-500 fill-yellow-500" /> QwikMailer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
