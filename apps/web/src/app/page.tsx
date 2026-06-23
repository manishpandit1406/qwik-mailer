"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Footer } from "../components/Footer";
import {
  Zap,
  Shield,
  BarChart3,
  Globe,
  Code2,
  ArrowRight,
  CheckCircle2,
  Star,
  Mail,
  Lock,
  Cpu,
  Webhook,
  ChevronRight,
  Github,
  Twitter,
  Sparkles,
  Send,
  Activity,
  User,
  XCircle,
} from "lucide-react"; // ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({
  end,
  suffix = "",
  duration = 2000,
}: {
  end: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = 0;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
} // ─── Floating Orb (Removed for premium look) ──────────────────────────────────
function FloatingOrb({ className }: { className: string }) {
  return null;
} // ─── Feature Card ──────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: string;
}
function FeatureCard({
  icon,
  title,
  description,
  delay = "0ms",
}: FeatureCardProps) {
  return (
    <div
      className="glass-card p-6 animate-fade-up group"
      style={{ animationDelay: delay }}
    >
      {" "}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110"
        style={{ background: "#f5f5f5", color: "#000000", border: "1px solid #eaeaea" }}
      >
        {icon}
      </div>{" "}
      <h3
        className="font-semibold text-base mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>{" "}
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {description}
      </p>{" "}
    </div>
  );
} // ─── Pricing Card ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted?: boolean;
}
function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted,
}: PricingCardProps) {
  return (
    <div
      className={`glass-card p-8 flex flex-col relative ${highlighted ? "ring-2 ring-indigo-500/50" : ""}`}
    >
      {" "}
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {" "}
          <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded">
            Most Popular
          </span>{" "}
        </div>
      )}{" "}
      <div className="mb-6">
        {" "}
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "var(--accent-light)" }}
        >
          {name}
        </p>{" "}
        <div className="flex items-baseline gap-1 mb-2">
          {" "}
          <span
            className="text-4xl font-black"
            style={{ color: "var(--text-primary)" }}
          >
            {price}
          </span>{" "}
          {period && (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              /{period}
            </span>
          )}{" "}
        </div>{" "}
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>{" "}
      </div>{" "}
      <ul className="space-y-3 mb-8 flex-1">
        {" "}
        {features.map((f, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 text-sm`}
            style={{ color: f.included ? "var(--text-secondary)" : "#9ca3af" }}
          >
            {" "}
            {f.included ? (
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: "#000000" }}
              />
            ) : (
              <XCircle
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: "#d1d5db" }}
              />
            )}
            {" "}
            {f.text}{" "}
          </li>
        ))}{" "}
      </ul>{" "}
      <Link
        href="/register"
        className={
          highlighted
            ? "btn-primary text-center block"
            : "btn-secondary text-center block"
        }
      >
        {" "}
        {cta}{" "}
      </Link>{" "}
    </div>
  );
} // ─── Code Snippet ─────────────────────────────────────────────────────────────
const codeSnippet = `// Send your first email in 30 seconds
import { QwikMailer } from "qwik-mailer";

const mailer = new QwikMailer({
  apiKey: "mf_live_••••••••••••"
});

await mailer.send({
  to: "user@example.com",
  subject: "Welcome to the future 🚀",
  html: "<h1>Hello {{name}}!</h1>"
});

// 🟢 Delivered in 89ms`; // ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const features = [
    {
      icon: <Zap size={20} />,
      title: "Lightning Fast API",
      description:
        "Sub-200ms API response times. Send emails instantly via REST API or SMTP with full TypeScript SDKs.",
    },
    {
      icon: <Shield size={20} />,
      title: "AI Anti-Abuse Engine",
      description:
        "Reputation scoring, disposable email detection, bounce monitoring, and automatic spam protection.",
    },
    {
      icon: <BarChart3 size={20} />,
      title: "Real-time Analytics",
      description:
        "Track delivery, opens, clicks, bounces, and complaints with beautiful charts and geo insights.",
    },
    {
      icon: <Globe size={20} />,
      title: "Domain Authentication",
      description:
        "One-click SPF, DKIM, DMARC setup. Domain health scoring and auto DNS verification checker.",
    },
    {
      icon: <Code2 size={20} />,
      title: "Developer First",
      description:
        "REST API, SMTP credentials, webhooks, templates with variables, and rich API docs. Built by devs, for devs.",
    },
    {
      icon: <Webhook size={20} />,
      title: "Smart Webhooks",
      description:
        "Real-time event delivery for delivered, bounced, opened, clicked, and complained events.",
    },
    {
      icon: <Lock size={20} />,
      title: "Enterprise Security",
      description:
        "JWT auth, API key rotation, 2FA, RBAC, audit logs, and end-to-end encryption.",
    },
    {
      icon: <Cpu size={20} />,
      title: "AI-Powered Deliverability",
      description:
        "AI checks subject lines for spam triggers, monitors domain reputation, and suggests improvements.",
    },
  ];
  const plans = [
    {
      name: "Free",
      price: "₹0",
      description: "Perfect for side projects and learning",
      features: [
        { text: "Emails: 100/day (≈3,000/month)", included: true },
        { text: "Speed: 1 email/sec", included: true },
        { text: "Analytics", included: true },
        { text: "Projects: 1", included: true },
        { text: "Forms", included: true },
        { text: "Contacts: 250", included: true },
        { text: "API Access", included: true },
        { text: "SMTP Access", included: true },
        { text: "Testing Inbox: 100 emails/day", included: true },
        { text: "Sender Identity: 1 Shared, 1 Custom Domain", included: true },
        { text: "Email Validation", included: true },
        { text: "Email Templates", included: true },
        { text: "Ticket Support", included: true },
        { text: "Team Members", included: false },
        { text: "Webhooks", included: false },
        { text: "Scheduling", included: false },
      ],
      cta: "Start for Free",
    },
    {
      name: "Starter",
      price: "₹199",
      period: "month",
      description: "For growing products and startups",
      features: [
        { text: "Emails: 5,000/month", included: true },
        { text: "Speed: 3 emails/sec", included: true },
        { text: "Analytics", included: true },
        { text: "Team Members: 3", included: true },
        { text: "Projects: 2", included: true },
        { text: "Forms", included: true },
        { text: "Contacts: 2,000", included: true },
        { text: "API Access", included: true },
        { text: "SMTP Access", included: true },
        { text: "Webhooks", included: true },
        { text: "Testing Inbox: Same as Free", included: true },
        { text: "Sender Identity: 1 Shared, 5 Custom Domains", included: true },
        { text: "Email Validation", included: true },
        { text: "Email Templates", included: true },
        { text: "Ticket Support", included: true },
        { text: "Scheduling", included: false },
      ],
      cta: "Start Starter",
      highlighted: true,
    },
    {
      name: "Pro",
      price: "₹1,599",
      period: "month",
      description: "For scaling teams with serious volume",
      features: [
        { text: "Emails: 50,000/month", included: true },
        { text: "Speed: 5 emails/sec", included: true },
        { text: "Analytics", included: true },
        { text: "Team Members: 5", included: true },
        { text: "Projects: 5", included: true },
        { text: "Forms", included: true },
        { text: "Contacts: 20,000", included: true },
        { text: "API Access", included: true },
        { text: "SMTP Access", included: true },
        { text: "Webhooks", included: true },
        { text: "Testing Inbox: Same as Free", included: true },
        { text: "Sender Identity: 1 Shared, 10 Custom Domains", included: true },
        { text: "Email Validation", included: true },
        { text: "Email Templates", included: true },
        { text: "Scheduling", included: true },
        { text: "Ticket Support: Priority", included: true },
      ],
      cta: "Upgrade to Pro",
    },
    {
      name: "Business",
      price: "₹5,599",
      period: "month",
      description: "For enterprises sending massive volume",
      features: [
        { text: "Emails: 250,000/month", included: true },
        { text: "Speed: 20 emails/sec", included: true },
        { text: "Analytics", included: true },
        { text: "Team Members: Unlimited", included: true },
        { text: "Projects: Unlimited", included: true },
        { text: "Forms", included: true },
        { text: "Contacts: Unlimited", included: true },
        { text: "API Access", included: true },
        { text: "SMTP Access", included: true },
        { text: "Webhooks", included: true },
        { text: "Testing Inbox: Unlimited", included: true },
        { text: "Sender Identity: Unlimited Domains", included: true },
        { text: "Email Validation: 100k/mo", included: true },
        { text: "Email Templates", included: true },
        { text: "Scheduling", included: true },
        { text: "Ticket Support: Premium & SLA", included: true },
      ],
      cta: "Upgrade to Business",
    },
    {
      name: "Custom",
      price: "Custom",
      period: "",
      description: "For highly unique enterprise needs",
      features: [
        { text: "Emails: Unlimited/Custom", included: true },
        { text: "Speed: Dedicated Throughput", included: true },
        { text: "Analytics: Advanced", included: true },
        { text: "Projects: Unlimited", included: true },
        { text: "Forms", included: true },
        { text: "Contacts: Unlimited", included: true },
        { text: "API Access", included: true },
        { text: "SMTP Access", included: true },
        { text: "Testing Inbox: Unlimited", included: true },
        { text: "Sender Identity: Dedicated IPs", included: true },
        { text: "Email Validation: Custom volume", included: true },
        { text: "Email Templates", included: true },
        { text: "Ticket Support: Dedicated Manager", included: true },
        { text: "Team Members: Unlimited", included: true },
        { text: "Webhooks", included: true },
        { text: "Scheduling", included: true },
      ],
      cta: "Contact Sales",
    },
  ];
  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans selection:bg-black selection:text-white"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Subtle Dot Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "24px 24px" }} 
      />
      {/* ─── Navbar ──────────────────────────────────────────────────────── */}{" "}
      <nav
        className="fixed top-0 inset-x-0 z-50 border-b bg-white/80 backdrop-blur-md"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {" "}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          {" "}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg"
          >
            {" "}
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm"
            >
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight">Qwik Mailer</span>
          </Link>{" "}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {["Home", "Features", "Pricing", "Docs", "Blog"].map((item) => (
              <Link
                key={item}
                href={item === "Home" ? "/" : item === "Docs" ? "/docs" : item === "Blog" ? "/blog" : `/#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors duration-150 border-b-2 pb-1 hover:text-black ${
                  item === "Home" ? "text-black border-black" : "text-gray-500 border-transparent"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>{" "}
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
                <Link href="/login" className="btn-ghost hidden sm:block">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary">
                  Get Started Free
                </Link>
              </>
            )}
          </div>{" "}
        </div>{" "}
      </nav>{" "}
      {/* ─── Hero ────────────────────────────────────────────────────────── */}{" "}
      <section className="relative pt-32 pb-24 px-6">
        {" "}
        <div className="max-w-4xl mx-auto text-center">
          {" "}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold mb-8 animate-fade-in uppercase tracking-wider"
            style={{
              background: "#ffffff",
              border: "1px solid #eaeaea",
              color: "#000000",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <Zap size={12} fill="black" /> AI-Native Email Infrastructure
          </div>{" "}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 animate-fade-up leading-[1.1] text-black">
            Email that actually <br /> reaches inboxes
          </h1>{" "}
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed"
            style={{ color: "var(--text-secondary)", animationDelay: "100ms" }}
          >
            {" "}
            Email infrastructure made easy. Perfect for developers, startup founders, 
            creators, and anyone running a hackathon. Get intelligent deliverability 
            and AI spam protection with just a 10-minute setup.{" "}
          </p>{" "}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            {" "}
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="btn-primary flex items-center gap-2 justify-center text-base px-8 py-3.5"
              >
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn-primary flex items-center gap-2 justify-center text-base px-8 py-3.5"
              >
                Start Free <ArrowRight size={16} />
              </Link>
            )}{" "}
            <Link
              href="/docs"
              className="btn-secondary flex items-center gap-2 justify-center text-base px-8 py-3.5"
            >
              {" "}
              <Code2 size={16} /> View API Docs{" "}
            </Link>{" "}
          </div>{" "}
          {/* Stats */}{" "}
          <div
            className="grid grid-cols-3 gap-6 max-w-xl mx-auto animate-fade-up stagger-children border-t border-gray-100 pt-8"
            style={{ animationDelay: "300ms" }}
          >
            {[
              { label: "Emails Sent", value: 1000000, suffix: "+" },
              { label: "Inbox Rate", value: 97, suffix: "%" },
              { label: "API Latency", value: 89, suffix: "ms" },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black mb-1 text-black tracking-tighter">
                  <Counter end={value} suffix={suffix} />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
              </div>
            ))}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {/* ─── Code Demo ───────────────────────────────────────────────────── */}{" "}
      <section id="code" className="py-16 px-6">
        {" "}
        <div className="max-w-3xl mx-auto">
          {" "}
          <div className="glass-card overflow-hidden">
            {" "}
            {/* Window chrome */}{" "}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {" "}
              <div className="w-3 h-3 rounded-full bg-red-500/70" />{" "}
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />{" "}
              <div className="w-3 h-3 rounded-full bg-green-500/70" />{" "}
              <span
                className="ml-3 text-xs font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                send-email.ts
              </span>{" "}
            </div>{" "}
            <pre
              className="p-6 text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed"
              style={{ color: "#333333" }}
            >
              {" "}
              <code>{codeSnippet}</code>{" "}
            </pre>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {/* ─── Features ────────────────────────────────────────────────────── */}{" "}
      <section id="features" className="py-24 px-6">
        {" "}
        <div className="max-w-7xl mx-auto">
          {" "}
          <div className="text-center mb-16">
            {" "}
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent-light)" }}
            >
              {" "}
              Everything You Need{" "}
            </p>{" "}
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              Built for modern email delivery
            </h2>{" "}
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              {" "}
              From OTP emails to marketing campaigns — one platform, one API,
              complete control.{" "}
            </p>{" "}
          </div>{" "}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
            {" "}
            {features.map(({ icon, title, description }, i) => (
              <FeatureCard
                key={title}
                icon={icon}
                title={title}
                description={description}
                delay={`${i * 50}ms`}
              />
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {/* ─── Dashboard Preview ────────────────────────────────────────────── */}{" "}
      <section className="py-16 px-6">
        {" "}
        <div className="max-w-6xl mx-auto">
          {" "}
          <div className="text-center mb-12">
            {" "}
            <h2 className="text-3xl font-black mb-3 text-black tracking-tight">
              Powerful dashboard
            </h2>{" "}
            <p style={{ color: "var(--text-secondary)" }}>
              Monitor your email performance in real-time.
            </p>{" "}
          </div>{" "}
          {/* Mock dashboard UI */}{" "}
          <div className="glass-card overflow-hidden">
            {" "}
            <div
              className="p-4 border-b flex items-center gap-3"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {" "}
              <div
                className="w-6 h-6 rounded flex items-center justify-center bg-black"
              >
                <Mail size={12} className="text-white" />
              </div>{" "}
              <span className="text-sm font-semibold">
                Qwik Mailer Dashboard
              </span>{" "}
              <div className="ml-auto flex items-center gap-1.5">
                {" "}
                <div className="status-dot active" />{" "}
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  All systems operational
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div
              className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {" "}
              {[
                {
                  label: "Sent Today",
                  value: "12,483",
                  change: "+8.2%",
                  up: true,
                },
                {
                  label: "Delivery Rate",
                  value: "97.4%",
                  change: "+1.1%",
                  up: true,
                },
                {
                  label: "Open Rate",
                  value: "28.3%",
                  change: "+3.4%",
                  up: true,
                },
                {
                  label: "Bounce Rate",
                  value: "0.8%",
                  change: "-0.3%",
                  up: false,
                },
              ].map(({ label, value, change, up }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl"
                  style={{
                    background: "rgba(99,102,241,0.06)",
                    border: "1px solid rgba(99,102,241,0.1)",
                  }}
                >
                  {" "}
                  <p className="metric-label mb-1">{label}</p>{" "}
                  <p
                    className="text-2xl font-bold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </p>{" "}
                  <p
                    className="text-xs font-medium"
                    style={{ color: up ? "#10b981" : "#f59e0b" }}
                  >
                    {change} this week
                  </p>{" "}
                </div>
              ))}{" "}
            </div>{" "}
            {/* Fake chart bars */}{" "}
            <div className="p-6">
              {" "}
              <p
                className="text-xs font-semibold mb-4 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Last 7 Days
              </p>{" "}
              <div className="flex items-end gap-2 h-24">
                {" "}
                {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md transition-all"
                    style={{
                      height: `${h}%`,
                      background: i === 6 ? '#000' : '#eaeaea',
                      opacity: 1,
                    }}
                  />
                ))}{" "}
              </div>{" "}
              <div className="flex justify-between mt-2">
                {" "}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span
                    key={d}
                    className="text-xs flex-1 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {d}
                  </span>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {/* ─── Pricing ─────────────────────────────────────────────────────── */}{" "}
      <section id="pricing" className="py-24 px-6">
        {" "}
        <div className="max-w-5xl mx-auto">
          {" "}
          <div className="text-center mb-16">
            {" "}
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent-light)" }}
            >
              Pricing
            </p>{" "}
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              Simple, honest pricing
            </h2>{" "}
            <p style={{ color: "var(--text-secondary)" }}>
              No hidden fees. No sending limits on paid plans*. Cancel anytime.
            </p>{" "}
          </div>{" "}
          <div className="grid md:grid-cols-4 gap-6">
            {" "}
            {plans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}{" "}
          </div>{" "}
          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--text-muted)" }}
          >
            {" "}
            *Fair use policy applies. Enterprise plans available for 1M+
            emails/month.{" "}
          </p>{" "}
        </div>{" "}
      </section>{" "}
      {/* ─── CTA ──────────────────────────────────────────────────────────── */}{" "}
      <section className="py-24 px-6">
        {" "}
        <div className="max-w-3xl mx-auto text-center glass-card p-16 relative overflow-hidden">
          {" "}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at center, rgba(99,102,241,0.3), transparent 70%)",
            }}
          />{" "}
          <div className="relative">
            {" "}
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              Ready to ship your
              <br />
              email infrastructure?
            </h2>{" "}
            <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
              {" "}
              Join thousands of developers sending smarter emails with Qwik
              Mailer.{" "}
            </p>{" "}
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5"
              >
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <Footer />
    </div>
  );
}
