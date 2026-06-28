"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
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
          if (user.role === "admin") {
            router.push("/admin");
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
      
      // Verify admin role explicitly before allowing login to continue
      if (data.data.user.role !== "admin") {
        throw new Error("Unauthorized access. Admin privileges required.");
      }

      if (data.data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      localStorage.setItem("mf_access_token", data.data.accessToken);
      localStorage.setItem("mf_refresh_token", data.data.refreshToken);
      localStorage.setItem("mf_user", JSON.stringify(data.data.user));
      
      router.push("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-bold text-xl mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-lg">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <span className="text-gray-900 tracking-tight font-black text-2xl">Admin Portal</span>
          </div>
          <h1 className="text-xl font-bold mb-2 text-gray-900">Restricted Access</h1>
          <p className="text-sm text-gray-500">Please authenticate to access the administration panel.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 to-gray-900"></div>
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600 flex flex-col gap-2 font-medium">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-all"
                placeholder="admin@domain.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm pr-10 transition-all"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {requires2FA && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                  <Shield size={14} className="text-gray-900" /> Secure 2FA Code
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm font-mono tracking-widest uppercase text-center text-lg"
                  placeholder="000000"
                  maxLength={6}
                  value={form.totpCode}
                  onChange={(e) => setForm({ ...form, totpCode: e.target.value })}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 mt-6 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Secure Login <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-xs text-gray-400 font-medium">
          <Link href="/login" className="hover:text-gray-600 transition-colors flex items-center justify-center gap-1">
            <ArrowRight size={12} className="rotate-180" /> Back to User Login
          </Link>
        </p>
      </div>
    </div>
  );
}
