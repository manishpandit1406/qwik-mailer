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
  const [message, setMessage] = useState("Verifying your email address...");
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
          setMessage("Email verified successfully! You can now sign in to your account.");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Invalid or expired verification token.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Network error. Could not connect to the server.");
      }
    }

    verify();
  }, [token, API]);

  return (
    <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center relative z-10">
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Loader2 className="w-6 h-6 text-black animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2 tracking-tight">Verifying...</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
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
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 border border-green-100">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2 tracking-tight">Verification Complete</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link 
              href="/login" 
              className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all"
            >
              Continue to Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <XCircle size={24} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2 tracking-tight">Verification Failed</h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link 
              href="/login" 
              className="w-full flex justify-center py-2.5 px-4 mb-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              Go to Login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
            <Mail size={16} className="text-white" />
          </div>
          <span className="text-black tracking-tight">Qwik Mailer</span>
        </Link>
      </motion.div>

      <Suspense fallback={
        <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Loader2 className="w-6 h-6 text-black animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2 tracking-tight">Loading...</h2>
          <p className="text-sm text-gray-600 mb-6">Preparing to verify your email.</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
