"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Building, Globe, Phone, Briefcase } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    websiteUrl: "",
    countryCode: "+91",
    phoneNumber: "",
    useCase: "transactional",
  });

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    // If not logged in, go to login. If already onboarded, go to dashboard.
    const token = localStorage.getItem("mf_access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.onboardingCompleted) {
          router.push("/dashboard");
        }
      } catch (e) {}
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: form.companyName,
          websiteUrl: form.websiteUrl 
            ? (form.websiteUrl.startsWith('http') ? form.websiteUrl : `https://${form.websiteUrl}`) 
            : "",
          phoneNumber: `${form.countryCode} ${form.phoneNumber}`,
          useCase: form.useCase
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Update local storage
      const userStr = localStorage.getItem("mf_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.onboardingCompleted = true;
        localStorage.setItem("mf_user", JSON.stringify(user));
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 font-bold text-xl mb-6">
            <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight">Qwik Mailer</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-black tracking-tight">Welcome to Qwik Mailer</h1>
          <p className="text-sm text-gray-500">Let's get your account set up. This will only take a minute.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm animate-fade-up">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <Building size={14} /> Company or Project Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                placeholder="Acme Corp"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <Globe size={14} /> Website URL <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                placeholder="acme.com or https://acme.com"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <Phone size={14} /> Phone Number
              </label>
              <div className="flex gap-2">
                <select
                  className="w-[100px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                >
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  type="tel"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                  placeholder="99999 00000"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Required for account security and anti-spam verification.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <Briefcase size={14} /> Primary Use Case
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
                value={form.useCase}
                onChange={(e) => setForm({ ...form, useCase: e.target.value })}
              >
                <option value="transactional">Transactional Emails (OTP, Receipts)</option>
                <option value="marketing">Marketing & Newsletters</option>
                <option value="cold_outreach">Cold Email Outreach</option>
                <option value="testing">Just Testing / Personal Project</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-8"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Complete Setup <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
