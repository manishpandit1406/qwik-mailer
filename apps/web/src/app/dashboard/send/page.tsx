"use client";
import { useState, useEffect } from "react";
import { Send, Plus, X, Eye, Code2, RefreshCw } from "lucide-react";
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
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [tab, setTab] = useState<"visual" | "code">("visual");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false); // Advanced features states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"; // Load templates and senders on mount
  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("mf_access_token"); // Load templates
        fetch(`${API}/v1/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setTemplates(json.data);
          })
          .catch(console.error); // Load senders
        fetch(`${API}/v1/domains/all-senders`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              setSenders(json.data);
              if (json.data.length > 0) {
                setForm(prev => ({ ...prev, from: json.data[0].email }));
              }
            }
          })
          .catch(console.error);
      } catch (err) {
        console.error("Failed to load data:", err);
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
      const res = await fetch(`${API}/v1/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: form.to,
          from: form.from || undefined,
          fromName: form.fromName || undefined,
          replyTo: form.replyTo || undefined,
          subject: form.subject,
          html: form.html || undefined,
          text: form.text || undefined,
          tags: form.tags,
          scheduledAt:
            isScheduled && scheduledDate
              ? new Date(scheduledDate).toISOString()
              : undefined,
        }),
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
          from: "",
          fromName: "",
          replyTo: "",
          subject: "",
          html: "",
          text: "",
          tags: [],
        });
        setSelectedTemplateId("");
        setIsScheduled(false);
        setScheduledDate("");
      } else {
        setResult({
          success: false,
          message: data.error ?? "Failed to send email.",
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
  function addTag() {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag("");
    }
  }
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Compose Email
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send a single transactional or marketing email.
        </p>
      </div>
      {result && (
        <div
          className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${result.success ? "badge-success" : "badge-danger"}`}
          style={{
            background: result.success
              ? "rgba(16,185,129,0.1)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: result.success ? "#34d399" : "#f87171",
          }}
        >
          {result.message}
        </div>
      )}
      <form onSubmit={handleSend} className="glass-card p-6 space-y-5">
        {/* Template Selector */}
        {templates.length > 0 && (
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Use Saved Template
            </label>
            <select
              className="input"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="">-- Select a template (optional) --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* To */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            To
          </label>
          <input
            id="compose-to"
            className="input"
            type="email"
            placeholder="recipient@example.com"
            required
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </div>
        {/* From */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              From Email
            </label>
            <select
              id="compose-from"
              className="input"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            >
              {senders.length === 0 && <option value="">Platform Default</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.email}>
                  {s.email}
                </option>
              ))}
            </select>
          </div>
          {senders.length === 0 && (
            <>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  From Name
                </label>
                <input
                  id="compose-from-name"
                  className="input"
                  type="text"
                  placeholder="Your Company"
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Reply-To Email
                </label>
                <input
                  id="compose-reply-to"
                  className="input"
                  type="email"
                  placeholder="reply@example.com (Optional)"
                  value={form.replyTo}
                  onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                />
              </div>
            </>
          )}
        </div>
        {/* Subject */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            Subject
          </label>
          <input
            id="compose-subject"
            className="input"
            type="text"
            placeholder="Welcome to Qwik Mailer!"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>
        {/* Body tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Body
            </label>
            <div
              className="flex rounded-lg overflow-hidden border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {(["visual", "code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-xs font-medium capitalize transition-all ${tab === t ? "text-white" : ""}`}
                  style={{
                    background:
                      tab === t ? "rgba(99,102,241,0.3)" : "transparent",
                    color: tab === t ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {t === "visual" ? (
                    <>
                      <Eye size={11} className="inline mr-1" />
                      Visual
                    </>
                  ) : (
                    <>
                      <Code2 size={11} className="inline mr-1" />
                      HTML
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
          {tab === "visual" ? (
            <textarea
              id="compose-text"
              className="input resize-none font-sans"
              rows={8}
              placeholder="Write your email content here. Use {{name}}, {{otp}} for variables."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          ) : (
            <textarea
              id="compose-html"
              className="input resize-none font-mono text-xs"
              rows={10}
              placeholder={
                "<h1>Hello {{name}}!</h1>\n<p>Your OTP is <strong>{{otp}}</strong></p>"
              }
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
            />
          )}
        </div>
        {/* Tags */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            Tags <span className="normal-case font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map((tag) => (
              <span key={tag} className="badge-info flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      tags: form.tags.filter((t) => t !== tag),
                    })
                  }
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                className="input py-1 px-2 text-xs w-28"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="btn-ghost p-1.5"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
        {/* Scheduling Section */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-indigo-600"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Schedule this email for later
            </span>
          </label>
          {isScheduled && (
            <div className="animate-fade-up">
              <input
                type="datetime-local"
                className="input"
                required={isScheduled}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Select the date and time when you want this email to be sent.
              </p>
            </div>
          )}
        </div>
        {/* Submit */}
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isScheduled
              ? "Emails are queued and sent at the scheduled time."
              : "Emails are queued and processed within seconds."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!form.html && !form.text}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye size={14} /> Preview
            </button>
            <button
              id="compose-submit"
              type="submit"
              disabled={sending}
              className="btn-primary flex items-center gap-2"
            >
              {sending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} />{" "}
                  {isScheduled ? "Schedule Email" : "Send Email"}
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
                <Eye size={18} className="text-indigo-500" /> Email Preview
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
                disabled={sending}
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
