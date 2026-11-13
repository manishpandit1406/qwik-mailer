"use client";

import React, { useState, useEffect } from "react";
import {
  Inbox as InboxIcon,
  Send,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  Mail,
  Paperclip,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Eye,
  MousePointerClick,
  Reply,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";

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

interface Account {
  id: string;
  provider: string;
  emailAddress: string;
  isActive: boolean;
}

interface EmailItem {
  uid: string;
  subject: string;
  from?: string;
  fromName?: string;
  to?: string;
  date: string;
  flags?: string[];
  status?: string;
  openCount?: number;
  clickCount?: number;
}

export default function DashboardInboxPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("team");
  const [folder, setFolder] = useState<"INBOX" | "sent" | "starred" | "trash">("INBOX");
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Email Details
  const [selectedEmailUid, setSelectedEmailUid] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);

  // AI & Reply Features
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  // Connect Account Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectProvider, setConnectProvider] = useState<"gmail" | "outlook" | "custom">("gmail");
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [connectImapHost, setConnectImapHost] = useState("imap.gmail.com");
  const [connectImapPort, setConnectImapPort] = useState(993);
  const [connectSmtpHost, setConnectSmtpHost] = useState("smtp.gmail.com");
  const [connectSmtpPort, setConnectSmtpPort] = useState(465);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Quick Compose Modal
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingCompose, setSendingCompose] = useState(false);
  const [composeError, setComposeError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [selectedAccountId, folder]);

  async function fetchAccounts() {
    try {
      const res = await fetch(`${API}/v1/inbox/accounts`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const data = await res.json();
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && selectedAccountId === "team") {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchEmails() {
    setLoading(true);
    setSelectedEmail(null);
    setSelectedEmailUid(null);

    let folderQuery = "INBOX";
    if (folder === "sent") folderQuery = "[Gmail]/Sent Mail";
    else if (folder === "starred") folderQuery = "[Gmail]/Starred";
    else if (folder === "trash") folderQuery = "[Gmail]/Trash";

    try {
      const accParam = selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}&folder=${encodeURIComponent(folderQuery)}` : `?folder=${encodeURIComponent(folderQuery)}`;
      const res = await fetch(`${API}/v1/inbox/emails${accParam}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const data = await res.json();
      if (data.emails && Array.isArray(data.emails)) {
        setEmails(data.emails);
      } else {
        setEmails([]);
      }
    } catch (e) {
      console.error(e);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function openEmail(uid: string) {
    setSelectedEmailUid(uid);
    setBodyLoading(true);
    setAiSummary("");
    setAiReplies([]);
    setReplyText("");
    setReplySuccess(false);

    let folderQuery = "INBOX";
    if (folder === "sent") folderQuery = "[Gmail]/Sent Mail";
    else if (folder === "starred") folderQuery = "[Gmail]/Starred";
    else if (folder === "trash") folderQuery = "[Gmail]/Trash";

    try {
      const res = await fetch(
        `${API}/v1/inbox/email?accountId=${encodeURIComponent(selectedAccountId)}&uid=${encodeURIComponent(uid)}&folder=${encodeURIComponent(folderQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "x-team-id": getTeamId(),
          },
        }
      );
      const data = await res.json();
      if (data.success && data.email) {
        setSelectedEmail(data.email);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBodyLoading(false);
    }
  }

  async function handleConnectAccount(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectError("");

    try {
      let imapHost = connectImapHost;
      let imapPort = Number(connectImapPort) || 993;
      let smtpHost = connectSmtpHost;
      let smtpPort = Number(connectSmtpPort) || 465;

      if (connectProvider === "gmail") {
        imapHost = "imap.gmail.com";
        imapPort = 993;
        smtpHost = "smtp.gmail.com";
        smtpPort = 465;
      } else if (connectProvider === "outlook") {
        imapHost = "outlook.office365.com";
        imapPort = 993;
        smtpHost = "smtp.office365.com";
        smtpPort = 587;
      }

      const res = await fetch(`${API}/v1/inbox/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          provider: connectProvider,
          emailAddress: connectEmail.trim(),
          appPassword: connectPassword.trim(),
          imapHost,
          imapPort,
          smtpHost,
          smtpPort,
        }),
      });

      const data = await res.json();
      if (data.success && data.account) {
        setAccounts((prev) => [...prev, data.account]);
        setSelectedAccountId(data.account.id);
        setShowConnectModal(false);
        setConnectEmail("");
        setConnectPassword("");
      } else {
        setConnectError(data.error || "Failed to connect account.");
      }
    } catch (err: any) {
      setConnectError(err.message || "Failed to connect account.");
    } finally {
      setConnecting(false);
    }
  }

  async function generateAiSummary() {
    if (!selectedEmail || (!selectedEmail.text && !selectedEmail.html)) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/v1/inbox/ai-summary`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          content: selectedEmail.text || selectedEmail.html,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateAiReplies() {
    if (!selectedEmail || (!selectedEmail.text && !selectedEmail.html)) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/v1/inbox/ai-reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          content: selectedEmail.text || selectedEmail.html,
          subject: selectedEmail.subject,
        }),
      });
      const data = await res.json();
      if (data.replies && Array.isArray(data.replies)) {
        setAiReplies(data.replies);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedEmail) return;
    setSendingReply(true);
    try {
      const res = await fetch(`${API}/v1/inbox/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          to: selectedEmail.from || selectedEmail.to,
          subject: selectedEmail.subject?.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject || ""}`,
          text: replyText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplySuccess(true);
        setReplyText("");
        setTimeout(() => setReplySuccess(false), 4000);
      } else {
        alert(data.error || "Failed to send reply");
      }
    } catch (e) {
      console.error(e);
      alert("Network error sending reply");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleQuickCompose(e: React.FormEvent) {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;
    setSendingCompose(true);
    setComposeError("");
    try {
      const res = await fetch(`${API}/v1/inbox/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowComposeModal(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        fetchEmails();
      } else {
        setComposeError(data.error || "Failed to send email");
      }
    } catch (e: any) {
      console.error(e);
      setComposeError(e.message || "Network error sending email");
    } finally {
      setSendingCompose(false);
    }
  }

  const filteredEmails = emails.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.subject?.toLowerCase().includes(q) ||
      item.from?.toLowerCase().includes(q) ||
      item.fromName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-140px)] flex flex-col space-y-4 pb-6 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inbox</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Sync
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Unified inbox for customer conversations, replies, and team emails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Selector */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="input text-xs font-medium py-2 pl-3 pr-8 rounded-xl bg-white shadow-sm"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.emailAddress} ({acc.provider})
                </option>
              ))}
              <option value="team">Team Outbound Emails</option>
            </select>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
            title="Connect Email Account"
          >
            <Plus size={14} /> Connect Account
          </button>

          <button
            onClick={fetchEmails}
            className="btn-secondary p-2 flex items-center justify-center rounded-xl"
            title="Refresh inbox"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowComposeModal(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl font-medium shadow-sm"
          >
            <Send size={13} /> Compose
          </button>
        </div>
      </div>

      {/* Main Mail Container (3-Column Layout) */}
      <div className="glass-card flex-1 rounded-2xl overflow-hidden flex border border-gray-200 shadow-sm min-h-0">
        {/* Left Folder Nav */}
        <div className="w-48 border-r border-gray-200/80 bg-gray-50/50 p-3 space-y-1 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <button
              onClick={() => setFolder("INBOX")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "INBOX"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <InboxIcon size={15} className={folder === "INBOX" ? "text-indigo-600" : "text-gray-400"} />
                <span>Inbox</span>
              </div>
              {emails.length > 0 && folder === "INBOX" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  {emails.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFolder("sent")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "sent"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Send size={15} className={folder === "sent" ? "text-indigo-600" : "text-gray-400"} />
              <span>Sent</span>
            </button>

            <button
              onClick={() => setFolder("starred")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "starred"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Star size={15} className={folder === "starred" ? "text-amber-500" : "text-gray-400"} />
              <span>Starred</span>
            </button>

            <button
              onClick={() => setFolder("trash")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "trash"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Trash2 size={15} className={folder === "trash" ? "text-red-500" : "text-gray-400"} />
              <span>Trash</span>
            </button>
          </div>

          {/* Account info pill */}
          <div className="p-2.5 bg-white border border-gray-200/80 rounded-xl text-xs">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Mailbox</div>
            <div className="font-semibold text-gray-900 truncate mt-0.5">
              {accounts.find((a) => a.id === selectedAccountId)?.emailAddress || "Team Mailbox"}
            </div>
          </div>
        </div>

        {/* Center Thread List Column */}
        <div className="w-80 md:w-96 border-r border-gray-200/80 flex flex-col bg-white shrink-0 min-h-0">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/30">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-xs pl-8 py-1.5 w-full bg-white"
              />
            </div>
          </div>

          {/* Thread Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-indigo-500" />
                Loading conversations...
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <InboxIcon size={24} className="mx-auto mb-2 text-gray-300" />
                No messages in this folder.
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedEmailUid === item.uid;
                return (
                  <button
                    key={item.uid}
                    onClick={() => openEmail(item.uid)}
                    className={`w-full text-left p-3.5 transition-colors block ${
                      isSelected
                        ? "bg-indigo-50/60 border-l-4 border-indigo-600"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-gray-900 truncate flex-1">
                        {item.fromName || item.from || item.to || "Unknown Sender"}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-gray-800 truncate mb-0.5">
                      {item.subject || "(No subject)"}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                      {item.openCount && item.openCount > 0 ? (
                        <span className="text-blue-600 font-medium flex items-center gap-0.5">
                          <Eye size={10} /> Opened
                        </span>
                      ) : null}
                      {item.status && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-semibold uppercase text-[9px]">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail / Reader Column */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
          {bodyLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LogoLoader fullPage text="Loading message..." />
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 shrink-0 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">
                      {selectedEmail.subject || "(No Subject)"}
                    </h2>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        <strong>From:</strong> {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                      </div>
                      <div>
                        <strong>To:</strong> {selectedEmail.to}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>

                  {/* AI Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateAiSummary}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={13} /> {aiLoading ? "Thinking..." : "AI Summary"}
                    </button>
                    <button
                      onClick={generateAiReplies}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={13} /> Smart Replies
                    </button>
                  </div>
                </div>

                {/* AI Summary Card */}
                {aiSummary && (
                  <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100 text-xs text-indigo-950 animate-fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900 mb-1">
                      <Sparkles size={13} className="text-indigo-600" /> AI Conversation Summary
                    </div>
                    <p className="leading-relaxed">{aiSummary}</p>
                  </div>
                )}

                {/* AI Reply Pills */}
                {aiReplies.length > 0 && (
                  <div className="mt-3.5 space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Suggested Quick Responses:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiReplies.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => setReplyText(reply)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-700 font-medium shadow-sm transition-all text-left"
                        >
                          "{reply}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <div
                  className="prose max-w-none text-sm text-gray-800 font-normal leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html || `<p>${selectedEmail.text || ""}</p>` }}
                />

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Attachments ({selectedEmail.attachments.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-center gap-2"
                        >
                          <Paperclip size={13} className="text-gray-400" />
                          <span className="font-medium text-gray-700">{att.filename}</span>
                          <span className="text-[10px] text-gray-400">({Math.round((att.size || 0) / 1024)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Section */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
                {replySuccess && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 size={14} /> Reply sent successfully!
                  </div>
                )}
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={`Reply to ${selectedEmail.from || selectedEmail.to}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="input w-full text-xs p-3 rounded-xl bg-white shadow-sm resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">
                      Sent from {accounts.find((a) => a.id === selectedAccountId)?.emailAddress || "default sender"}
                    </span>
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyText.trim()}
                      className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl font-medium shadow-sm"
                    >
                      <Reply size={13} /> {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <Mail size={36} className="text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">No conversation selected</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Choose an email from the list on the left to read, summarize with AI, and send quick replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Connect Email Mailbox</h3>
              <button onClick={() => setShowConnectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(["gmail", "outlook", "custom"] as const).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setConnectProvider(prov)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    connectProvider === prov ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>

            {connectError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {connectError}
              </div>
            )}

            <form onSubmit={handleConnectAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={connectEmail}
                  onChange={(e) => setConnectEmail(e.target.value)}
                  required
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {connectProvider === "gmail" ? "Gmail App Password (16 chars)" : "Password / App Password"}
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={connectPassword}
                  onChange={(e) => setConnectPassword(e.target.value)}
                  required
                  className="input w-full text-xs"
                />
                {connectProvider === "gmail" && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Generate an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google Account Security</a>.
                  </p>
                )}
              </div>

              {connectProvider === "custom" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">IMAP Host</label>
                    <input
                      type="text"
                      value={connectImapHost}
                      onChange={(e) => setConnectImapHost(e.target.value)}
                      className="input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">SMTP Host</label>
                    <input
                      type="text"
                      value={connectSmtpHost}
                      onChange={(e) => setConnectSmtpHost(e.target.value)}
                      className="input w-full text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  {connecting ? "Testing Connection..." : "Connect Mailbox"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">New Message</h3>
              <button onClick={() => setShowComposeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {composeError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {composeError}
              </div>
            )}

            <form onSubmit={handleQuickCompose} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Email Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
                <textarea
                  rows={8}
                  placeholder="Write your email message..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  className="input w-full text-xs font-mono resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingCompose}
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  <Send size={13} /> {sendingCompose ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

