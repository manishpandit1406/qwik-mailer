"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

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
    <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Verifying...</h2>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Email Verified</h2>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <Link href="/login" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
            Continue to Login <ArrowRight size={16} />
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Verification Failed</h2>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <Link href="/login" className="w-full flex justify-center py-2.5 px-4 mb-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
            Go to Login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
            <Mail size={16} className="text-white" />
          </div>
          <span className="text-black tracking-tight">Qwik Mailer</span>
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Loading...</h2>
          <p className="text-sm text-gray-600 mb-6">Preparing to verify your email.</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
