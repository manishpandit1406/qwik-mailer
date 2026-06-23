"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileSpreadsheet, Send, CheckCircle2, XCircle, AlertTriangle, Users, Eye, ChevronRight, Download, Info, X, Mail as MailIcon, Award } from "lucide-react";
import * as XLSX from "xlsx";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Recipient { name: string; email: string;[key: string]: string; }
interface PreviewError { row: number; reason: string; data: Record<string, string>; }
interface PreviewData {
  total: number; valid: number; invalid: number;
  recipients: Recipient[]; errors: PreviewError[]; columns: string[];
  allFileRecipients?: Recipient[];
}

type Step = "audience" | "preview" | "compose" | "sending" | "done";

export function BulkUploadWizard({ onSwitchToSingle }: { onSwitchToSingle?: () => void }) {
  const [step, setStep] = useState<Step>("audience");

  // Tag Selection State
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Preview
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"recipients" | "errors">("recipients");

  // Compose
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [useHtml, setUseHtml] = useState(true);

  // Options
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string; size: number }[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  // Send Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  function getToken() { return localStorage.getItem("mf_access_token") ?? ""; }
  function getTeamId() { return localStorage.getItem("mf_active_team") ?? ""; }

  useEffect(() => {
    async function loadData() {
      try {
        const token = getToken();
        const teamId = getTeamId();
        const headers = { Authorization: `Bearer ${token}`, "x-team-id": teamId };

        fetch(`${API}/v1/templates`, { headers }).then(r => r.json()).then(j => { if (j.success) setTemplates(j.data); }).catch(console.error);
        fetch(`${API}/v1/senders`, { headers }).then(r => r.json()).then(j => {
          if (j.success) {
            setSenders(j.data);
            if (j.data.length > 0 && !fromEmail) setFromEmail(j.data[0].email);
          }
        }).catch(console.error);
        fetch(`${API}/v1/certificates`, { headers }).then(r => r.json()).then(j => { if (j.success) setCertificates(j.data); }).catch(console.error);
        fetch(`${API}/v1/contacts/tags`, { headers }).then(r => r.json()).then(j => { if (j.success) setAllTags(j.data); }).catch(console.error);
      } catch (err) { console.error("Failed to load data:", err); }
    }
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 5) return alert("Maximum 5 attachments allowed.");
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return alert(`File ${file.name} is too large. Maximum size is 5MB.`);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const base64 = result.split(',')[1];
          setAttachments(prev => [...prev, { filename: file.name, contentType: file.type || "application/octet-stream", content: base64, size: file.size }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) { setSubject(""); setHtmlBody(""); setTextBody(""); return; }
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setSubject(found.subject || ""); setHtmlBody(found.htmlBody || ""); setTextBody(found.textBody || ""); setUseHtml(!!found.htmlBody);
    }
  }

  async function handlePreview() {
    if (selectedTags.length === 0) {
      setStep("compose");
      return;
    }
    setLoading(true); setError("");

    let tagRecipients: Recipient[] = [];
    let tagTotal = 0;

    if (selectedTags.length > 0) {
      try {
        const res = await fetch(`${API}/v1/contacts?limit=100&tags=${encodeURIComponent(selectedTags.join(","))}`, {
          headers: { Authorization: `Bearer ${getToken()}`, "x-team-id": getTeamId() }
        });
        const json = await res.json();
        if (json.success) {
          tagTotal = json.meta?.total || 0;
          tagRecipients = json.data.map((c: any) => {
            const rec: any = {
              email: c.email,
              name: c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : "",
            };
            return { ...rec, ...(c.customFields || {}) };
          });
        }
      } catch (err) {
        console.error("Failed to fetch tag contacts", err);
      }
    }

    let columns = ["email", "name"];
    if (tagRecipients.length > 0) {
      const customKeys = new Set<string>();
      tagRecipients.forEach((r: any) => {
        Object.keys(r).forEach(k => {
          const lowerK = k.toLowerCase();
          if (!["email", "e-mail", "name", "first_name", "firstname", "fullname", "last_name", "lastname"].includes(lowerK)) {
            customKeys.add(k);
          }
        });
      });
      columns = [...columns, ...Array.from(customKeys)];
    }
    setPreview({ total: tagTotal, valid: tagTotal, invalid: 0, recipients: tagRecipients, allFileRecipients: [], errors: [], columns });
    setStep("preview");
    setLoading(false);
  }

  async function handleSend() {
    if (!subject.trim() || (!htmlBody.trim() && !textBody.trim())) return setError("Subject and body are required.");
    setLoading(true); setError(""); setStep("sending");

    try {
      const commonData = {
        from: fromEmail || undefined,
        fromName: fromName || undefined,
        subject,
        html: useHtml ? htmlBody : undefined,
        text: useHtml ? undefined : textBody,
        templateId: selectedTemplateId || undefined,
        metadata: selectedCertificateId ? { certificateId: selectedCertificateId } : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        scheduledAt: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      };

      const payload = {
        ...commonData,
        emails: [],
        audienceTags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      const res = await fetch(`${API}/v1/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, "x-team-id": getTeamId() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? "Failed to send.");
        setStep("compose");
        setLoading(false);
        return;
      }

      setResult(json);
      setStep("done");
    } catch (err) {
      setError("Network error. Please try again.");
      setStep("compose");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("audience");
    setSelectedTags([]); setPreview(null);
    setSubject(""); setHtmlBody(""); setTextBody(""); setResult(null);
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Compose Email</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Send a single transactional email, or a bulk campaign to your audience.</p>
        </div>

        {step !== "audience" && step !== "done" && (
          <button onClick={() => { if (confirm("Cancel current campaign?")) reset(); }} className="btn-secondary whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2">
            <X size={14} /> Cancel
          </button>
        )}
      </div>

      <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-sm mb-8">
        <button
          onClick={() => onSwitchToSingle?.()}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all text-gray-500 hover:text-gray-700"
        >
          <MailIcon size={16} /> Single Email
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all bg-white text-gray-900 shadow-sm"
        >
          <Users size={16} /> Bulk Campaign
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {(["audience", "preview", "compose", "done"] as const).map((s, i) => {
          const labels = ["Audience", "Preview", "Compose", "Send"];
          const steps: Step[] = ["audience", "preview", "compose", "done"];
          const idx = steps.indexOf(step);
          const isActive = step === s;
          const isDone = idx > i;
          let circleClasses = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors";
          if (isDone) circleClasses += " bg-emerald-500 border-emerald-500 text-white";
          else if (isActive) circleClasses += " bg-gray-900 border-gray-900 text-white";
          else circleClasses += " bg-gray-100 border-gray-300 text-gray-400";
          let lineClasses = "flex-1 h-0.5 mx-2 mb-5 transition-colors";
          if (isDone) lineClasses += " bg-emerald-500";
          else lineClasses += " bg-gray-200";
          let textClasses = "text-[11px] whitespace-nowrap " + (isActive ? "text-gray-900 font-semibold" : "text-gray-400 font-normal");

          // Render Preview step for both now!
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={circleClasses}>{isDone ? <CheckCircle2 size={16} /> : (i + 1)}</div>
                <span className={textClasses}>{labels[i]}</span>
              </div>
              {i < 3 && <div className={lineClasses} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="text-sm text-red-600 font-medium flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Audience ── */}
      {step === "audience" && (
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-sm">
            <label className="block text-sm font-bold text-gray-900 mb-2">Select Contacts via CRM Tags</label>
            <MultiSelect
              values={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select contact tags..."
              options={allTags.map(t => ({ label: t, value: t }))}
            />
            <p className="text-xs text-gray-500 mt-2">Emails will be sent to all contacts in your CRM that have any of these tags.</p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => handlePreview()}
              disabled={selectedTags.length === 0 || loading}
              className={`flex w-full items-center justify-center gap-2 py-3.5 px-8 rounded-xl text-base font-semibold transition-all ${selectedTags.length > 0 ? "bg-gray-900 hover:bg-black text-white shadow-md" : "bg-gray-200 text-gray-400"}`}
            >
              {loading ? "Processing..." : "Preview Audience & Continue"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview (Only for CSV) ── */}
      {step === "preview" && preview && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-sm border-l-4 border-l-indigo-500">
              <div className="text-xs font-semibold text-gray-500 mb-2">Total Rows</div>
              <div className="text-3xl font-extrabold text-gray-900">{preview.total}</div>
            </div>
            <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-xs font-semibold text-gray-500 mb-2">Valid Emails</div>
              <div className="text-3xl font-extrabold text-emerald-500">{preview.valid}</div>
            </div>
            <div className={`p-5 rounded-lg bg-white border border-gray-200 shadow-sm border-l-4 ${preview.invalid > 0 ? "border-l-amber-500" : "border-l-emerald-500"}`}>
              <div className="text-xs font-semibold text-gray-500 mb-2">Invalid / Skipped</div>
              <div className={`text-3xl font-extrabold ${preview.invalid > 0 ? "text-amber-500" : "text-emerald-500"}`}>{preview.invalid}</div>
            </div>
          </div>

          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button onClick={() => setActiveTab("recipients")} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === "recipients" ? "border-gray-900 text-gray-900 bg-gray-100" : "border-transparent text-gray-500"}`}>Recipients ({preview.valid})</button>
              <button onClick={() => setActiveTab("errors")} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === "errors" ? "border-amber-500 text-amber-600 bg-amber-50" : "border-transparent text-gray-500"}`}>Issues ({preview.invalid})</button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", textAlign: "left" }}>
                    <th style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>#</th>
                    <th style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>Name</th>
                    <th style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>Email</th>
                    {activeTab === "recipients" && preview.columns.filter(c => !["name", "Name", "email", "Email", "EMAIL", "NAME", "email_address", "full_name"].includes(c)).map(c => (
                      <th key={c} style={{ padding: "10px 16px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{c}</th>
                    ))}
                    {activeTab === "errors" && <th style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>Error Reason</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "recipients"
                    ? preview.recipients.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5", color: "var(--text-muted)" }}>{i + 1}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5" }}>{r.name || "-"}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5", color: "#818cf8" }}>{r.email}</td>
                        {preview.columns.filter(c => !["name", "Name", "email", "Email", "EMAIL", "NAME", "email_address", "full_name"].includes(c)).map(c => (
                          <td key={c} style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{r[c] || "-"}</td>
                        ))}
                      </tr>
                    ))
                    : preview.errors.slice(0, 100).map((e, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5" }}>Row {e.row}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5" }}>-</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5" }}>{(e.data as any).email || "-"}</td>
                        <td style={{ padding: "8px 16px", borderBottom: "1px solid #f5f5f5", color: "#f59e0b" }}>{e.reason}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              {(activeTab === "recipients" ? preview.valid : preview.invalid) > 100 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">Showing first 100 rows</div>
              )}
            </div>
          </div>

          <button onClick={() => setStep("compose")} disabled={preview.valid === 0} className="flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl text-base font-semibold transition-all bg-gray-900 hover:bg-black text-white shadow-md">
            Continue to Compose <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── STEP 3: Compose ── */}
      {step === "compose" && (
        <div className="flex flex-col gap-6">
          {/* Envelope Metadata Box */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* From Row */}
            <div className="flex items-center border-b border-gray-100 px-4 py-3">
              <label className="text-gray-400 font-medium text-sm w-16 shrink-0">From:</label>
              <div className="flex-1 flex items-center gap-3">
                <input
                  className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300 w-48"
                  type="text"
                  placeholder="Name (e.g. Rahul)"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
                <span className="text-gray-300 text-sm">via</span>
                <select
                  className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-2 py-1 outline-none text-gray-700 hover:border-gray-300 transition-colors"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                >
                  {senders.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}
                </select>
              </div>
            </div>

            {/* To Row (Display only for Bulk) */}
            <div className="flex items-center px-4 py-3 bg-gray-50/50">
              <label className="text-gray-400 font-medium text-sm w-16 shrink-0">To:</label>
              <div className="flex gap-2 flex-wrap text-sm text-gray-600 font-medium">
                {selectedTags.length > 0 && (
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                    {selectedTags.length} Tag{selectedTags.length > 1 ? 's' : ''}
                  </span>
                )}
                {preview?.valid ? (
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                    {preview.valid} Uploaded
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Editor Box */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-gray-900 focus-within:border-gray-900 transition-all">
            {/* Subject */}
            <input
              className="w-full bg-transparent border-b border-gray-100 outline-none text-lg font-semibold text-gray-800 placeholder-gray-300 px-6 py-4"
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />

            {/* Editor Format Toggle */}
            <div className="flex justify-between items-center px-6 py-2 bg-gray-50/50 border-b border-gray-100">
              <div className="flex rounded-lg overflow-hidden bg-gray-200/50 p-1">
                <button
                  onClick={() => setUseHtml(true)}
                  className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-all ${useHtml ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <Eye size={12} className="inline mr-1" /> HTML / Visual
                </button>
                <button
                  onClick={() => setUseHtml(false)}
                  className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-all ${!useHtml ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Text Only
                </button>
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
            {useHtml ? (
              <textarea
                className="w-full h-80 bg-slate-50/50 text-slate-700 border-none outline-none text-xs placeholder-gray-400 px-6 py-4 resize-y font-mono shadow-inner"
                placeholder="<h1>Hello {{name}},</h1>..."
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
              />
            ) : (
              <textarea
                className="w-full h-80 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-300 px-6 py-4 resize-y font-sans"
                placeholder="Hello {{name}},..."
                value={textBody}
                onChange={e => setTextBody(e.target.value)}
              />
            )}

            {/* Variables Help */}
            {preview?.columns && preview.columns.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Available Variables</div>
                <div className="flex gap-2 flex-wrap">
                  {preview.columns.map((col) => (
                    <code key={col} className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-900 border border-gray-200">
                      {`{{${col}}}`}
                    </code>
                  ))}
                </div>
              </div>
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
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                />
                Schedule Campaign
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

            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              {loading ? "Queuing..." : isScheduled ? "Schedule Campaign" : "Queue Campaign Now"} <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === "done" && (
        <div className="text-center bg-white p-10 rounded-2xl border border-gray-200 shadow-sm animate-fade-up max-w-xl mx-auto mt-8">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-gray-900/20">
            <Send size={28} className="text-white ml-1" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Queued Successfully!</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            Your emails have been securely added to the queue. You can track their live delivery progress on your dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-sm"
            >
              View Live Progress
            </button>
            <button
              onClick={reset}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 px-6 rounded-xl transition-colors"
            >
              Send Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
