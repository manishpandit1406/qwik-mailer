"use client";
import { useState, useEffect } from "react";
import { Send, Plus, X, Eye, Code2, RefreshCw, Upload, Mail as MailIcon, Users, Award } from "lucide-react";
import { Select } from "@/components/Select";
import * as XLSX from "xlsx";
import { BulkUploadWizard } from "@/components/BulkUploadWizard";
import { useRole } from "@/lib/useRole";
interface Template {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: string[];
}
export default function SendEmailPage() {
  const [form, setForm] = useState({
    to: "",
    from: "",
    fromName: "",
    replyTo: "",
    subject: "",
    html: "",
    text: "",
  });
  const [sendMode, setSendMode] = useState<"single" | "bulk_upload">("single");
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [tab, setTab] = useState<"visual" | "code">("visual");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    issues?: string[];
    suggestions?: string[];
    spamScore?: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false); // Advanced features states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [sendersLoaded, setSendersLoaded] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string; size: number }[]>([]);
  const [certificates, setCertificates] = useState<{ id: string; name: string }[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const { isViewer } = useRole();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (attachments.length + files.length > 5) {
      alert("Maximum 5 attachments allowed.");
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const base64 = result.split(',')[1];
          setAttachments(prev => [...prev, {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            content: base64,
            size: file.size
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"; // Load templates and senders on mount
  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("mf_access_token");
        const teamId = localStorage.getItem("mf_active_team") || "";
        
        // Load templates
        fetch(`${API}/v1/templates`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "x-team-id": teamId 
          },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setTemplates(json.data);
          })
          .catch(console.error);
        
        // Load senders
        fetch(`${API}/v1/senders`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "x-team-id": teamId
          },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              setSenders(json.data);
              if (json.data.length > 0) {
                setForm(prev => ({ ...prev, from: json.data[0].email }));
              }
            }
            setSendersLoaded(true);
          })
          .catch((err) => {
            console.error(err);
            setSendersLoaded(true);
          });
        // Load certificates
        fetch(`${API}/v1/certificates`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "x-team-id": teamId
          },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setCertificates(json.data);
          })
          .catch(console.error);



      } catch (err) {
        console.error("Failed to load data:", err);
        setSendersLoaded(true);
      }
    }
    loadData();
  }, []);
  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setForm((prev) => ({ ...prev, subject: "", html: "", text: "" }));
      return;
    }
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setForm((prev) => ({
        ...prev,
        subject: found.subject || "",
        html: found.htmlBody || "",
        text: found.textBody || "",
      }));
      setTab(found.htmlBody ? "code" : "visual");
    }
  }
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const token = localStorage.getItem("mf_access_token");
      const teamId = localStorage.getItem("mf_active_team") || "";
      
      const endpoint = sendMode === "bulk_upload" ? "/v1/bulk-send" : "/v1/send";
      let payload: any = {};
      
      const commonData = {
        from: form.from || undefined,
        fromName: form.fromName || undefined,
        replyTo: form.replyTo || undefined,
        subject: form.subject,
        html: form.html || undefined,
        text: form.text || undefined,
        templateId: selectedTemplateId || undefined,
        metadata: selectedCertificateId ? { certificateId: selectedCertificateId } : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        scheduledAt: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      };

      if (sendMode === "bulk_upload") {
        const tags = bulkTags.split(",").map(t => t.trim()).filter(t => t);
        payload = {
          emails: parsedContacts.map((contact: any) => ({
             ...commonData,
             to: contact.email,
             tags,
             variables: contact
          }))
        };
      } else {
        payload = {
          ...commonData,
          to: form.to,
        };
      }

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-team-id": teamId,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: isScheduled
            ? "Email scheduled successfully!"
            : "Email queued successfully!",
        });
        setForm({
          to: "",
          from: senders.length > 0 ? senders[0].email : "",
          fromName: "",
          replyTo: "",
          subject: "",
          html: "",
          text: "",
        });
        setAttachments([]);
        setSelectedTemplateId("");
        setSelectedCertificateId("");
        setIsScheduled(false);
        setScheduledDate("");
      } else {
        setResult({
          success: false,
          message: data.error ?? "Failed to send email.",
          issues: data.issues,
          suggestions: data.suggestions,
          spamScore: data.spamScore,
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Network error. Is the API running?",
      });
    } finally {
      setSending(false);
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validContacts = data.filter((row: any) => {
        const email = (row["email"] || row["Email"] || row["EMAIL"] || row["e-mail"] || "").toString().trim();
        return email && emailRegex.test(email);
      }).map((row: any) => ({
        ...row,
        email: (row["email"] || row["Email"] || row["EMAIL"] || row["e-mail"] || "").toString().trim(),
        name: (row["first_name"] || row["firstName"] || row["Name"] || row["name"] || row["FullName"] || "").toString().trim()
      }));
      
      setParsedContacts(validContacts);
    };
    reader.readAsBinaryString(file);
  };

  if (sendMode === "bulk_upload") {
    return <BulkUploadWizard onSwitchToSingle={() => setSendMode("single")} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-10">
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Compose Email
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send a single transactional email, or a bulk campaign to your audience.
        </p>
      </div>
      
      <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-sm">
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all bg-white text-gray-900 shadow-sm`}
        >
          <MailIcon size={16} /> Single Email
        </button>
        <button
          onClick={() => setSendMode("bulk_upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all text-gray-500 hover:text-gray-700`}
        >
          <Users size={16} /> Bulk Campaign
        </button>
      </div>
      {result && (
        <div
          className={`px-4 py-3 rounded-xl text-sm flex flex-col gap-2 ${result.success ? "badge-success" : "badge-danger"}`}
          style={{
            background: result.success
              ? "rgba(16,185,129,0.1)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: result.success ? "#34d399" : "#f87171",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{result.message}</span>
            <button
              onClick={() => setResult(null)}
              style={{
                color: result.success ? "#10b981" : "#ef4444",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
          {result.issues && result.issues.length > 0 && (
            <div className="mt-1">
              <strong className="block mb-1">Issues Found:</strong>
              <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                {result.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="mt-1">
              <strong className="block mb-1">Suggestions:</strong>
              <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                {result.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-6">
        {!sendersLoaded ? (
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center animate-pulse">
            Loading sender identities...
          </div>
        ) : senders.length === 0 ? (
          <div className="p-4 rounded-xl text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            <div className="font-semibold mb-1">Sender Identity Required</div>
            <p>You must create a sender identity before you can send emails.</p>
            <a href="/dashboard/senders" className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
              Create Sender Identity
            </a>
          </div>
        ) : null}

        {/* Envelope Metadata Box */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* To Row */}
          <div className="flex items-center border-b border-gray-100 px-4 py-3">
            <label className="text-gray-400 font-medium text-sm w-16 shrink-0">To:</label>
            <input
              id="compose-to"
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300"
              type="email"
              placeholder="recipient@example.com"
              required
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </div>

          {/* From Row */}
          <div className="flex items-center border-b border-gray-100 px-4 py-3">
            <label className="text-gray-400 font-medium text-sm w-16 shrink-0">From:</label>
            <div className="flex-1 flex items-center gap-3">
              <input
                className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300 w-48"
                type="text"
                placeholder="Name (e.g. Rahul)"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              />
              <span className="text-gray-300 text-sm">via</span>
              <select
                className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-2 py-1 outline-none text-gray-700 hover:border-gray-300 transition-colors"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
              >
                {senders.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}
              </select>
            </div>
          </div>

          {/* Reply-To Row */}
          <div className="flex items-center px-4 py-3">
            <label className="text-gray-400 font-medium text-sm w-20 shrink-0">Reply-To:</label>
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300"
              type="email"
              placeholder="support@example.com (Optional)"
              value={form.replyTo}
              onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
            />
          </div>
        </div>

        {/* Editor Box */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-gray-900 focus-within:border-gray-900 transition-all">
          {/* Subject */}
          <input
            id="compose-subject"
            className="w-full bg-transparent border-b border-gray-100 outline-none text-lg font-semibold text-gray-800 placeholder-gray-300 px-6 py-4"
            type="text"
            placeholder="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />

          {/* Editor Format Toggle */}
          <div className="flex justify-between items-center px-6 py-2 bg-gray-50/50 border-b border-gray-100">
            <div className="flex rounded-lg overflow-hidden bg-gray-200/50 p-1">
              {(["visual", "code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {t === "visual" ? (
                    <><Eye size={12} className="inline mr-1" /> Visual</>
                  ) : (
                    <><Code2 size={12} className="inline mr-1" /> HTML</>
                  )}
                </button>
              ))}
            </div>
            
            {templates.length > 0 && (
              <select
                className="bg-transparent border-none outline-none text-xs text-gray-900 font-medium cursor-pointer"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Use a Template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Editor Body */}
          {tab === "visual" ? (
            <textarea
              id="compose-text"
              className="w-full h-80 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300 px-6 py-4 resize-y font-sans"
              placeholder="Write your email here..."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          ) : (
            <textarea
              id="compose-html"
              className="w-full h-80 bg-slate-50/50 text-slate-700 border-none outline-none text-xs placeholder-gray-400 px-6 py-4 resize-y font-mono shadow-inner"
              placeholder="<h1>Hello!</h1>"
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
            />
          )}

          {/* Attachments Area (Inside Editor) */}
          <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                <Upload size={16} /> Attach Files
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              
              {certificates.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Award size={16} />
                  <select
                    className="bg-transparent border-none outline-none font-medium cursor-pointer hover:text-gray-900"
                    value={selectedCertificateId}
                    onChange={(e) => setSelectedCertificateId(e.target.value)}
                  >
                    <option value="">Attach Certificate...</option>
                    {certificates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(0)}kb</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Submit Footer */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              Schedule for later
            </label>
            {isScheduled && (
              <input
                type="datetime-local"
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-900 transition-colors shadow-sm"
                required={isScheduled}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!form.html && !form.text}
              className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Preview
            </button>
            <button
              id="compose-submit"
              type="submit"
              disabled={sending || isViewer || !form.to || !form.subject || (!form.text && !form.html)}
              className="bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              {sending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} /> {isScheduled ? "Schedule" : "Send Now"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 lg:left-60 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-md w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Eye size={18} className="text-gray-900" /> Email Preview
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 :bg-white/10 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-gray-500 font-medium">To:</span>
                <span className="text-gray-800">
                  {form.to || "(Recipient)"}
                </span>
                <span className="text-gray-500 font-medium">From:</span>
                <span className="text-gray-800">
                  {form.fromName
                    ? `${form.fromName} <${form.from || "default"}>`
                    : form.from || "Default Sender"}
                </span>
                <span className="text-gray-500 font-medium">Subject:</span>
                <span className="font-semibold text-gray-900">
                  {form.subject || "(No Subject)"}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0 bg-white">
              {form.html ? (
                <iframe
                  srcDoc={form.html}
                  className="w-full h-[500px] border-none bg-white"
                  title="Email Preview"
                />
              ) : (
                <div className="p-6 whitespace-pre-wrap font-sans text-gray-800 h-[500px] overflow-auto">
                  {form.text || "Empty email body"}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary"
              >
                {" "}
                Close Preview{" "}
              </button>
              <button
                onClick={(e) => {
                  setShowPreview(false);
                  handleSend(e as any);
                }}
                disabled={sending || isViewer}
                className="btn-primary flex items-center gap-2"
              >
                <Send size={14} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
