"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agreeTerms }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoadingResend(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (data.success) {
        setError("Verification email resent successfully!"); // using error state to show message, maybe should rename or just use error but green? We'll use error for simplicity
      } else {
        setError(data.error ?? "Failed to resend");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoadingResend(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
        <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={24} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Check your email</h2>
          <p className="text-sm text-gray-600 mb-6">
            We sent a verification link to <strong className="text-black font-semibold">{form.email}</strong>. Click it to activate your account.
          </p>
          {error && (
            <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${error.includes('resent') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}
          <button
            onClick={handleResend}
            disabled={loadingResend}
            className="w-full mb-3 flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            {loadingResend ? "Sending..." : "Resend Verification Email"}
          </button>
          <button
            onClick={() => {
              const urlParams = new URLSearchParams(window.location.search);
              const redirect = urlParams.get('redirect');
              router.push(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login");
            }}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
              <ClipboardList size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-extrabold">QwikForms</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2 text-black">Create your account</h1>
          <p className="text-sm text-gray-500">Join thousands of creators building amazing forms.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                id="reg-name"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                placeholder="Priya Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="reg-email"
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                placeholder="you@startup.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm pr-10"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 mt-4">
              <input
                id="agree-terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
              />
              <label htmlFor="agree-terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                I agree to the <Link href="/terms" className="text-black underline hover:text-gray-700">Terms of Service</Link>, <Link href="/privacy" className="text-black underline hover:text-gray-700">Privacy Policy</Link>, and the Anti-Spam Policy. I understand that my account may be suspended without refund if I send unsolicited spam.
              </label>
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading || !agreeTerms}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all mt-6 ${
                loading || !agreeTerms ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Already have an account? <Link href="/login" className="text-black font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
