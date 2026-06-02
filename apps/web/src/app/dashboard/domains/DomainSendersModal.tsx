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
  const [editingSender, setEditingSender] = useState<any>(null);
  const [editPrefix, setEditPrefix] = useState("");
  const [editFromName, setEditFromName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editReplyTo, setEditReplyTo] = useState("");
  const [isAwaitingEditOtp, setIsAwaitingEditOtp] = useState(false);
  const [editOtp, setEditOtp] = useState("");
  const [editCompanyAddress, setEditCompanyAddress] = useState("");
  const [editCompanyAddress2, setEditCompanyAddress2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZipCode, setEditZipCode] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedSender, setExpandedSender] = useState<string | null>(null);
  useEffect(() => {
    fetchSenders();
    if (showForm && domain.domain === "mail.qwikmailer.in") {
      try {
        const user = JSON.parse(localStorage.getItem("mf_user") || "{}");
        if (user.email && !replyTo) setReplyTo(user.email);
      } catch (e) {}
    }
  }, [showForm]);
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
  function startEdit(sender: any) {
    setEditingSender(sender);
    setEditPrefix(sender.email.split("@")[0]);
    setEditFromName(sender.fromName || "");
    setEditNickname(sender.nickname || "");
    setEditReplyTo(sender.replyTo || "");
    setIsAwaitingEditOtp(false);
    setEditOtp("");
    setEditCompanyAddress(sender.companyAddress || "");
    setEditCompanyAddress2(sender.companyAddress2 || "");
    setEditCity(sender.city || "");
    setEditState(sender.state || "");
    setEditZipCode(sender.zipCode || "");
    setEditCountry(sender.country || "");
    setError("");
    setMsg(null);
  }

  async function saveEdit() {
    setSavingEdit(true);
    setError("");
    setMsg(null);
    try {
      const replyToChanged = editReplyTo.trim() !== (editingSender.replyTo || "");
      
      if (replyToChanged) {
        if (!editReplyTo.trim()) {
          setError("Reply-To email cannot be empty.");
          setSavingEdit(false);
          return;
        }
        
        const res = await fetch(`${API}/v1/domains/${domain.id}/senders/${editingSender.id}/reply-to/setup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ replyTo: editReplyTo.trim() }),
        });
        const json = await res.json();
        if (json.success) {
          setIsAwaitingEditOtp(true);
          setMsg({ text: "OTP sent to new Reply-To email!", type: "success" });
        } else {
          setError(json.error || "Failed to initiate Reply-To update.");
        }
        setSavingEdit(false);
        return;
      }

      await applyPatchUpdates();
    } catch {
      setError("Network error");
      setSavingEdit(false);
    }
  }

  async function applyPatchUpdates() {
    try {
      const res = await fetch(`${API}/v1/domains/${domain.id}/senders/${editingSender.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: editPrefix.trim() !== editingSender.email.split("@")[0] ? editPrefix.trim() : undefined,
          fromName: editFromName.trim() !== (editingSender.fromName || "") ? editFromName.trim() : undefined,
          nickname: editNickname.trim() !== (editingSender.nickname || "") ? editNickname.trim() : undefined,
          companyAddress: editCompanyAddress.trim() !== (editingSender.companyAddress || "") ? editCompanyAddress.trim() : undefined,
          companyAddress2: editCompanyAddress2.trim() !== (editingSender.companyAddress2 || "") ? editCompanyAddress2.trim() : undefined,
          city: editCity.trim() !== (editingSender.city || "") ? editCity.trim() : undefined,
          state: editState.trim() !== (editingSender.state || "") ? editState.trim() : undefined,
          zipCode: editZipCode.trim() !== (editingSender.zipCode || "") ? editZipCode.trim() : undefined,
          country: editCountry.trim() !== (editingSender.country || "") ? editCountry.trim() : undefined
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingSender(null);
        await fetchSenders();
      } else {
        setError(json.error || "Failed to update sender.");
      }
    } catch {
      setError("Network error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function verifyEditOtp() {
    if (editOtp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/domains/${domain.id}/senders/${editingSender.id}/reply-to/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ otp: editOtp, replyTo: editReplyTo.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await applyPatchUpdates();
      } else {
        setError(json.error || "Invalid OTP.");
        setSavingEdit(false);
      }
    } catch {
      setError("Network error");
      setSavingEdit(false);
    }
  }

  async function addSender() {
    if (!prefix.trim()) return;
    if (domain.domain === "mail.qwikmailer.in" && !replyTo.trim()) {
      setError("Reply-To email is strictly required when using the shared domain.");
      return;
    }
    
    setAdding(true);
    setError("");
    setMsg(null);
    try {
      if (domain.domain === "mail.qwikmailer.in") {
        if (!isAwaitingOtp) {
          const res = await fetch(`${API}/v1/domains/shared/setup`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              username: prefix.trim(),
              displayName: fromName,
              replyTo,
              companyAddress,
              companyAddress2,
              city,
              state,
              zipCode,
              country,
            }),
          });
          const json = await res.json();
          if (json.success) {
            setIsAwaitingOtp(true);
            setMsg({ text: "OTP sent to your Reply-To email!", type: "success" });
          } else {
            setError(json.error || "Failed to setup sender.");
          }
          setAdding(false);
          return;
        } else {
          if (otp.length !== 6) {
            setError("Please enter the 6-digit OTP.");
            setAdding(false);
            return;
          }
          const res = await fetch(`${API}/v1/domains/shared/verify`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              otp,
              replyTo,
              nickname,
            }),
          });
          const json = await res.json();
          if (json.success) {
            resetForm();
            await fetchSenders();
          } else {
            setError(json.error || "Invalid OTP.");
          }
          setAdding(false);
          return;
        }
      }

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
        resetForm();
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

  function resetForm() {
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
    setIsAwaitingOtp(false);
    setOtp("");
    setMsg(null);
    setError("");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
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
            {error}
          </div>
        )}
        {msg && (
          <div className={`p-3 mb-4 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg.text}
          </div>
        )}{" "}
        {domain.status === "verified" && !showForm && (
          domain.domain === "mail.qwikmailer.in" && senders.length > 0 ? (
            <div className="p-3 mb-6 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm text-center">
              You can only create one sender identity on the shared domain.
            </div>
          ) : (
            <button
              className="btn-primary w-full mb-6 flex items-center justify-center"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} className="mr-2" /> Add Sender Identity
            </button>
          )
        )}

        
        {editingSender ? (
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            {isAwaitingEditOtp ? (
              <div className="text-center py-6">
                <h3 className="text-lg font-bold mb-1">Verify new Reply-To</h3>
                <p className="text-gray-500 text-sm mb-6">
                  We sent a 6-digit verification code to<br/>
                  <span className="font-semibold text-gray-800">{editReplyTo}</span>
                </p>
                <div className="max-w-[240px] mx-auto">
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="------"
                    maxLength={6}
                    value={editOtp}
                    onChange={(e) => setEditOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="btn-secondary flex-1" onClick={() => setIsAwaitingEditOtp(false)}>Cancel</button>
                  <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={verifyEditOtp} disabled={savingEdit}>
                    {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : null} Verify & Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="font-bold mb-4">Edit Sender Identity</h4>
                
                <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                <input type="text" className="input" placeholder="e.g. Support Team" value={editNickname} onChange={e => setEditNickname(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                <input type="text" className="input" placeholder="e.g. Acme Corp" value={editFromName} onChange={e => setEditFromName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Username</label>
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                  <input type="text" placeholder="yourcompany" className="w-full px-3 py-2 focus:outline-none sm:text-sm" value={editPrefix} onChange={e => setEditPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm py-2 whitespace-nowrap">@{domain.domain}</div>
                </div>
                {editingSender.usernameEditCount > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Note: You have already edited your username {editingSender.usernameEditCount} times. Further edits are subject to rate limits.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  Reply-To
                </label>
                <input type="email" className="input" placeholder="reply@domain.com" value={editReplyTo} onChange={e => setEditReplyTo(e.target.value)} />
                <p className="text-[10px] text-gray-500 mt-1">If changed, you will need to verify the new email with an OTP.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-bold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Physical Mailing Address (CAN-SPAM)</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address</label>
                  <input type="text" className="input" placeholder="A-12, Cyber Park" value={editCompanyAddress} onChange={e => setEditCompanyAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address 2</label>
                  <input type="text" className="input" placeholder="Sector 62 (Optional)" value={editCompanyAddress2} onChange={e => setEditCompanyAddress2(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>City</label>
                    <input type="text" className="input" placeholder="New Delhi" value={editCity} onChange={e => setEditCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>State/Province</label>
                    <input type="text" className="input" placeholder="Delhi" value={editState} onChange={e => setEditState(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Zip/Postal Code</label>
                    <input type="text" className="input" placeholder="110001" value={editZipCode} onChange={e => setEditZipCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Country</label>
                    <input type="text" className="input" placeholder="India" value={editCountry} onChange={e => setEditCountry(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="btn-secondary flex-1" onClick={() => { setEditingSender(null); setError(""); }}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
            </>
          )}
          </div>
        ) : showForm ? (
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            {isAwaitingOtp ? (
              <div className="text-center py-6">
                <h3 className="text-lg font-bold mb-1">Verify your email</h3>
                <p className="text-gray-500 text-sm mb-6">
                  We sent a 6-digit verification code to<br/>
                  <span className="font-semibold text-gray-800">{replyTo}</span>
                </p>
                <div className="max-w-[240px] mx-auto">
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                <input type="text" className="input" placeholder="e.g. Support Team" value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                <input type="text" className="input" placeholder="e.g. QwikMailer Support" value={fromName} onChange={e => setFromName(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Username</label>
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                  <input type="text" placeholder="yourcompany" className="w-full px-3 py-2 focus:outline-none sm:text-sm" value={prefix} onChange={e => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm py-2 whitespace-nowrap">@{domain.domain}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  Reply-To {domain.domain === "mail.qwikmailer.in" ? "*" : "(Optional)"}
                </label>
                <input type="email" className="input" placeholder="reply@domain.com" required={domain.domain === "mail.qwikmailer.in"} value={replyTo} onChange={e => setReplyTo(e.target.value)} />
                <p className="text-[10px] text-gray-500 mt-1">Replies to your emails will be sent here.</p>
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
            </>
            )}

            <div className="flex gap-3 pt-4">
              {!isAwaitingOtp && (
                <button className="btn-secondary flex-1" onClick={() => resetForm()}>Cancel</button>
              )}
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={addSender} disabled={adding || !prefix.trim()}>
                {adding ? <RefreshCw size={14} className="animate-spin" /> : null} {isAwaitingOtp ? "Verify & Save" : "Continue"}
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
              <div key={sender.id} className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50 transition-colors"
                  onClick={() => setExpandedSender(expandedSender === sender.id ? null : sender.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Mail size={14} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{sender.fromName || sender.email}</span>
                        {sender.nickname && <span className="badge-info text-[10px]">{sender.nickname}</span>}
                      </div>
                      <span className="text-xs text-gray-500 truncate">{sender.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                      onClick={() => {
                        setEditingSender(sender);
                        setEditNickname(sender.nickname || "");
                        setEditFromName(sender.fromName || "");
                        setEditPrefix(sender.email.split("@")[0]);
                        setShowForm(false);
                      }}
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      onClick={() => deleteSender(sender.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400" onClick={() => setExpandedSender(expandedSender === sender.id ? null : sender.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${expandedSender === sender.id ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                  </div>
                </div>
                {expandedSender === sender.id && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-white/50 text-xs text-gray-600 space-y-2">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-semibold text-gray-500">Reply-To:</span>
                      <span>{sender.replyTo || "Not configured"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-semibold text-gray-500">CAN-SPAM:</span>
                      <span>
                        {sender.companyAddress ? (
                          `${sender.companyAddress}${sender.companyAddress2 ? `, ${sender.companyAddress2}` : ""}, ${sender.city}, ${sender.state} ${sender.zipCode}, ${sender.country}`
                        ) : (
                          "Not configured"
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>{" "}
    </div>
  );
}
