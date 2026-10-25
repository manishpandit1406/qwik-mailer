"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Terminal,
  ArrowRight,
  Check,
  GitBranch,
  X,
  Send,
  Menu,
} from "lucide-react";

export default function SeptetLabsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [branding, setBranding] = useState<{ text: string; url: string } | null>(null);

  useEffect(() => {
    const FORM_ID = "53e54dc1-4836-47aa-bdd6-b38a56f04ab5";
    fetch(`https://api.qwikmailer.in/v1/forms/${FORM_ID}/public`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.design?.branding) {
          setBranding(json.data.design.branding);
        } else {
          setBranding({ text: "Powered by QwikForms", url: "https://forms.qwikmailer.in" });
        }
      })
      .catch(() => {
        setBranding({ text: "Powered by QwikForms", url: "https://forms.qwikmailer.in" });
      });
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Tech/Systems Builder",
    proof: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const FORM_ID = "53e54dc1-4836-47aa-bdd6-b38a56f04ab5";
    const endpoints = [
      `https://api.qwikmailer.in/v1/forms/${FORM_ID}/submit`,
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/v1/forms/${FORM_ID}/submit`,
      `http://127.0.0.1:4000/v1/forms/${FORM_ID}/submit`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              name: form.name,
              email: form.email,
              role: form.role,
              proof: form.proof,
            },
          }),
        });
        if (res.ok) break;
      } catch {
        // Fallback to next endpoint
      }
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setJoinModalOpen(false);
      setForm({ name: "", email: "", role: "Tech/Systems Builder", proof: "" });
    }, 2200);
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans selection:bg-black selection:text-white bg-white text-black relative"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Subtle Dot Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ─── 1. Navigation Bar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b bg-white/90 backdrop-blur-md border-[#eaeaea]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          
          {/* Brand & User's Provided Logo */}
          <Link href="/septet-labs" className="flex items-center gap-2.5 font-bold text-lg group">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white border border-[#eaeaea] overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/septet-logo.png"
                alt="Septet Labs"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex items-center">
              <span className="text-black tracking-tight font-extrabold text-base">
                Septet <span className="text-[#2563EB]">Labs</span>
              </span>
            </div>
          </Link>

          {/* Center Pinned Navigation */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#vision" className="text-sm font-medium transition-colors border-b-2 pb-1 text-black border-black">
              Vision
            </a>
            <a href="#manifesto" className="text-sm font-medium transition-colors border-b-2 pb-1 text-gray-500 border-transparent hover:text-black">
              Manifesto
            </a>
            <a href="#squad" className="text-sm font-medium transition-colors border-b-2 pb-1 text-gray-500 border-transparent hover:text-black">
              The Squad
            </a>
            <a href="#research" className="text-sm font-medium transition-colors border-b-2 pb-1 text-gray-500 border-transparent hover:text-black">
              Research
            </a>
            <a href="#challenge" className="text-sm font-medium transition-colors border-b-2 pb-1 text-gray-500 border-transparent hover:text-black">
              48h Challenge
            </a>
          </div>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setChallengeModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 hover:text-black px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Terminal size={14} className="text-[#2563EB]" />
              <span>The 48h Sprint</span>
            </button>
            
            {/* Desktop Button */}
            <button
              onClick={() => setJoinModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md font-semibold text-sm bg-black text-white hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap"
            >
              <span>Join the Squad</span>
              <ArrowRight size={14} />
            </button>

            {/* Mobile Quick CTA Pill */}
            <button
              onClick={() => setJoinModalOpen(true)}
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-black text-white hover:bg-gray-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <span>Join</span>
              <ArrowRight size={12} />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-[#eaeaea] text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-5 py-4 border-b border-[#eaeaea] bg-white shadow-lg space-y-2">
            <a href="#vision" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50">Vision</a>
            <a href="#manifesto" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50">Manifesto</a>
            <a href="#squad" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50">The Squad (7 Pillars)</a>
            <a href="#research" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50">Research</a>
            <a href="#challenge" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50">48h Challenge Protocol</a>
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setJoinModalOpen(true);
                }}
                className="w-full py-2.5 rounded-md font-semibold text-sm bg-black text-white text-center flex items-center justify-center gap-1.5"
              >
                <span>Join the Squad</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ─── 2. Hero Section ──────────────────────────────────────────────── */}
      <section id="vision" className="relative pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold mb-8 uppercase tracking-wider bg-white border border-[#eaeaea] text-black shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Deep-Tech Research &amp; 0-to-1 Startup Lab</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.08] text-black">
            Architecting the unseen.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-[#666666]">
            An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups through relentless execution.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="#research"
              className="inline-flex items-center justify-center gap-2 text-base px-8 py-3.5 rounded-md font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-[0_2px_10px_rgba(37,99,235,0.3)] transition-all"
            >
              <span>Explore Research</span>
              <ArrowRight size={16} />
            </a>
            <a
              href="#challenge"
              className="inline-flex items-center justify-center gap-2 text-base px-8 py-3.5 rounded-md font-semibold text-black bg-white border border-[#eaeaea] hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Terminal size={16} className="text-[#2563EB]" />
              <span>The 48-Hour Challenge</span>
            </a>
          </div>

          {/* Core Lab Focus Triad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-8 border-t border-gray-100 max-w-3xl mx-auto">
            <div className="p-4 rounded-lg bg-[#fafafa] border border-[#eaeaea]">
              <div className="text-[10px] font-mono font-bold text-[#2563EB] uppercase mb-1">FOUNDATION</div>
              <div className="font-bold text-sm text-black">Autonomous Systems</div>
              <div className="text-xs text-gray-500 mt-1">Multi-agent cognitive engines with deterministic execution bounds.</div>
            </div>
            <div className="p-4 rounded-lg bg-[#fafafa] border border-[#eaeaea]">
              <div className="text-[10px] font-mono font-bold text-[#2563EB] uppercase mb-1">RESEARCH VECTOR</div>
              <div className="font-bold text-sm text-black">High-Density AI Models</div>
              <div className="text-xs text-gray-500 mt-1">Extreme quantization and latency compression for edge hardware.</div>
            </div>
            <div className="p-4 rounded-lg bg-[#fafafa] border border-[#eaeaea]">
              <div className="text-[10px] font-mono font-bold text-[#2563EB] uppercase mb-1">VENTURE ENGINE</div>
              <div className="font-bold text-sm text-black">Zero-to-One Startups</div>
              <div className="text-xs text-gray-500 mt-1">From whitepaper to production codebases in 48-hour sprint cycles.</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. Core Ideology / Manifesto (The 3 Pillar Cards) ──────────────── */}
      <section id="manifesto" className="py-24 px-6 border-t border-gray-100 bg-[#fafafa]/40">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">
              Core Ideology &amp; Manifesto
            </p>
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              Engineered for asymmetric output
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-[#666666]">
              Traditional organizations suffer from coordination drag, endless meetings, and political overhead. Septet Labs operates as a synchronized 7-member unit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-8 rounded-lg bg-white border border-[#eaeaea] hover:border-gray-400 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 bg-[#f5f5f5] text-black border border-[#eaeaea]">
                <Terminal size={20} className="text-black" />
              </div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                PILLAR 01
              </div>
              <h3 className="font-bold text-xl mb-3 text-black">Execution over Talk</h3>
              <p className="text-sm leading-relaxed text-[#666666] mb-6">
                Building working prototypes and functional code over endless discussions. We believe working software and real latency benchmarks invalidate thousands of words of theory.
              </p>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>CORE FOCUS</span>
                <span className="font-bold text-black">COMPILED PROTOTYPES</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-lg bg-white border border-[#eaeaea] hover:border-gray-400 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 bg-[#f5f5f5] text-black border border-[#eaeaea]">
                <GitBranch size={20} className="text-black" />
              </div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                PILLAR 02
              </div>
              <h3 className="font-bold text-xl mb-3 text-black">Interdependence</h3>
              <p className="text-sm leading-relaxed text-[#666666] mb-6">
                A synchronized 7-member unit where every role powers the whole. Zero hierarchy drag—systems engineers, AI researchers, product architects, and growth leads operate as a single cognitive mesh.
              </p>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>SYNAPSE TOPOLOGY</span>
                <span className="font-bold text-black">100% SYNCHRONIZED</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-lg bg-white border border-[#eaeaea] hover:border-gray-400 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 bg-[#f5f5f5] text-black border border-[#eaeaea]">
                <Zap size={20} className="text-black" />
              </div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                PILLAR 03
              </div>
              <h3 className="font-bold text-xl mb-3 text-black">Radical Resourcefulness</h3>
              <p className="text-sm leading-relaxed text-[#666666] mb-6">
                Turning complex technical bottlenecks into scalable systems. Rather than throwing massive compute at problems, we engineer lighter quantization, leaner runtimes, and elegant protocols.
              </p>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>EFFICIENCY RATIO</span>
                <span className="font-bold text-black">&lt; 1% OVERHEAD</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 4. The Squad Breakdown (7-Member Architecture Matrix) ─────────── */}
      <section id="squad" className="py-24 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">
              The Squad Architecture
            </p>
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              7 Pillars. Zero redundant layers.
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-[#666666]">
              An elite unit composed of 1 Team Lead, 2 Tech/Systems Builders, 2 AI/R&amp;D Specialists, 1 Product Manager, and 1 Growth/Outreach Lead.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            
            {/* Node 01: Team Lead */}
            <div className="p-6 rounded-lg bg-white border-2 border-black flex flex-col justify-between relative shadow-sm">
              <div className="absolute -top-3 left-4">
                <span className="bg-black text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md">
                  Lead Architect
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mt-2 mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 01</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Team Lead</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Founding Lead &amp; Systems Synthesis</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Mission Orchestration, Systems Architecture &amp; Capital Velocity. Coordinates technical vectors and preserves zero-to-one velocity.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Overall System Architecture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>0-to-1 Venture Formulation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 02: Systems Builder (Core) */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 02</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Tech / Systems Builder</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Core Distributed Systems &amp; Infra</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Constructs bare-metal pipelines, micro-kernels, concurrent primitives, and fault-tolerant low-latency infrastructure.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Rust, C++ &amp; Memory Safety</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>High-Throughput Streaming Engine</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 03: Systems Builder (Applied) */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 03</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Tech / Systems Builder</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Autonomous Platforms &amp; Runtimes</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Bridges low-level runtimes into scalable APIs, live worker meshes, edge compute, and production software platforms.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Real-Time Event Meshes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Autonomous Agent Pipelines</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 04: AI / R&D Specialist (Foundations) */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 04</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">AI / R&amp;D Specialist</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Foundational Models &amp; Optimization</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Pushes mathematical boundaries on compact reasoning architectures, parameter-efficient quantization, and neural optimization.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Deep Learning &amp; Quantization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Neural Architecture Search</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 05: AI / R&D Specialist (Applied) */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 05</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">AI / R&amp;D Specialist</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Cognitive Intelligence &amp; Multi-Modal</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Translates fundamental AI breakthroughs into autonomous workflows, real-time perception trees, and multi-modal tool use.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Multi-Modal Inference &amp; Vision</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Autonomous Agentic Loops</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 06: Product Manager */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 06</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Product Manager</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Deep-Tech Product Lead</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Cuts through abstract research to crystallize intuitive developer tools, specifications, user ergonomics, and rapid prototypes.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Technical Specifications &amp; Specs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Developer Ergonomics &amp; Roadmaps</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 07: Growth Lead */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">PILLAR // 07</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Growth / Outreach Lead</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Ecosystem &amp; Distribution Lead</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Distributes Septet Labs technologies to world-class builders, orchestrating open-source adoption and narrative velocity.
                </p>
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Developer Ecosystem &amp; DevRel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-black shrink-0" />
                    <span>Deep-Tech Research Dissemination</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 08: Apprenticeship / Join Callout */}
            <div className="p-6 rounded-lg bg-gray-50/50 border border-dashed border-gray-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#2563EB]">OPEN VECTOR</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">INVITE ONLY</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Are you an outlier?</h3>
                <p className="text-xs font-semibold text-gray-500 mb-3">Guest Builder Sprint Seat</p>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  We periodically sponsor exceptional guest builders to join our 48-hour sprints. No resume—only GitHub PRs and working code.
                </p>
              </div>
              <button
                onClick={() => setJoinModalOpen(true)}
                className="w-full text-center py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-white border border-gray-300 text-black hover:bg-black hover:text-white transition-all"
              >
                Submit Proof of Work
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 5. Research & Autonomous Systems ───────────────────────────────── */}
      <section id="research" className="py-24 px-6 border-t border-gray-100 bg-[#fafafa]/40">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">
              Active R&amp;D Initiatives
            </p>
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              Frontier research testbeds
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-[#666666]">
              Real deep-tech systems and zero-to-one experiments evaluated against strict mathematical and latency bounds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Experiment 1 */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#2563EB]">SYS // 01</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">OPEN SPEC</span>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">Hyperion Agent Runtime</h3>
                <p className="text-xs text-[#666666] leading-relaxed mb-6">
                  Deterministic agent state runtime with zero-copy memory transfers, sub-millisecond thread scheduling, and hardware-accelerated memory paging.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Rust</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Bare Metal</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Zero-Copy</span>
                </div>
              </div>
            </div>

            {/* Experiment 2 */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#2563EB]">AI // 02</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">BENCHMARKING</span>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">NeuralFold Quantizer</h3>
                <p className="text-xs text-[#666666] leading-relaxed mb-6">
                  Lossless 2.4-bit model distillation designed for consumer edge hardware, enabling autonomous perception trees with minimal power draw.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">CUDA</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Matrix Distillation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">PyTorch</span>
                </div>
              </div>
            </div>

            {/* Experiment 3 */}
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col justify-between hover:border-gray-400 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#2563EB]">NET // 03</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">TESTBED PILOT</span>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">Chronos Consensus Mesh</h3>
                <p className="text-xs text-[#666666] leading-relaxed mb-6">
                  Decentralized state verification for autonomous multi-agent swarms with zero-overhead proof generation and peer-to-peer agreement.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Zero-Knowledge</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">gRPC</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#eaeaea] text-gray-600 bg-white">Go</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 6. The 48-Hour Challenge Protocol Section ──────────────────────── */}
      <section id="challenge" className="py-24 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">
              The 48-Hour Challenge Protocol
            </p>
            <h2 className="text-4xl font-black mb-4 text-black tracking-tight">
              From abstract hypothesis to production in 48 hours
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-[#666666]">
              The signature execution mechanism of Septet Labs. We eliminate corporate lag by delivering a functional zero-to-one artifact within a continuous 48-hour cadence.
            </p>
          </div>

          <div className="space-y-4">
            
            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="text-sm font-mono font-bold text-[#2563EB] shrink-0 pt-0.5">
                00:00 — 08:00
              </div>
              <div>
                <h3 className="font-bold text-base text-black mb-1">Mathematical Framing &amp; Architecture Specification</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Team Lead &amp; Foundations Lead formalize mathematical constraints, benchmark targets, memory budgets, and interface contracts.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="text-sm font-mono font-bold text-[#2563EB] shrink-0 pt-0.5">
                08:00 — 24:00
              </div>
              <div>
                <h3 className="font-bold text-base text-black mb-1">Core Distributed Infrastructure &amp; Runtime Build</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Systems builders construct the low-latency runtime, concurrency harness, bare-metal memory safety layers, and automated test suite.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="text-sm font-mono font-bold text-[#2563EB] shrink-0 pt-0.5">
                24:00 — 36:00
              </div>
              <div>
                <h3 className="font-bold text-base text-black mb-1">Applied AI Integration &amp; Model Distillation</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  AI specialists execute parameter-efficient fine-tuning, tool-calling validation, latency profiling, and stress-testing edge failures.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white border border-[#eaeaea] flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="text-sm font-mono font-bold text-[#2563EB] shrink-0 pt-0.5">
                36:00 — 48:00
              </div>
              <div>
                <h3 className="font-bold text-base text-black mb-1">Production Rollout, Telemetry &amp; Public Demonstration</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Automated verification, deployment to bare-metal clusters, documentation synthesis, and live demonstration of the zero-to-one artifact.
                </p>
              </div>
            </div>

          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 text-sm px-6 py-3 rounded-md font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-all"
            >
              Apply to Participate in Next Sprint
            </button>
          </div>

        </div>
      </section>

      {/* ─── 7. Call to Action ─────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 border-t border-gray-100 bg-[#fafafa]/50">
        <div className="max-w-3xl mx-auto text-center p-6 sm:p-10 md:p-14 rounded-2xl sm:rounded-3xl border border-[#eaeaea] bg-white shadow-sm relative overflow-hidden">
          
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, rgba(37,99,235,0.25), transparent 70%)",
            }}
          />

          <div className="relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-4 sm:mb-6 flex items-center justify-center bg-white border border-[#eaeaea] shadow-sm">
              <img src="/septet-logo.png" alt="Septet Labs" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4 text-black tracking-tight leading-tight">
              Ready to architect <br className="hidden sm:inline" />
              the unseen?
            </h2>
            <p className="mb-6 sm:mb-8 max-w-xl mx-auto text-[#666666] text-xs sm:text-base leading-relaxed">
              Partner with our 7-member deep-tech squad to transform complex technical bottlenecks into lean, scalable production software.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
              <button
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-base w-full sm:w-auto px-6 py-3 rounded-md font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.35)] transition-all"
              >
                <span>Initiate Transmission</span>
                <ArrowRight size={16} />
              </button>
              <a
                href="#challenge"
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-base w-full sm:w-auto px-6 py-3 rounded-md font-semibold text-black bg-white border border-[#eaeaea] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Terminal size={16} className="text-[#2563EB]" />
                <span>The 48-Hour Protocol</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 8. Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-10 sm:py-14 px-4 sm:px-6 border-t border-[#eaeaea] bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
          
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white border border-[#eaeaea] shrink-0">
              <img src="/septet-logo.png" alt="Septet Labs" className="w-5 h-5 object-contain" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm tracking-tight text-black">
                Septet <span className="text-[#2563EB]">Labs</span>
              </span>
              <p className="text-xs text-[#666666]">Quiet progress, loud results.</p>
            </div>
          </div>

          <div className="text-xs text-[#999999] font-mono">
            © 2026 Septet Labs. All rights reserved.
          </div>

        </div>
      </footer>

      {/* ─── Modal 1: The 48-Hour Challenge ────────────────────────────────── */}
      {challengeModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setChallengeModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#eaeaea] bg-white text-black p-5 sm:p-8 relative shadow-2xl">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center shrink-0">
                  <Terminal size={14} className="text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#2563EB] truncate">
                  SPRINT SPECIFICATION
                </span>
              </div>
              <button
                onClick={() => setChallengeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors shrink-0 -mr-1"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">The 48-Hour Challenge</h3>
            <p className="text-xs sm:text-sm text-[#666666] mb-5 leading-relaxed">
              Our protocol for converting an unsolved technical barrier into a tested, deployed zero-to-one artifact within a continuous 48-hour window.
            </p>

            <div className="space-y-3 mb-6">
              {[
                {
                  time: "00:00 - 08:00",
                  title: "Mathematical Framing & Architectural Spec",
                  desc: "Team Lead & Foundations Lead formalize constraints, benchmark targets, and interface contracts.",
                },
                {
                  time: "08:00 - 24:00",
                  title: "Core Infrastructure & Pipeline Execution",
                  desc: "Systems builders construct low-latency runtime, concurrency harness, and baseline test suite.",
                },
                {
                  time: "24:00 - 36:00",
                  title: "Applied AI Integration & Distillation",
                  desc: "Quantization, tool-calling validation, latency profiling, and stress-testing edge failures.",
                },
                {
                  time: "36:00 - 48:00",
                  title: "Deployment, Telemetry & Open Demo",
                  desc: "Production rollout, automated verification, documentation, and live demonstration.",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-xl border border-[#eaeaea] bg-[#fafafa] flex flex-col sm:flex-row items-start gap-2.5 sm:gap-4"
                >
                  <div className="text-xs font-mono font-bold text-[#2563EB] shrink-0">
                    {step.time}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-black">{step.title}</h4>
                    <p className="text-[11px] text-[#666666] mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3">
              <button
                onClick={() => setChallengeModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-md font-semibold text-xs sm:text-sm bg-white border border-[#eaeaea] text-black hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setChallengeModalOpen(false);
                  setJoinModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-md font-semibold text-xs sm:text-sm bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              >
                Apply for Next Sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Join the Squad Form ──────────────────────────────────── */}
      {joinModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setJoinModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#eaeaea] bg-white text-black p-5 sm:p-8 relative shadow-2xl">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center shrink-0">
                  <Send size={14} className="text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#2563EB] truncate">
                  APPRENTICESHIP &amp; TRANSMISSION
                </span>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors shrink-0 -mr-1"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1.5">Join Septet Labs</h3>
            <p className="text-xs text-[#666666] mb-5 leading-relaxed">
              We look for proof of work, compiler optimizations, original research, and relentless builders.
            </p>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4 border border-emerald-200">
                  <span className="text-xl font-bold">✓</span>
                </div>
                <h4 className="text-lg font-bold mb-1">Transmission Received</h4>
                <p className="text-xs text-gray-500 mb-6">Our team lead reviews all submissions within 24 hours.</p>
                {branding && (
                  <div className="pt-4 text-center">
                    <a
                      href={branding.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-black transition-colors font-medium inline-block"
                    >
                      Powered by <strong className="font-semibold text-gray-700">{branding.text.replace(/^Powered by\s*/i, "")}</strong>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Your Name / Pseudonym</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ada Lovelace"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-lg border border-[#eaeaea] outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Contact Email / Telegram / Matrix</label>
                  <input
                    type="text"
                    required
                    placeholder="ada@example.com or @handle"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-lg border border-[#eaeaea] outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Core Vector of Interest</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-lg border border-[#eaeaea] outline-none focus:border-black bg-white"
                  >
                    <option value="Tech/Systems Builder">Tech / Systems Builder (Core Infra)</option>
                    <option value="Autonomous Systems">Autonomous Systems &amp; Platform</option>
                    <option value="AI R&amp;D Foundations">AI Foundations &amp; Deep Learning</option>
                    <option value="Cognitive Intelligence">Cognitive Agents &amp; Multi-Modal</option>
                    <option value="Product Manager">Deep-Tech Product Manager</option>
                    <option value="Growth Lead">Ecosystem &amp; Technical Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Proof of Work (GitHub, Arxiv paper, live system link)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Paste links to your best PRs, papers, or systems work..."
                    value={form.proof}
                    onChange={(e) => setForm({ ...form, proof: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-lg border border-[#eaeaea] outline-none focus:border-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-semibold text-sm bg-black text-white hover:bg-gray-800 transition-colors mt-1 sm:mt-2 disabled:opacity-60"
                >
                  {submitting ? "Transmitting..." : "Send Transmission"}
                </button>

                {branding && (
                  <div className="pt-3 text-center">
                    <a
                      href={branding.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-black transition-colors font-medium inline-block"
                    >
                      Powered by <strong className="font-semibold text-black">{branding.text.replace(/^Powered by\s*/i, "")}</strong>
                    </a>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
