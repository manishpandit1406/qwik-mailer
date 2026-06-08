"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Authenticating your token...");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing. Please check your email link.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`${API}/v1/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        
        if (data.success) {
          setStatus("success");
          setMessage("Your email has been verified successfully. Welcome aboard!");
        } else {
          setStatus("error");
          setMessage(data.error ?? "The verification link is invalid or has expired.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Unable to connect to our servers. Please try again later.");
      }
    }

    verify();
  }, [token, API]);

  return (
    <div className="relative w-full max-w-md mx-auto z-10">
      {/* Decorative Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
      
      <div className="relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center overflow-hidden">
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}></div>

        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-16 h-16 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-inner">
                  <Loader2 size={28} className="text-blue-400 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Verifying Email</h2>
              <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-[280px]">
                {message}
              </p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col items-center"
            >
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="relative w-16 h-16 bg-[#111] border border-green-500/30 rounded-full flex items-center justify-center shadow-inner shadow-green-500/10"
                >
                  <CheckCircle2 size={32} className="text-green-400" />
                </motion.div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Verification Complete</h2>
              <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8 max-w-[280px]">
                {message}
              </p>
              <Link 
                href="/login" 
                className="group relative w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center gap-2">
                  Continue to Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-16 h-16 bg-[#111] border border-red-500/30 rounded-full flex items-center justify-center shadow-inner shadow-red-500/10">
                  <XCircle size={32} className="text-red-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Verification Failed</h2>
              <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8 max-w-[280px]">
                {message}
              </p>
              <Link 
                href="/login" 
                className="w-full flex justify-center py-3.5 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-all duration-200"
              >
                Return to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] relative overflow-hidden font-sans selection:bg-blue-500/30 selection:text-white px-4">
      
      {/* Background ambient gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 z-10"
      >
        <Link href="/" className="group inline-flex items-center gap-3 font-bold text-2xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 shadow-lg group-hover:border-white/20 transition-colors">
            <Mail size={20} className="text-white" />
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
            Qwik Mailer
          </span>
        </Link>
      </motion.div>

      <Suspense fallback={
        <div className="relative w-full max-w-md mx-auto z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="flex items-center justify-center w-20 h-20 mb-6 mx-auto">
            <Loader2 size={28} className="text-gray-500 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Preparing...</h2>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
