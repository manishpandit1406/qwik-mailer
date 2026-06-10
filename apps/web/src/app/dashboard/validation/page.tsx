"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Mail, AlertTriangle, XCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ValidationDashboard() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("mf_access_token") || "");
  }, []);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/validation/single`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate email");

      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-100 text-green-700 border-green-200";
      case "invalid": return "bg-red-100 text-red-700 border-red-200";
      case "disposable": return "bg-amber-100 text-amber-700 border-amber-200";
      case "role_based": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid": return <CheckCircle2 className="text-green-500" />;
      case "invalid": return <XCircle className="text-red-500" />;
      case "disposable": return <ShieldAlert className="text-amber-500" />;
      case "role_based": return <AlertTriangle className="text-blue-500" />;
      default: return <ShieldCheck className="text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <ShieldCheck className="text-black" size={32} />
            Email Validation
          </h1>
          <p className="mt-2 text-gray-500">
            Verify email addresses in real-time to protect your sender reputation and reduce bounce rates.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <form onSubmit={handleValidate} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test an Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Validating..." : "Validate"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 border-t border-gray-100 pt-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center shadow-inner">
                {getStatusIcon(result.status)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{result.email}</h3>
                <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(result.status)}`}>
                  {result.status.replace("_", " ")}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Quality Score</div>
                <div className="text-4xl font-black tracking-tighter mt-1" style={{ color: result.score >= 80 ? '#10b981' : result.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {result.score}/100
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Syntax Valid</div>
                <div className="font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" /> Yes
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Has MX Records</div>
                <div className="font-semibold flex items-center gap-2">
                  {result.hasMxRecords ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  {result.hasMxRecords ? "Yes" : "No"}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Disposable</div>
                <div className="font-semibold flex items-center gap-2">
                  {result.isDisposable ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-green-500" />}
                  {result.isDisposable ? "Yes" : "No"}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Role Based</div>
                <div className="font-semibold flex items-center gap-2">
                  {result.isRoleBased ? <AlertTriangle size={16} className="text-blue-500" /> : <CheckCircle2 size={16} className="text-green-500" />}
                  {result.isRoleBased ? "Yes" : "No"}
                </div>
              </div>
            </div>
            
            <p className="mt-6 text-xs text-center text-gray-400">
              Validated at {new Date(result.validatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
