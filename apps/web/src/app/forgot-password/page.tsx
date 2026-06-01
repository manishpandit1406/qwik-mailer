"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight">Qwik Mailer</span>
          </Link>
        </div>

        {!sent ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <h1 className="text-xl font-bold text-black mb-2">Forgot password?</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                  placeholder="you@startup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2">Check your inbox</h2>
            <p className="text-sm text-gray-600 mb-6">
              We sent a password reset link to <strong className="text-black font-semibold">{email}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Didn't receive it? Check your spam folder, or{" "}
              <button className="text-black underline font-medium hover:text-gray-700" onClick={() => setSent(false)}>
                try again
              </button>.
            </p>
            <Link href="/login" className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
