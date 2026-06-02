"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Building, Globe, Phone, Briefcase, MapPin, CheckCircle2, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  // Step 1 & 2: Profile & Address
  const [form, setForm] = useState({
    companyName: "",
    websiteUrl: "",
    countryCode: "+91",
    phoneNumber: "",
    useCase: "transactional",
    companyAddress: "",
    companyAddress2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  // Step 3: Domain Setup
  const [domainStrategy, setDomainStrategy] = useState<"custom" | "shared" | "">("");
  const [customDomain, setCustomDomain] = useState("");
  const [sharedPrefix, setSharedPrefix] = useState("");
  const [sharedDisplayName, setSharedDisplayName] = useState("");
  const [sharedReplyTo, setSharedReplyTo] = useState("");
  const [sharedNickname, setSharedNickname] = useState("");
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [sharedOtp, setSharedOtp] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
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
        if (user.email) {
          setUserEmail(user.email);
          setSharedReplyTo(user.email); // Default replyTo to registered email
        }
      } catch (e) {}
    }
  }, [router]);

  // Sync prefix and display name with company name
  useEffect(() => {
    if (form.companyName && !sharedPrefix && !sharedDisplayName) {
        setSharedPrefix(form.companyName.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        setSharedDisplayName(form.companyName);
    }
  }, [form.companyName]);

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function handleStep2Submit(e: React.FormEvent) {
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
          useCase: form.useCase,
          companyAddress: form.companyAddress,
          companyAddress2: form.companyAddress2,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
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

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!domainStrategy) {
      setError("Please select a domain strategy to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setMsg(null);
    const token = localStorage.getItem("mf_access_token");

    try {
      if (domainStrategy === "custom") {
        if (!customDomain) throw new Error("Please enter your domain name.");
        const res = await fetch(`${API}/v1/domains`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ domain: customDomain.trim() })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        router.push("/dashboard/domains");
      } else if (domainStrategy === "shared") {
        if (!isAwaitingOtp) {
            if (!sharedPrefix) throw new Error("Please enter a sender username.");
            if (!sharedDisplayName) throw new Error("Please enter a display name.");
            if (!sharedReplyTo) throw new Error("Reply-To email is required for the shared domain.");
            
            // 1. Create Sender Identity & Send OTP
            const senderRes = await fetch(`${API}/v1/domains/shared/setup`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                username: sharedPrefix.trim(),
                displayName: sharedDisplayName.trim(),
                replyTo: sharedReplyTo.trim(),
              })
            });
            const senderData = await senderRes.json();
            if (!senderData.success) throw new Error(senderData.error);
            
            setIsAwaitingOtp(true);
            setMsg({ text: "OTP sent to your Reply-To email!", type: "success" });
            setLoading(false);
            return;
        } else {
            if (!sharedOtp) throw new Error("Please enter the OTP.");
            
            // 2. Verify OTP
            const verifyRes = await fetch(`${API}/v1/domains/shared/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ otp: sharedOtp, replyTo: sharedReplyTo.trim(), nickname: sharedNickname.trim() })
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) throw new Error(verifyData.error);
            
            router.push("/dashboard");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup domain.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[600px] animate-fade-in py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-bold text-xl mb-6">
            <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight">Qwik Mailer</span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-6 text-sm font-medium">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
              Profile
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
              Address
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 3 ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>3</div>
              Domain
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-black tracking-tight">
            {step === 1 ? "Welcome to Qwik Mailer" : step === 2 ? "Your Mailing Address" : "Set up your Sending Domain"}
          </h1>
          <p className="text-sm text-gray-500">
            {step === 1 ? "Let's get your account set up." : step === 2 ? "We need a few details for CAN-SPAM compliance and billing." : "Choose how you want to send emails."}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {msg && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} /> {msg.text}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="space-y-5">
                <h3 className="font-semibold text-base border-b pb-2">Company Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <Building size={14} /> Company or Project Name *
                    </label>
                    <input
                      type="text" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                      placeholder="Acme Corp"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <Globe size={14} /> Website URL
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                      placeholder="acme.com"
                      value={form.websiteUrl}
                      onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <Phone size={14} /> Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-[90px] px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
                        value={form.countryCode}
                        onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                      </select>
                      <input
                        type="tel" required
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="99999 00000"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <Briefcase size={14} /> Primary Use Case *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
                      value={form.useCase}
                      onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                    >
                      <option value="transactional">Transactional Emails</option>
                      <option value="marketing">Marketing & Newsletters</option>
                      <option value="cold_outreach">Cold Email Outreach</option>
                      <option value="testing">Personal Project</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Continue to Address <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="space-y-5">
                <h3 className="font-semibold text-base border-b pb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" /> Address & Billing
                </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1 *</label>
                    <input
                      type="text" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                      placeholder="123 Main St"
                      value={form.companyAddress}
                      onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                      placeholder="Suite / Apt"
                      value={form.companyAddress2}
                      onChange={(e) => setForm({ ...form, companyAddress2: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                      <input
                        type="text" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">State/Province *</label>
                      <input
                        type="text" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code *</label>
                      <input
                        type="text" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        value={form.zipCode}
                        onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Country *</label>
                      <input
                        type="text" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="United States"
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

              <div className="pt-4 border-t flex items-center gap-3">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors shrink-0">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Continue to Domain Setup <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              {!isAwaitingOtp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div 
                      onClick={() => setDomainStrategy("custom")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${domainStrategy === 'custom' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Custom Domain</h3>
                        {domainStrategy === 'custom' && <CheckCircle2 size={18} className="text-black" />}
                      </div>
                      <p className="text-xs text-gray-500">I have my own domain name (e.g. acme.com) and access to its DNS settings.</p>
                    </div>

                    <div 
                      onClick={() => setDomainStrategy("shared")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${domainStrategy === 'shared' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Shared Domain</h3>
                        {domainStrategy === 'shared' && <CheckCircle2 size={18} className="text-black" />}
                      </div>
                      <p className="text-xs text-gray-500">I don't have a domain. Use the Qwik Mailer shared domain to start sending immediately.</p>
                    </div>
                  </div>
              )}

              {domainStrategy === "custom" && (
                <div className="bg-gray-50 p-4 rounded-lg border animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter your Domain Name</label>
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                    <div className="px-3 bg-gray-50 text-gray-500 border-r border-gray-300 text-sm">@</div>
                    <input
                      type="text" required
                      className="w-full px-3 py-2 focus:outline-none sm:text-sm"
                      placeholder="yourcompany.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You will need to add DNS records to verify ownership.</p>
                </div>
              )}

              {domainStrategy === "shared" && !isAwaitingOtp && (
                <div className="bg-gray-50 p-4 rounded-lg border animate-fade-in space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender Username *</label>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                          <input
                            type="text" required
                            className="w-full px-3 py-2 focus:outline-none sm:text-sm"
                            placeholder="yourcompany"
                            value={sharedPrefix}
                            onChange={(e) => setSharedPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          />
                          <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm whitespace-nowrap">@mail.qwikmailer.in</div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name *</label>
                        <input
                          type="text" required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
                          placeholder="Acme Corp"
                          value={sharedDisplayName}
                          onChange={(e) => setSharedDisplayName(e.target.value)}
                        />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reply-To Address *</label>
                      <input
                        type="email" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="you@gmail.com"
                        value={sharedReplyTo}
                        onChange={(e) => setSharedReplyTo(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Required. Replies to your emails will be sent here.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nickname <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="E.g. Support Team"
                        value={sharedNickname}
                        onChange={(e) => setSharedNickname(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Internal name to help you identify this sender.</p>
                    </div>
                  </div>
                </div>
              )}

              {domainStrategy === "shared" && isAwaitingOtp && (
                <div className="bg-white p-6 rounded-2xl border shadow-sm text-center animate-fade-in">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Verify your email</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    We sent a 6-digit verification code to<br/>
                    <span className="font-semibold text-gray-800">{sharedReplyTo}</span>
                  </p>
                  
                  <div className="max-w-[240px] mx-auto">
                    <input
                      type="text"
                      className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="------"
                      maxLength={6}
                      value={sharedOtp}
                      onChange={(e) => setSharedOtp(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {!isAwaitingOtp && (
                    <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors shrink-0">
                      ← Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm font-medium text-gray-500 hover:text-black transition-colors underline"
                  >
                    Skip for now
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || !domainStrategy || (isAwaitingOtp && sharedOtp.length !== 6)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>{isAwaitingOtp ? "Verify & Finish" : "Complete Setup"} <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
