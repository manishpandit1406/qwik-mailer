"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Mail, RefreshCw, Globe, X } from "lucide-react";
import { Select } from "@/components/Select";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

export default function SendersPage() {
  const [senders, setSenders] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [expandedSender, setExpandedSender] = useState<string | null>(null);
  const [userName, setUserName] = useState("Acme Corp");
  const [userFirstName, setUserFirstName] = useState("info");
  const [teamName, setTeamName] = useState("Support");
  const { canAdmin } = useRole();

  // Form
  const [selectedDomainId, setSelectedDomainId] = useState("");
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
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resSenders, resDomains, resTeams, resMe] = await Promise.all([
        fetch(`${API}/v1/senders`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/v1/domains`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/v1/teams`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/v1/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      ]);
      const jsonSenders = await resSenders.json();
      const jsonDomains = await resDomains.json();
      const jsonTeams = await resTeams.json();
      const jsonMe = await resMe.json();
      
      let compName = "Acme";
      if (jsonMe.success && jsonMe.data.companyName) {
        compName = jsonMe.data.companyName;
      }
      
      if (jsonSenders.success) setSenders(jsonSenders.data);
      if (jsonDomains.success) {
        const verifiedDomains = (jsonDomains.data || []).filter((d: any) => d.status === "verified");
        setDomains(verifiedDomains);
      }
      if (jsonTeams.success) {
        const activeTeamId = localStorage.getItem("mf_active_team");
        const allTeams = [
          ...(jsonTeams.data.owned || []),
          ...(jsonTeams.data.member || [])
        ];
        const activeTeam = allTeams.find((t: any) => t.id === activeTeamId);
        if (activeTeam) {
          setTeamName(activeTeam.name);
          const combinedName = `${compName} ${activeTeam.name}`.trim();
          setUserName(combinedName);
          setUserFirstName(compName);
        }
      }
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function addSender() {
    setError("");
    setMsg("");
    if (!selectedDomainId || !prefix.trim()) return;
    const domain = domains.find(d => d.id === selectedDomainId);
    if (!domain) return;
    
    setAdding(true);
    if (domain.domain === "mail.qwikmailer.in") {
      if (!replyTo.trim()) {
        setError("Reply-To email is strictly required for the shared domain.");
        setAdding(false);
        return;
      }
      try {
        const res = await fetch(`${API}/v1/domains/shared/setup`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            username: prefix.trim(),
            displayName: fromName || userName,
            replyTo,
            companyAddress,
            companyAddress2,
            city,
            state,
            zipCode,
            country,
            teamId: localStorage.getItem("mf_active_team") || undefined
          }),
        });
        const json = await res.json();
        if (json.success) {
          setIsAwaitingOtp(true);
          setMsg("OTP sent to your Reply-To email!");
        } else {
          setError(json.error ?? "Failed to initiate verification.");
        }
      } catch {
        setError("Network error");
      } finally {
        setAdding(false);
      }
      return;
    }
    
    try {
      const res = await fetch(`${API}/v1/senders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          domainId: selectedDomainId,
          prefix: prefix.trim(),
          fromName,
          replyTo,
          companyAddress,
          companyAddress2,
          city,
          state,
          zipCode,
          country,
          nickname
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg("Sender identity added!");
        resetForm();
        fetchData();
      } else {
        setError(json.error ?? "Failed to add sender.");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setMsg("");
    setAdding(true);
    try {
      const res = await fetch(`${API}/v1/domains/shared/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp, replyTo }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg("Sender identity added!");
        resetForm();
        fetchData();
      } else {
        setError(json.error ?? "Invalid OTP.");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  function resetForm() {
    setSelectedDomainId("");
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
    setError("");
    setMsg("");
    setIsAwaitingOtp(false);
    setOtp("");
  }

  async function deleteSender(id: string) {
    if (!confirm("Delete this sender? Emails can no longer be sent from this address.")) return;
    setError("");
    setMsg("");
    try {
      const res = await fetch(`${API}/v1/senders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSenders(senders.filter((s) => s.id !== id));
        setMsg("Sender deleted");
      } else {
        setError(json.error || "Failed to delete");
      }
    } catch {
      setError("Network error");
    }
  }

  const selectedDomain = domains.find(d => d.id === selectedDomainId);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sender Identities</h1>
            <p className="text-gray-500 mt-1">Manage the email addresses this organization can send from.</p>
          </div>
          {!showForm && canAdmin && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Sender
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {msg && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            {msg}
          </div>
        )}

        {showForm ? (
          <div className="glass-card p-6 border border-gray-200 shadow-sm rounded-2xl animate-fade-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900">Create Sender Identity</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {domains.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm border border-amber-200">
                You do not have any verified domains. Please verify a domain in the <b>Global Domains</b> section first.
              </div>
            ) : (
              <div className="space-y-6">
                {isAwaitingOtp ? (
                  <div className="py-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-center text-gray-700">Enter Verification Code</label>
                      <input type="text" className="input text-center text-2xl tracking-[0.5em] font-mono h-14" placeholder="000000" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
                      <p className="text-sm text-gray-500 mt-3 text-center">We sent a code to <b>{replyTo}</b></p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button className="btn-secondary flex-1" onClick={() => setIsAwaitingOtp(false)}>Back</button>
                      <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={verifyOtp} disabled={adding || otp.length !== 6}>
                        {adding && <RefreshCw size={14} className="animate-spin" />} Verify & Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700">Domain</label>
                      <Select
                        value={selectedDomainId}
                        onChange={(val) => setSelectedDomainId(val)}
                        placeholder="Select a verified domain..."
                        options={domains.map((d) => ({ label: d.domain, value: d.id }))}
                      />
                    </div>

                {selectedDomainId && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">Sender Nickname</label>
                        <input type="text" className="input" placeholder={`e.g. ${selectedDomain?.domain !== "mail.qwikmailer.in" ? teamName : userName}`} value={nickname} onChange={e => setNickname(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">From Name</label>
                        <input type="text" className="input" placeholder={`e.g. ${selectedDomain?.domain !== "mail.qwikmailer.in" ? teamName : userName}`} value={fromName} onChange={e => setFromName(e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">Sender Username</label>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                          <input type="text" placeholder={selectedDomain?.domain !== "mail.qwikmailer.in" ? (teamName.toLowerCase().replace(/[^a-z0-9-]/g, '') || "info") : (userFirstName || "info")} className="w-full px-3 py-2 focus:outline-none sm:text-sm" value={prefix} onChange={e => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                          <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm py-2 whitespace-nowrap">@{selectedDomain?.domain || "domain.com"}</div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">
                          Reply-To {selectedDomain?.domain === "mail.qwikmailer.in" ? "*" : "(Optional)"}
                        </label>
                        <input type="email" className="input" placeholder="reply@domain.com" value={replyTo} onChange={e => setReplyTo(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Replies to your emails will be sent here.</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="font-bold text-sm mb-4 text-gray-900">Physical Mailing Address (CAN-SPAM)</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-600">Company Address</label>
                          <input type="text" className="input" placeholder="A-12, Cyber Park" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-gray-600">Company Address 2</label>
                          <input type="text" className="input" placeholder="Sector 62 (Optional)" value={companyAddress2} onChange={e => setCompanyAddress2(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-600">City</label>
                            <input type="text" className="input" placeholder="New Delhi" value={city} onChange={e => setCity(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-600">State/Province</label>
                            <input type="text" className="input" placeholder="Delhi" value={state} onChange={e => setState(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-600">Zip/Postal Code</label>
                            <input type="text" className="input" placeholder="110001" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-600">Country</label>
                            <input type="text" className="input" placeholder="India" value={country} onChange={e => setCountry(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                    <div className="flex gap-3 pt-4">
                      <button className="btn-secondary flex-1" onClick={resetForm}>Cancel</button>
                      <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={addSender} disabled={adding || !selectedDomainId || !prefix.trim()}>
                        {adding && <RefreshCw size={14} className="animate-spin" />} Create Sender
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                Loading senders...
              </div>
            ) : senders.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
                No sender identities configured for this organization.<br/>
                Create one to start sending emails.
              </div>
            ) : (
              senders.map((sender) => (
                <div key={sender.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedSender(expandedSender === sender.id ? null : sender.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Mail size={18} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{sender.fromName || sender.email}</span>
                          {sender.nickname && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">{sender.nickname}</span>}
                        </div>
                        <span className="text-sm text-gray-500">{sender.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 mr-2 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        <Globe size={12} /> {sender.domain?.domain}
                      </span>
                      {canAdmin && (
                        <button
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => deleteSender(sender.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedSender === sender.id && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 text-sm text-gray-600 space-y-3">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold text-gray-500">Reply-To:</span>
                        <span>{sender.replyTo || "Not configured"}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
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
      </div>
    </div>
  );
}


