"use client";
import { useState, useEffect } from "react";
import { Plus, Server, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("mf_token");
  }
  return null;
}

export default function DedicatedIPsPage() {
  const [ips, setIps] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  async function fetchIPs() {
    try {
      const res = await fetch(`${API}/v1/ips`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setIps(json.data.ips);
        setPools(json.data.pools);
      }
    } catch {
      setError("Failed to fetch IPs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIPs();
  }, []);

  async function requestIP() {
    setRequesting(true);
    try {
      const res = await fetch(`${API}/v1/ips/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchIPs();
      }
    } catch {
      setError("Error requesting IP.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dedicated IPs</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Manage your dedicated IP addresses and IP pools to protect your sender reputation.
          </p>
        </div>
        <button
          onClick={requestIP}
          disabled={requesting}
          className="btn-primary flex items-center"
        >
          {requesting ? "Requesting..." : <><Plus size={16} className="mr-2" /> Request New IP</>}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Total Dedicated IPs</h3>
          <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{ips.length}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Warming Up</h3>
          <p className="text-3xl font-bold text-amber-500">
            {ips.filter((ip) => ip.status === "warming").length}
          </p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Active</h3>
          <p className="text-3xl font-bold text-green-500">
            {ips.filter((ip) => ip.status === "active").length}
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Your IP Addresses</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : ips.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Server size={48} className="mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No Dedicated IPs</h3>
            <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
              Dedicated IPs help you take full control of your sender reputation. They are recommended for senders who transmit more than 100,000 emails per month.
            </p>
            <button onClick={requestIP} className="btn-primary">
              Add Dedicated IP
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">IP Address</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Pool</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Warmup</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {ips.map((ip) => (
                  <tr key={ip.id} className="hover:bg-black/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Server size={16} style={{ color: "var(--text-muted)" }} />
                        <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{ip.ipAddress}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {ip.status === "active" ? (
                        <span className="badge-success"><CheckCircle size={12} className="mr-1" /> Active</span>
                      ) : ip.status === "warming" ? (
                        <span className="badge-warning"><Clock size={12} className="mr-1" /> Warming Up</span>
                      ) : (
                        <span className="badge-error"><AlertTriangle size={12} className="mr-1" /> {ip.status}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      {ip.poolId ? pools.find((p) => p.id === ip.poolId)?.name || "Unknown" : "Unassigned"}
                    </td>
                    <td className="p-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={ip.isWarmupEnabled} readOnly />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
