"use client";
import { useEffect, useState } from "react";
import { CreditCard, Zap, CheckCircle2, XCircle, AlertCircle, TrendingUp, Lock } from "lucide-react";

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
  const monthlyEmail = data.monthlyEmailCount || 0;
  const planLimit = data.planLimit || 0;
  const extraQuota = data.extraEmailQuota || 0;
  const validationsUsed = data.monthlyValidationCount || 0;
  const validationLimit = data.validationLimit || 0;

  const usedPercent = planLimit > 0 ? Math.min(100, Math.round((monthlyEmail / planLimit) * 100)) : 0;
  const validationsPercent = validationLimit > 0 ? Math.min(100, Math.round((validationsUsed / validationLimit) * 100)) : 0;

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
          {extraQuota > 0 && (
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1">Extra Quota Balance</div>
              <h2 className="text-2xl font-black text-emerald-600">{extraQuota.toLocaleString()}</h2>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Email Quota Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700">Monthly Emails Sent</span>
              <span className="text-gray-900">{monthlyEmail.toLocaleString()} / {planLimit.toLocaleString()}</span>
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
              <span className="text-gray-900">{validationsUsed.toLocaleString()} / {validationLimit.toLocaleString()}</span>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: "free",
              name: "Free",
              price: "₹0",
              features: [
                { text: "Emails: 100/day (≈3,000/month)", included: true },
                { text: "Speed: 1 email/sec", included: true },
                { text: "Analytics", included: true },
                { text: "Team Members", included: false },
                { text: "Projects: 1", included: true },
                { text: "Forms", included: true },
                { text: "Contacts: 250", included: true },
                { text: "API Access", included: true },
                { text: "SMTP Access", included: true },
                { text: "Webhooks", included: false },
                { text: "Testing Inbox: 100 emails/day", included: true },
                { text: "Sender Identity: 1 Shared, 1 Custom Domain", included: true },
                { text: "Email Validation", included: true },
                { text: "Email Templates", included: true },
                { text: "Scheduling", included: false },
                { text: "Ticket Support", included: true },
              ]
            },
            {
              id: "standard",
              name: "Standard",
              price: "₹199",
              features: [
                { text: "Emails: 5,000/month", included: true },
                { text: "Speed: 3 emails/sec", included: true },
                { text: "Analytics", included: true },
                { text: "Team Members: 3", included: true },
                { text: "Projects: 2", included: true },
                { text: "Forms", included: true },
                { text: "Contacts: 2,000", included: true },
                { text: "API Access", included: true },
                { text: "SMTP Access", included: true },
                { text: "Webhooks", included: true },
                { text: "Testing Inbox: Same as Free", included: true },
                { text: "Sender Identity: 1 Shared, 5 Custom Domains", included: true },
                { text: "Email Validation", included: true },
                { text: "Email Templates", included: true },
                { text: "Scheduling", included: false },
                { text: "Ticket Support", included: true },
              ]
            },
            {
              id: "pro",
              name: "Pro",
              price: "₹1,599",
              features: [
                { text: "Emails: 50,000/month", included: true },
                { text: "Speed: 5 emails/sec", included: true },
                { text: "Analytics", included: true },
                { text: "Team Members: 5", included: true },
                { text: "Projects: 5", included: true },
                { text: "Forms", included: true },
                { text: "Contacts: 20,000", included: true },
                { text: "API Access", included: true },
                { text: "SMTP Access", included: true },
                { text: "Webhooks", included: true },
                { text: "Testing Inbox: Same as Free", included: true },
                { text: "Sender Identity: 1 Shared, 10 Custom Domains", included: true },
                { text: "Email Validation", included: true },
                { text: "Email Templates", included: true },
                { text: "Scheduling", included: true },
                { text: "Ticket Support: Priority", included: true },
              ]
            },
            {
              id: "business",
              name: "Business",
              price: "₹3,999",
              features: [
                { text: "Emails: 250,000/month", included: true },
                { text: "Speed: 20 emails/sec", included: true },
                { text: "Analytics", included: true },
                { text: "Team Members: Unlimited", included: true },
                { text: "Projects: Unlimited", included: true },
                { text: "Forms", included: true },
                { text: "Contacts: Unlimited", included: true },
                { text: "API Access", included: true },
                { text: "SMTP Access", included: true },
                { text: "Webhooks", included: true },
                { text: "Testing Inbox: Unlimited", included: true },
                { text: "Sender Identity: Unlimited Domains", included: true },
                { text: "Email Validation: 100k/mo", included: true },
                { text: "Email Templates", included: true },
                { text: "Scheduling", included: true },
                { text: "Ticket Support: Premium & SLA", included: true },
              ]
            }
          ].map((planObj) => (
            <div key={planObj.id} className={`glass-card p-6 relative flex flex-col ${data.plan === planObj.id ? 'ring-2 ring-indigo-500' : ''}`}>
              {data.plan === planObj.id && <div className="absolute top-4 right-4"><CheckCircle2 className="text-indigo-500" /></div>}
              <h3 className="text-xl font-bold mb-1">{planObj.name}</h3>
              <div className="text-3xl font-black mb-4">{planObj.price}<span className="text-sm text-gray-500 font-medium">/mo</span></div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {planObj.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>
                    {f.included ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={16} className="text-gray-300 shrink-0 mt-0.5" />
                    )}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              {data.plan === planObj.id ? (
                <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">Current Plan</button>
              ) : (
                <button 
                  onClick={() => simulateUpgrade(planObj.id)} 
                  className={`w-full ${planObj.id === 'pro' || planObj.id === 'business' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Upgrade to {planObj.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
