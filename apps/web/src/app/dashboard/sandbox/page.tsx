"use client";
import { useState, useEffect, useCallback } from "react";
import {
  FlaskConical,
  RefreshCw,
  Trash2,
  Eye,
  Monitor,
  Smartphone,
  Code,
  List,
  Paperclip,
  Mail,
  ChevronLeft,
  ChevronRight,
  Search,
  ToggleLeft,
  ToggleRight,
  Inbox,
} from "lucide-react";
import { formatIST } from "@/lib/dateUtils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getHeaders() {
  const token = typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
  const teamId = typeof window !== "undefined" ? (localStorage.getItem("mf_active_team") ?? "") : "";
  return {
    Authorization: `Bearer ${token}`,
    "X-Team-ID": teamId,
    "Content-Type": "application/json",
  };
}

interface SandboxEmail {
  id: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  replyTo?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  rawHeaders?: Record<string, string>;
  attachments?: Array<{ filename: string; contentType: string; size: number; content: string }>;
  metadata?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  expiresAt: string;
}

type PreviewMode = "desktop" | "mobile" | "html" | "text" | "headers" | "attachments";

export default function SandboxPage() {
  const [sandboxMode, setSandboxMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emails, setEmails] = useState<SandboxEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SandboxEmail | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);
  const limit = 20;

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/v1/sandbox/settings`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setSandboxMode(json.data.sandboxMode);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {}
  }, []);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API}/v1/sandbox/emails`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      const res = await fetch(url.toString(), { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setEmails(json.data.items);
        setTotal(json.data.total);
      }
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchSettings();
    fetchEmails();
  }, [fetchSettings, fetchEmails]);

  async function toggleSandbox() {
    setToggling(true);
    try {
      const newVal = !sandboxMode;
      const res = await fetch(`${API}/v1/sandbox/settings`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ sandboxMode: newVal }),
      });
      const json = await res.json();
      if (json.success) {
        setSandboxMode(json.data.sandboxMode);
      } else {
        console.error("Sandbox toggle failed:", json);
        alert(json.error ?? "Failed to toggle sandbox mode");
      }
    } catch (e) {
      console.error("Toggle sandbox error:", e);
    }
    setToggling(false);
  }

  async function openEmail(email: SandboxEmail) {
    if (!email.isRead) {
      await fetch(`${API}/v1/sandbox/emails/${email.id}/read`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    const res = await fetch(`${API}/v1/sandbox/emails/${email.id}`, { headers: getHeaders() });
    const json = await res.json();
    if (json.success) {
      setSelectedEmail(json.data);
      setPreviewMode("desktop");
    }
  }

  async function deleteEmail(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch(`${API}/v1/sandbox/emails/${id}`, { method: "DELETE", headers: getHeaders() });
    setEmails((prev) => prev.filter((em) => em.id !== id));
    setTotal((t) => t - 1);
    if (selectedEmail?.id === id) setSelectedEmail(null);
  }

  async function clearInbox() {
    if (!confirm("Clear all sandbox emails? This cannot be undone.")) return;
    setClearing(true);
    await fetch(`${API}/v1/sandbox/emails`, { method: "DELETE", headers: getHeaders() });
    setEmails([]);
    setTotal(0);
    setSelectedEmail(null);
    setUnreadCount(0);
    setClearing(false);
  }

  const totalPages = Math.ceil(total / limit) || 1;

  const filteredEmails = search
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(search.toLowerCase()) ||
          e.toEmail.toLowerCase().includes(search.toLowerCase()) ||
          e.fromEmail.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  return (
    // h-screen minus topbar (64px) minus page padding (48px top+bottom on lg = p-6*2)
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 64px - 48px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Test Inbox
            </h2>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Capture emails without delivering them — like Mailtrap
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchSettings(); fetchEmails(); }}
            className="btn-ghost p-2"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          {emails.length > 0 && (
            <button
              onClick={clearInbox}
              disabled={clearing}
              className="btn-secondary flex items-center gap-1.5 text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 size={13} /> Clear Inbox
            </button>
          )}
          {/* Sandbox Toggle on page */}
          <button
            onClick={toggleSandbox}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              sandboxMode
                ? "bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600"
                : "bg-gray-900 text-white hover:bg-gray-700"
            }`}
          >
            {toggling ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : sandboxMode ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            {sandboxMode ? "Sandbox ON" : "Sandbox OFF"}
          </button>
        </div>
      </div>

      {/* Sandbox Mode Banner */}
      {sandboxMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium shrink-0">
          <FlaskConical size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Sandbox Mode is Active</strong> — Emails are being captured here instead of delivered to recipients. No SES credits are consumed.
          </span>
        </div>
      )}

      {/* Split Pane */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Left: Email List */}
        <div className="flex flex-col w-80 shrink-0 glass-card overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                className="input w-full pl-8 h-9 text-sm"
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Loading...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">
                  {sandboxMode ? "No emails captured yet" : "Sandbox is OFF"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {sandboxMode
                    ? "Send an email via API or SMTP to capture it here"
                    : "Toggle Sandbox ON from the sidebar"}
                </p>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                    selectedEmail?.id === email.id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                  }`}
                >
                  {!email.isRead && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        To: {email.toName ? `${email.toName} <${email.toEmail}>` : email.toEmail}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        From: {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap" suppressHydrationWarning>
                        {formatIST(email.createdAt, false)}
                      </span>
                      <button
                        onClick={(e) => deleteEmail(email.id, e)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{total} emails</span>
              <div className="flex gap-1">
                <button className="btn-ghost p-1.5" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                <button className="btn-ghost p-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview Pane */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden min-w-0">
          {!selectedEmail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Eye size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">Select an email to preview</p>
              </div>
            </div>
          ) : (
            <>
              {/* Email Header Info */}
              <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{selectedEmail.subject}</h3>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      <p><span className="font-medium text-gray-700">From:</span> {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail}</p>
                      <p><span className="font-medium text-gray-700">To:</span> {selectedEmail.toName ? `${selectedEmail.toName} <${selectedEmail.toEmail}>` : selectedEmail.toEmail}</p>
                      {selectedEmail.replyTo && <p><span className="font-medium text-gray-700">Reply-To:</span> {selectedEmail.replyTo}</p>}
                      <p suppressHydrationWarning><span className="font-medium text-gray-700">Received:</span> {formatIST(selectedEmail.createdAt, true)}</p>
                      <p><span className="font-medium text-gray-700">Expires:</span> {new Date(selectedEmail.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteEmail(selectedEmail.id, e)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    title="Delete email"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Preview Tab Bar */}
              <div className="flex border-b border-gray-100 px-5 gap-0 shrink-0 overflow-x-auto">
                {(
                  [
                    { id: "desktop", label: "Desktop", icon: <Monitor size={12} /> },
                    { id: "mobile", label: "Mobile", icon: <Smartphone size={12} /> },
                    { id: "html", label: "HTML", icon: <Code size={12} /> },
                    { id: "text", label: "Text", icon: <List size={12} /> },
                    { id: "headers", label: "Headers", icon: <Mail size={12} /> },
                    ...(selectedEmail.attachments && selectedEmail.attachments.length > 0
                      ? [{ id: "attachments", label: `Files (${selectedEmail.attachments.length})`, icon: <Paperclip size={12} /> }]
                      : []),
                  ] as { id: PreviewMode; label: string; icon: React.ReactNode }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPreviewMode(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2"
                    style={{
                      borderBottomColor: previewMode === tab.id ? "var(--accent)" : "transparent",
                      color: previewMode === tab.id ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto bg-gray-100">
                {(previewMode === "desktop" || previewMode === "mobile") && selectedEmail.htmlBody && (
                  <div className={`mx-auto transition-all duration-300 h-full ${previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"}`}>
                    <div className={`bg-white ${previewMode === "mobile" ? "rounded-2xl my-4 shadow-xl overflow-hidden border border-gray-200" : "h-full"}`}>
                      {previewMode === "mobile" && (
                        <div className="bg-gray-900 px-4 py-2 flex items-center justify-center">
                          <div className="w-16 h-1 bg-gray-600 rounded-full" />
                        </div>
                      )}
                      <iframe
                        srcDoc={selectedEmail.htmlBody}
                        className="w-full border-0"
                        style={{ height: previewMode === "mobile" ? "600px" : "calc(100vh - 280px)" }}
                        sandbox="allow-same-origin"
                        title="Email Preview"
                      />
                    </div>
                  </div>
                )}

                {(previewMode === "desktop" || previewMode === "mobile") && !selectedEmail.htmlBody && (
                  <div className="p-6 max-w-2xl mx-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-6 rounded-xl border border-gray-200">
                      {selectedEmail.textBody || "(No content)"}
                    </pre>
                  </div>
                )}

                {previewMode === "html" && (
                  <div className="p-4 h-full">
                    <pre
                      className="text-xs font-mono text-gray-800 bg-white p-6 rounded-xl border border-gray-200 overflow-auto h-full whitespace-pre-wrap leading-relaxed"
                      style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}
                    >
                      {selectedEmail.htmlBody || "(No HTML body)"}
                    </pre>
                  </div>
                )}

                {previewMode === "text" && (
                  <div className="p-4">
                    <pre className="text-sm font-mono text-gray-700 bg-white p-6 rounded-xl border border-gray-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEmail.textBody || "(No text body)"}
                    </pre>
                  </div>
                )}

                {previewMode === "headers" && (
                  <div className="p-4">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Header</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {Object.entries({
                            "From": selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail,
                            "To": selectedEmail.toName ? `${selectedEmail.toName} <${selectedEmail.toEmail}>` : selectedEmail.toEmail,
                            ...(selectedEmail.replyTo ? { "Reply-To": selectedEmail.replyTo } : {}),
                            "Subject": selectedEmail.subject,
                            ...selectedEmail.rawHeaders,
                          }).map(([key, value]) => (
                            <tr key={key} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">{key}</td>
                              <td className="px-4 py-3 text-xs text-gray-700 font-mono break-all">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {previewMode === "attachments" && (
                  <div className="p-4 space-y-3">
                    {selectedEmail.attachments?.map((att, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Paperclip size={16} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{att.filename}</p>
                            <p className="text-xs text-gray-500">{att.contentType} · {(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a
                          href={`data:${att.contentType};base64,${att.content}`}
                          download={att.filename}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
