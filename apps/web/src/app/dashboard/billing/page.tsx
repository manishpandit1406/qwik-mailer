"use client";
import { useEffect, useState } from "react";
import { CreditCard, Zap, CheckCircle2, AlertCircle, TrendingUp, Lock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface UserPlanData {
  plan: string;
  monthlyEmailCount: number;
  planLimit: number;
  extraEmailQuota: number;
  validationLimit: number;
  monthlyValidationCount: number;
}

export default function BillingPage() {
  const [data, setData] = useState<UserPlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const token = localStorage.getItem("mf_access_token");
      if (!token) return;
      const res = await fetch(`${API}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const simulateUpgrade = async (plan: string) => {
    // In the future, this will redirect to Stripe checkout.
    alert(`Redirecting to Stripe checkout for ${plan.toUpperCase()} plan... (Simulated)`);
  };

  const buyAddon = async (amount: number, price: number) => {
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/billing/add-on`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailsToAdd: amount }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Successfully purchased ${amount.toLocaleString()} extra emails!`);
        fetchMe(); // Refresh data
      } else {
        alert(json.error || "Failed to purchase add-on");
      }
    } catch (err) {
      alert("Failed to purchase add-on");
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  const isFree = data.plan === "free";
  const usedPercent = data.planLimit > 0 ? Math.min(100, Math.round((data.monthlyEmailCount / data.planLimit) * 100)) : 0;
  const validationsPercent = data.validationLimit > 0 ? Math.min(100, Math.round((data.monthlyValidationCount / data.validationLimit) * 100)) : 0;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard size={24} className="text-indigo-600" /> Billing & Plans
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription, quotas, and billing history.</p>
      </div>

      {/* Current Usage Overview */}
      <div className="glass-card p-6 border-t-4 border-indigo-500">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Current Plan</div>
            <h2 className="text-3xl font-black text-gray-900 capitalize">{data.plan}</h2>
          </div>
          {data.extraEmailQuota > 0 && (
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1">Extra Quota Balance</div>
              <h2 className="text-2xl font-black text-emerald-600">{data.extraEmailQuota.toLocaleString()}</h2>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Email Quota Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700">Monthly Emails Sent</span>
              <span className="text-gray-900">{data.monthlyEmailCount.toLocaleString()} / {data.planLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${usedPercent > 90 ? 'bg-rose-500' : usedPercent > 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Resets on the 1st of your billing cycle.</p>
          </div>

          {/* Validation Quota Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700">Email Validations Used</span>
              <span className="text-gray-900">{data.monthlyValidationCount.toLocaleString()} / {data.validationLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${validationsPercent > 90 ? 'bg-rose-500' : validationsPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${validationsPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Included in your {data.plan} plan.</p>
          </div>
        </div>
      </div>

      {/* Add-on Store (Only for paid plans conceptually, but we can allow everyone) */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Zap size={20} className="text-amber-500" /> Need more capacity?
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          If you are reaching your monthly limit, you can buy a one-time add-on quota. These extra emails never expire and are automatically used if your monthly limit runs out.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { amount: 5000, price: 199 },
            { amount: 25000, price: 799 },
            { amount: 100000, price: 2499 }
          ].map((addon) => (
            <div key={addon.amount} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-white">
              <h4 className="text-xl font-black text-gray-900 mb-1">{addon.amount.toLocaleString()} <span className="text-sm font-medium text-gray-500">emails</span></h4>
              <p className="text-indigo-600 font-bold mb-4">₹{addon.price}</p>
              <button
                onClick={() => buyAddon(addon.amount, addon.price)}
                className="w-full btn-secondary text-sm"
              >
                Buy Add-on
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-6">Available Plans</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Standard */}
          <div className={`glass-card p-6 relative ${data.plan === 'standard' ? 'ring-2 ring-indigo-500' : ''}`}>
            {data.plan === 'standard' && <div className="absolute top-4 right-4"><CheckCircle2 className="text-indigo-500" /></div>}
            <h3 className="text-xl font-bold mb-1">Standard</h3>
            <div className="text-3xl font-black mb-4">₹199<span className="text-sm text-gray-500 font-medium">/mo</span></div>
            <ul className="space-y-3 mb-6 flex-1 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 5,000 emails/month</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Webhooks enabled</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 2,500 Validations</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 3 Team Members</li>
            </ul>
            {data.plan === 'standard' ? (
              <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">Current Plan</button>
            ) : (
              <button onClick={() => simulateUpgrade('standard')} className="w-full btn-primary">Upgrade to Standard</button>
            )}
          </div>

          {/* Pro */}
          <div className={`glass-card p-6 relative ${data.plan === 'pro' ? 'ring-2 ring-indigo-500' : ''}`}>
            {data.plan === 'pro' && <div className="absolute top-4 right-4"><CheckCircle2 className="text-indigo-500" /></div>}
            <h3 className="text-xl font-bold mb-1">Pro</h3>
            <div className="text-3xl font-black mb-4">₹1,599<span className="text-sm text-gray-500 font-medium">/mo</span></div>
            <ul className="space-y-3 mb-6 flex-1 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 50,000 emails/month</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Email Scheduling</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 25,000 Validations</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 5 Team Members</li>
            </ul>
            {data.plan === 'pro' ? (
              <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">Current Plan</button>
            ) : (
              <button onClick={() => simulateUpgrade('pro')} className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 text-white border-0">Upgrade to Pro</button>
            )}
          </div>

          {/* Business */}
          <div className={`glass-card p-6 relative ${data.plan === 'business' ? 'ring-2 ring-indigo-500' : ''}`}>
            {data.plan === 'business' && <div className="absolute top-4 right-4"><CheckCircle2 className="text-indigo-500" /></div>}
            <h3 className="text-xl font-bold mb-1">Business</h3>
            <div className="text-3xl font-black mb-4">₹3,999<span className="text-sm text-gray-500 font-medium">/mo</span></div>
            <ul className="space-y-3 mb-6 flex-1 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 250,000 emails/month</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Priority Support SLA</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> 100,000 Validations</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Unlimited Team Members</li>
            </ul>
            {data.plan === 'business' ? (
              <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">Current Plan</button>
            ) : (
              <button onClick={() => simulateUpgrade('business')} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors">Upgrade to Business</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
