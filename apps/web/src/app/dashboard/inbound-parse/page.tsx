"use client";
import { useState, useEffect } from "react";
import { Webhook, Plus, Settings, CheckCircle, Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("mf_token");
  }
  return null;
}

export default function InboundParsePage() {
  const [parses, setParses] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Form State
  const [domainId, setDomainId] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [spamCheck, setSpamCheck] = useState(true);
  const [sendRaw, setSendRaw] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [parseRes, domainRes] = await Promise.all([
        fetch(`${API}/v1/inbound`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/v1/domains`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const parseJson = await parseRes.json();
      const domainJson = await domainRes.json();
      if (parseJson.success) setParses(parseJson.data);
      if (domainJson.success) {
        setDomains(domainJson.data);
        if (domainJson.data.length > 0) setDomainId(domainJson.data[0].id);
      }
    } catch {
      setError("Failed to load inbound settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/inbound`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainId,
          subdomain,
          destinationUrl,
          spamCheck,
          sendRaw,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setSubdomain("");
        setDestinationUrl("");
        await fetchData();
      } else {
        setError(json.error || "Failed to create inbound parse");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this setting?")) return;
    try {
      await fetch(`${API}/v1/inbound/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setParses(parses.filter(p => p.id !== id));
    } catch {
      console.error("Failed to delete");
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Inbound Parse Webhooks</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Receive incoming emails, parse their content and attachments, and POST them to your specified URL.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
          <Plus size={16} className="mr-2" /> Add Host & URL
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : parses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Webhook size={48} className="mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No Inbound Parse settings</h3>
            <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
              You haven't configured any domains to receive inbound emails yet.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Add Host & URL
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Host Domain</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Destination URL</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Spam Check</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Format</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {parses.map((p) => (
                  <tr key={p.id} className="hover:bg-black/5 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                        {p.subdomain}.{p.domain?.domain}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        MX: mx.qwikmailer.in
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-indigo-500 font-medium truncate max-w-[250px]" title={p.destinationUrl}>
                        {p.destinationUrl}
                      </div>
                    </td>
                    <td className="p-4">
                      {p.spamCheck ? (
                        <span className="badge-success"><CheckCircle size={12} className="mr-1"/> Enabled</span>
                      ) : (
                        <span className="badge-neutral">Disabled</span>
                      )}
                    </td>
                    <td className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      {p.sendRaw ? "Raw MIME" : "Parsed JSON"}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40" onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 max-w-lg w-full animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Add Inbound Parse Host</h3>
            
            {error && <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Domain</label>
                <select className="input" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.domain}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Subdomain Host</label>
                <div className="flex items-center gap-2">
                  <input type="text" className="input flex-1" placeholder="e.g. parse" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} required />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                    .{domains.find(d => d.id === domainId)?.domain || "domain.com"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Destination URL</label>
                <input type="url" className="input" placeholder="https://your-server.com/webhook" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Where Qwik Mailer will POST the parsed email data.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="spamCheck" className="rounded text-indigo-600" checked={spamCheck} onChange={(e) => setSpamCheck(e.target.checked)} />
                <label htmlFor="spamCheck" className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Check incoming emails for spam
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="sendRaw" className="rounded text-indigo-600" checked={sendRaw} onChange={(e) => setSendRaw(e.target.checked)} />
                <label htmlFor="sendRaw" className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Send raw MIME payload instead of parsed JSON
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={adding}>
                  {adding ? "Saving..." : "Save Host"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
