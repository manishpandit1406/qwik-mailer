"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radio,
  ArrowLeft,
  Users,
  Send,
  Eye,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Code2,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Select } from "@/components/Select";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("mf_access_token") ?? ""
    : "";
}

function getTeamId() {
  return typeof window !== "undefined"
    ? localStorage.getItem("mf_active_team") ?? ""
    : "";
}

export default function NewBroadcastPage() {
  const router = useRouter();

  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [subject, setSubject] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Audience
  const [audienceType, setAudienceType] = useState<"list" | "file">("list");
  const [contactLists, setContactLists] = useState<{ id: string; name: string; contactCount?: number }[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [fileRecipients, setFileRecipients] = useState<{ email: string; name?: string; variables?: any }[]>([]);
  const [fileName, setFileName] = useState("");

  // Content
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [editorTab, setEditorTab] = useState<"visual" | "code" | "preview">("visual");

  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");

  // Send state
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const headers = {
        Authorization: `Bearer ${getToken()}`,
        "x-team-id": getTeamId(),
      };

      // 1. Senders
      const sendersRes = await fetch(`${API}/v1/senders`, { headers });
      const sendersJson = await sendersRes.json();
      if (sendersJson.success && Array.isArray(sendersJson.data)) {
        setSenders(sendersJson.data);
        if (sendersJson.data.length > 0) {
          setFromEmail(sendersJson.data[0].email);
        }
      }

      // 2. Lists / Audiences
      const listsRes = await fetch(`${API}/v1/lists`, { headers });
      const listsJson = await listsRes.json();
      if (listsJson.success && Array.isArray(listsJson.data)) {
        setContactLists(listsJson.data);
        if (listsJson.data.length > 0) {
          setSelectedListId(listsJson.data[0].id);
        }
      }

      // 3. Templates
      const templatesRes = await fetch(`${API}/v1/templates`, { headers });
      const templatesJson = await templatesRes.json();
      if (templatesJson.success && Array.isArray(templatesJson.data)) {
        setTemplates(templatesJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSenders(false);
    }
  }

  function handleTemplateSelect(tmplId: string) {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!subject) setSubject(tmpl.subject || "");
      setHtmlContent(tmpl.htmlBody || "");
      setTextContent(tmpl.textBody || "");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const parsed = data
          .map((row) => {
            const emailKey = Object.keys(row).find((k) =>
              /email/i.test(k)
            );
            const nameKey = Object.keys(row).find((k) =>
              /name|first/i.test(k)
            );
            const emailVal = emailKey ? String(row[emailKey]).trim() : "";
            const nameVal = nameKey ? String(row[nameKey]).trim() : undefined;
            return {
              email: emailVal,
              name: nameVal,
              variables: row,
            };
          })
          .filter((r) => r.email && r.email.includes("@"));

        setFileRecipients(parsed);
      } catch (err) {
        alert("Failed to parse file. Please upload a valid CSV or Excel file.");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleSendBroadcast() {
    setError("");
    setSending(true);

    try {
      const payload: any = {
        subject: subject.trim(),
        from: fromEmail,
        fromName: fromName.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
        html: htmlContent,
        text: textContent || undefined,
        scheduledAt:
          scheduleMode === "later" && scheduledDate
            ? new Date(scheduledDate).toISOString()
            : undefined,
      };

      if (audienceType === "list") {
        payload.audience = { listId: selectedListId };
      } else {
        payload.recipients = fileRecipients;
      }

      const res = await fetch(`${API}/v1/broadcasts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/broadcasts");
        }, 1500);
      } else {
        setError(json.error ?? "Failed to send broadcast.");
      }
    } catch (e: any) {
      setError(e.message || "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-16 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/broadcasts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Broadcasts
        </Link>
        <span className="text-xs font-medium text-gray-400">Step {step} of 4</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Create New Broadcast
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Design and broadcast an email campaign to your audience with Resend-style delivery.
        </p>
      </div>

      {/* Progress Tabs */}
      <div className="flex items-center border-b border-gray-200">
        {[
          { num: 1, label: "1. Details" },
          { num: 2, label: "2. Audience" },
          { num: 3, label: "3. Content" },
          { num: 4, label: "4. Review & Send" },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num as any)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              step === s.num
                ? "border-indigo-600 text-indigo-600"
                : step > s.num
                ? "border-transparent text-gray-900"
                : "border-transparent text-gray-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Broadcast created successfully! Redirecting...</span>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <h2 className="text-base font-bold text-gray-900">Broadcast Settings</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Subject Line *
            </label>
            <input
              type="text"
              placeholder="e.g. Introducing our new product update 🚀"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input w-full text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                From Sender *
              </label>
              {senders.length > 0 ? (
                <Select
                  value={fromEmail}
                  onChange={(v) => setFromEmail(v)}
                  options={senders.map((s) => ({ label: s.email, value: s.email }))}
                />
              ) : (
                <div className="text-xs text-red-500 p-2 bg-red-50 rounded-lg">
                  No verified sender identities found. Please create one in Sender Identities.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                From Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Septet Labs"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Reply-To Address (Optional)
            </label>
            <input
              type="email"
              placeholder="support@company.com"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              className="input w-full"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (!subject.trim()) {
                  alert("Please enter a subject line.");
                  return;
                }
                setStep(2);
              }}
              className="btn-primary px-6 py-2.5 rounded-xl font-medium"
            >
              Continue to Audience &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h2 className="text-base font-bold text-gray-900">Select Target Audience</h2>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setAudienceType("list")}
              className={`p-4 rounded-xl border text-left transition-all ${
                audienceType === "list"
                  ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Users size={20} className={audienceType === "list" ? "text-indigo-600" : "text-gray-400"} />
              <p className="font-semibold text-sm text-gray-900 mt-2">Saved Audience</p>
              <p className="text-xs text-gray-500">Pick an existing contact list</p>
            </button>

            <button
              type="button"
              onClick={() => setAudienceType("file")}
              className={`p-4 rounded-xl border text-left transition-all ${
                audienceType === "file"
                  ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Upload size={20} className={audienceType === "file" ? "text-indigo-600" : "text-gray-400"} />
              <p className="font-semibold text-sm text-gray-900 mt-2">CSV / Excel File</p>
              <p className="text-xs text-gray-500">Upload a spreadsheet</p>
            </button>
          </div>

          {audienceType === "list" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Choose Contact List
              </label>
              {contactLists.length > 0 ? (
                <div className="space-y-2 max-w-lg">
                  {contactLists.map((list) => (
                    <label
                      key={list.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedListId === list.id
                          ? "border-indigo-600 bg-indigo-50/30 font-semibold"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="list"
                          checked={selectedListId === list.id}
                          onChange={() => setSelectedListId(list.id)}
                          className="accent-indigo-600"
                        />
                        <span className="text-sm text-gray-900">{list.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">List audience</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 text-xs text-gray-500 max-w-md">
                  No contact lists found. You can switch to CSV upload above, or create a list in Contacts.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-lg">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Upload Recipients File (CSV or XLSX)
              </label>
              <div className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer relative bg-gray-50/50">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet size={32} className="mx-auto text-indigo-500 mb-2" />
                <p className="text-sm font-semibold text-gray-900">
                  {fileName ? fileName : "Click or drag spreadsheet here"}
                </p>
                <p className="text-xs text-gray-400 mt-1">Must include an "email" column</p>
              </div>

              {fileRecipients.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
                  <span>Parsed <strong>{fileRecipients.length}</strong> valid recipients</span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="btn-primary px-6 py-2.5 rounded-xl font-medium"
            >
              Continue to Content &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Content */}
      {step === 3 && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Email Message</h2>
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Template:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="input py-1 text-xs"
                >
                  <option value="">None (Custom)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setEditorTab("visual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                editorTab === "visual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              HTML Editor
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                editorTab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              <Eye size={13} className="inline mr-1" /> Live Preview
            </button>
          </div>

          {editorTab === "visual" ? (
            <div className="space-y-4">
              <textarea
                rows={14}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Write your email content in HTML or plain text... Personalize with {{name}} or {{email}}"
                className="input w-full font-mono text-sm leading-relaxed"
              />
              <p className="text-xs text-gray-400">
                Tip: You can use personalization tags like <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{{name}}"}</code> or <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{{email}}"}</code> in your content.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl p-6 bg-white min-h-[350px]">
              <div className="mb-4 pb-3 border-b border-gray-100 text-xs text-gray-400">
                <strong>Subject:</strong> {subject || "(No subject)"}
              </div>
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html:
                    htmlContent ||
                    "<p class='text-gray-400 italic'>No content written yet.</p>",
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button onClick={() => setStep(2)} className="btn-secondary px-4 py-2 text-sm">
              &larr; Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="btn-primary px-6 py-2.5 rounded-xl font-medium"
            >
              Review & Schedule &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Send */}
      {step === 4 && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h2 className="text-base font-bold text-gray-900">Review & Send Broadcast</h2>

          {/* Summary Box */}
          <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-200/50">
              <span className="text-gray-500">Subject</span>
              <strong className="text-gray-900">{subject}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/50">
              <span className="text-gray-500">From</span>
              <span className="text-gray-900 font-mono text-xs">{fromName ? `${fromName} <${fromEmail}>` : fromEmail}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/50">
              <span className="text-gray-500">Target Audience</span>
              <span className="text-gray-900 font-medium">
                {audienceType === "list" ? "Selected Audience List" : `${fileRecipients.length} file recipients`}
              </span>
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Send Timing
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="timing"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                  className="accent-indigo-600"
                />
                <span>Send Immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="timing"
                  checked={scheduleMode === "later"}
                  onChange={() => setScheduleMode("later")}
                  className="accent-indigo-600"
                />
                <span>Schedule for Later</span>
              </label>
            </div>

            {scheduleMode === "later" && (
              <div className="pt-2 max-w-xs">
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <button onClick={() => setStep(3)} className="btn-secondary px-4 py-2 text-sm">
              &larr; Back
            </button>
            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-md"
            >
              {sending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Dispatching Broadcast...
                </>
              ) : (
                <>
                  <Send size={15} /> {scheduleMode === "now" ? "Send Broadcast Now" : "Schedule Broadcast"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

