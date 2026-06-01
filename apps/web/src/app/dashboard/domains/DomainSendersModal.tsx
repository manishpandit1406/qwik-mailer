"use client";
import { useState, useEffect } from "react";
import { X, Plus, Trash2, Mail, RefreshCw } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export function DomainSendersModal({
  domain,
  onClose,
}: {
  domain: { id: string; domain: string; status: string };
  onClose: () => void;
}) {
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form fields
  const [prefix, setPrefix] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyAddress2, setCompanyAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [nickname, setNickname] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchSenders();
  }, []);
  async function fetchSenders() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/domains/${domain.id}/senders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setSenders(json.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }
  async function addSender() {
    if (!prefix.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/domains/${domain.id}/senders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prefix: prefix.trim(),
          fromName,
          replyTo,
          companyAddress,
          companyAddress2,
          city,
          state: state,
          zipCode,
          country,
          nickname
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPrefix("");
        setFromName("");
        setReplyTo("");
        setCompanyAddress("");
        setCompanyAddress2("");
        setCity("");
        setState("");
        setZipCode("");
        setCountry("");
        setNickname("");
        setShowForm(false);
        await fetchSenders();
      } else {
        setError(json.error ?? "Failed to add sender.");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }
  async function deleteSender(id: string) {
    if (
      !confirm(
        "Delete this sender? Emails can no longer be sent from this address.",
      )
    )
      return;
    try {
      const res = await fetch(`${API}/v1/domains/${domain.id}/senders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSenders(senders.filter((s) => s.id !== id));
      }
    } catch {}
  }
  return (
    <div
      className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-6 bg-gray-900/40"
      onClick={onClose}
    >
      {" "}
      <div
        className="glass-card p-6 max-w-lg w-full animate-fade-up flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <div className="flex justify-between items-center mb-4">
          {" "}
          <h3
            className="font-bold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {showForm ? "Create Sender Identity" : "Sender Identities"}
          </h3>{" "}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>{" "}
        </div>{" "}
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {" "}
          Manage the email addresses you can send from under{" "}
          <strong>@{domain.domain}</strong>.{" "}
        </p>{" "}
        {domain.status !== "verified" && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            {" "}
            You must verify this domain before you can create sender
            emails.{" "}
          </div>
        )}{" "}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {" "}
            {error}{" "}
          </div>
        )}{" "}
        {domain.status === "verified" && !showForm && (
          <button
            className="btn-primary w-full mb-6"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} className="mr-2" /> Add Sender Identity
          </button>
        )}

        {showForm ? (
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                <input type="text" className="input" placeholder="e.g. Support Team" value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                <input type="text" className="input" placeholder="e.g. QwikMailer Support" value={fromName} onChange={e => setFromName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Email Prefix</label>
                <div className="flex items-center bg-black/5 rounded-xl px-3 border border-black/10 focus-within:ring-2 focus-within:ring-indigo-500/50">
                  <input type="text" placeholder="e.g. noreply" className="bg-transparent border-none outline-none py-2 w-full text-sm" value={prefix} onChange={e => setPrefix(e.target.value)} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>@{domain.domain}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Reply-To (Optional)</label>
                <input type="email" className="input" placeholder="reply@domain.com" value={replyTo} onChange={e => setReplyTo(e.target.value)} />
              </div>
            </div>
            
            <h4 className="font-bold text-sm mt-6 mb-2 border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}>
              Physical Mailing Address (CAN-SPAM)
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address</label>
                <input type="text" className="input" placeholder="A-12, Cyber Park" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address 2</label>
                <input type="text" className="input" placeholder="Sector 62 (Optional)" value={companyAddress2} onChange={e => setCompanyAddress2(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>City</label>
                  <input type="text" className="input" placeholder="New Delhi" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>State/Province</label>
                  <input type="text" className="input" placeholder="Delhi" value={state} onChange={e => setState(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Zip/Postal Code</label>
                  <input type="text" className="input" placeholder="110001" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Country</label>
                  <input type="text" className="input" placeholder="India" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={addSender} disabled={adding || !prefix.trim()}>
                {adding ? <RefreshCw size={14} className="animate-spin" /> : null} Create Sender
              </button>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {" "}
          {loading ? (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {" "}
              <RefreshCw size={16} className="animate-spin mx-auto mb-2" />{" "}
              Loading...{" "}
            </div>
          ) : senders.length === 0 ? (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {" "}
              No senders added yet.{" "}
            </div>
          ) : (
            senders.map((sender) => (
              <div
                key={sender.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    {" "}
                    <Mail size={14} />{" "}
                  </div>{" "}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{sender.fromName || sender.email}</span>
                    {sender.nickname && <span className="badge-info text-[10px]">{sender.nickname}</span>}
                  </div>
                  <span className="text-xs text-gray-500 truncate">{sender.email}</span>
                  {sender.companyAddress && (
                    <span className="text-[10px] text-gray-400 mt-1 truncate">
                      CAN-SPAM: {sender.city}, {sender.country}
                    </span>
                  )}
                </div>
                </div>
                <button
                  className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  onClick={() => deleteSender(sender.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        )}
      </div>{" "}
    </div>
  );
}
