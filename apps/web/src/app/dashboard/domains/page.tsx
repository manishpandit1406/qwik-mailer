"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Trash2,
  ExternalLink,
  Mail,
  Link2,
} from "lucide-react";
import { DomainSendersModal } from "./DomainSendersModal";
import { LogoLoader } from "@/components/LogoLoader";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Domain {
  id: string;
  domain: string;
  status: "verified" | "pending" | "failed";
  spfVerified: boolean;
  mailFromVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  isTrackingDomain: boolean;
  trackingCname?: string;
  cnameVerified?: boolean;
  healthScore: number;
  createdAt: string;
}
interface DnsRecord {
  type: string;
  host: string;
  value: string;
  priority?: number;
  purpose: string;
  verified: boolean;
}
const statusStyles: Record<string, string> = {
  verified: "badge-success",
  pending: "badge-warning",
  failed: "badge-danger",
};
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const bg =
    score >= 80
      ? "bg-emerald-100"
      : score >= 50
        ? "bg-amber-100"
        : "bg-red-100";
  const barColor =
    score >= 80
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      {" "}
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${bg}`}>
        {" "}
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />{" "}
      </div>{" "}
      <span className="text-xs font-semibold" style={{ color }}>
        {score}
      </span>{" "}
    </div>
  );
}
export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [dnsModal, setDnsModal] = useState<{
    domain: string;
    records: DnsRecord[];
  } | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [sendersModal, setSendersModal] = useState<Domain | null>(null);
  async function fetchDomains() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/domains`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.success) setDomains(json.data);
    } catch {
      setError("Failed to load domains.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchDomains();
  }, []);
  async function addDomain() {
    if (!newDomain.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to add domain.");
        return;
      }
      setNewDomain("");
      setShowAdd(false);
      await fetchDomains();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }
  async function loadDnsRecords(id: string) {
    setDnsLoading(true);
    try {
      const res = await fetch(`${API}/v1/domains/${id}/dns-records`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setDnsModal(json.data);
      else setError(json.error ?? "Failed to load DNS records.");
    } catch {
      setError("Network error.");
    } finally {
      setDnsLoading(false);
    }
  }
  async function verifyDomain(id: string) {
    setVerifying(id);
    setError("");
    try {
      const res = await fetch(`${API}/v1/domains/${id}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchDomains();
      } else {
        setError(json.error ?? "Verification failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setVerifying(null);
    }
  }
  async function deleteDomain(id: string) {
    if (!confirm("Delete this domain? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/v1/domains/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setDomains(domains.filter((d) => d.id !== id));
      else setError(json.error ?? "Failed to delete domain.");
    } catch {
      setError("Network error.");
    }
  }
  function copyValue(val: string, key: string) {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function setupLinkBranding(id: string) {
    setError("");
    try {
      const res = await fetch(`${API}/v1/domains/${id}/link-branding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchDomains();
      } else {
        setError(json.error ?? "Failed to setup link branding.");
      }
    } catch {
      setError("Network error.");
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Domains
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Authenticate your sending domains for better deliverability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost p-2"
            title="Refresh"
            onClick={fetchDomains}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} /> Add Domain
          </button>
        </div>
      </div>
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          {error}
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}
      {/* Domain list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <LogoLoader fullPage text="Loading domains..." />
        ) : domains.length === 0 ? (
          <div className="p-12 text-center">
            <Globe size={32} className="mx-auto mb-3 text-gray-300" />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No domains added yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Add a domain to start sending emails from your own address.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Return Path</th>
                <th>DKIM</th>
                <th>DMARC</th>
                <th>CNAME</th>
                <th>Health</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td
                    className="font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-indigo-600" /> {d.domain}
                      {d.domain === "mail.qwikmailer.in" && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-1">Shared</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={statusStyles[d.status] ?? "badge-muted"}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.mailFromVerified ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500" />
                    )}
                  </td>
                  <td>
                    {d.dkimVerified ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500" />
                    )}
                  </td>
                  <td>
                    {d.dmarcVerified ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500" />
                    )}
                  </td>
                  <td>
                    {d.isTrackingDomain ? (
                      d.cnameVerified ? (
                        <CheckCircle2 size={15} className="text-emerald-500" />
                      ) : (
                        <span title="Pending CNAME Verification"><AlertCircle size={15} className="text-amber-500" /></span>
                      )
                    ) : (
                      <button
                        onClick={() => setupLinkBranding(d.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                        title="Enable Link Branding (CNAME)"
                      >
                        Enable
                      </button>
                    )}
                  </td>
                  <td className="w-32">
                    <HealthBar score={d.healthScore ?? 0} />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {d.domain !== "mail.qwikmailer.in" && (
                        <button
                          className="btn-ghost p-1.5"
                          title="View DNS Records"
                          onClick={() => loadDnsRecords(d.id)}
                          disabled={dnsLoading}
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                      {d.domain !== "mail.qwikmailer.in" && (
                        <button
                          className="btn-ghost p-1.5 text-indigo-500 hover:text-indigo-700"
                          title={d.isTrackingDomain ? "Link Branding (CNAME) Configured" : "Enable Link Branding (CNAME)"}
                          onClick={() => !d.isTrackingDomain && setupLinkBranding(d.id)}
                          disabled={d.isTrackingDomain}
                        >
                          <Link2 size={13} className={d.isTrackingDomain ? "text-emerald-500" : ""} />
                        </button>
                      )}
                      <button
                        className="btn-ghost p-1.5"
                        title="Manage Senders"
                        onClick={() => setSendersModal(d)}
                      >
                        <Mail size={13} />
                      </button>
                      {d.domain !== "mail.qwikmailer.in" && (
                        <button
                          className="btn-ghost p-1.5"
                          title="Verify DNS"
                          onClick={() => verifyDomain(d.id)}
                          disabled={verifying === d.id}
                        >
                          <RefreshCw
                            size={13}
                            className={verifying === d.id ? "animate-spin" : ""}
                          />
                        </button>
                      )}
                      {d.domain !== "mail.qwikmailer.in" && (
                        <button
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-600"
                          title="Delete"
                          onClick={() => deleteDomain(d.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Add domain modal */}
      {showAdd && (
        <div
          className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-6 bg-gray-900/40"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="glass-card p-6 max-w-md w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-bold text-lg mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Add Sending Domain
            </h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <input
              className="input mb-3"
              placeholder="myapp.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              After adding, you'll get SPF, DKIM, and DMARC records to add to
              your DNS provider.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={addDomain}
                disabled={adding || !newDomain.trim()}
              >
                {adding ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : null}
                {adding ? "Adding..." : "Add Domain"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DNS records modal */}
      {dnsModal && (
        <div
          className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-6 bg-gray-900/40"
          onClick={() => setDnsModal(null)}
        >
          <div
            className="glass-card p-6 max-w-2xl w-full animate-fade-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-bold text-lg mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              DNS Records for {dnsModal.domain}
            </h3>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              Add these records to your DNS provider (e.g. Cloudflare, GoDaddy,
              Namecheap):
            </p>
            <div className="space-y-4">
              {dnsModal.records.map((rec) => (
                <div
                  key={`${rec.host}-${rec.purpose}`}
                  className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="badge-info text-xs">{rec.type}</span>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {rec.purpose}
                      </span>
                    </div>
                    {rec.verified ? (
                      <span className="badge-success text-xs">✓ Verified</span>
                    ) : (
                      <span className="badge-warning text-xs">Pending</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <p
                        className="font-medium mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        HOST
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="code-block block flex-1">
                          {rec.host}
                        </code>
                        <button
                          className="btn-ghost p-1.5"
                          onClick={() =>
                            copyValue(
                              rec.host,
                              `host-${rec.host}`,
                            )
                          }
                        >
                          {copied === `host-${rec.host}` ? (
                            <CheckCircle2
                              size={12}
                              className="text-emerald-500"
                            />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                    {rec.priority !== undefined && (
                      <div>
                        <p
                          className="font-medium mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          PRIORITY
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="code-block block flex-1">
                            {rec.priority}
                          </code>
                          <button
                            className="btn-ghost p-1.5 shrink-0"
                            onClick={() =>
                              copyValue(rec.priority!.toString(), `prio-${rec.host}`)
                            }
                          >
                            {copied === `prio-${rec.host}` ? (
                              <CheckCircle2
                                size={12}
                                className="text-emerald-500"
                              />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <p
                        className="font-medium mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        VALUE
                      </p>
                      <div className="flex items-center gap-2">
                        <code
                          className="code-block block flex-1 break-all"
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {rec.value}
                        </code>
                        <button
                          className="btn-ghost p-1.5 shrink-0"
                          onClick={() =>
                            copyValue(rec.value, `val-${rec.host}`)
                          }
                        >
                          {copied === `val-${rec.host}` ? (
                            <CheckCircle2
                              size={12}
                              className="text-emerald-500"
                            />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn-primary mt-5 w-full"
              onClick={() => setDnsModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Senders Modal */}
      {sendersModal && (
        <DomainSendersModal
          domain={sendersModal}
          onClose={() => setSendersModal(null)}
        />
      )}
    </div>
  );
}
