"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (localStorage.getItem("mf_access_token")) {
      const userStr = localStorage.getItem("mf_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.onboardingCompleted === false) {
            router.push("/onboarding");
            return;
          }
        } catch (e) {}
      }
      router.push("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      localStorage.setItem("mf_access_token", data.data.accessToken);
      localStorage.setItem("mf_refresh_token", data.data.refreshToken);
      localStorage.setItem("mf_user", JSON.stringify(data.data.user));
      if (!data.data.user.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
          <h1 className="text-2xl font-bold mt-6 mb-2 text-black">Sign in to your account</h1>
          <p className="text-sm text-gray-500">Welcome back! Please enter your details.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="login-email"
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                placeholder="you@startup.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-sm font-medium text-black hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm pr-10"
                  placeholder="••••••••"
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

            {requires2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Shield size={14} className="text-black" /> 2FA Code
                </label>
                <input
                  id="login-totp"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm font-mono tracking-widest uppercase"
                  placeholder="000000"
                  maxLength={6}
                  value={form.totpCode}
                  onChange={(e) => setForm({ ...form, totpCode: e.target.value })}
                />
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Don't have an account? <Link href="/register" className="text-black font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
