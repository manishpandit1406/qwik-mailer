"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Inbox as InboxIcon,
  Send,
  Star,
  RefreshCw,
  Search,
  Mail,
  Paperclip,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ShieldCheck,
  Eye,
  Reply,
  ArrowLeft,
  ArrowRight,
  Plus,
  UserCheck,
  AtSign,
  Layers,
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

interface SenderIdentity {
  id: string;
  email: string;
  fromName: string;
  replyTo?: string;
  nickname?: string;
  domain?: string;
  isVerified?: boolean;
  createdAt?: string;
}

interface EmailItem {
  uid: string;
  subject: string;
  from?: string;
  fromName?: string;
  to?: string;
  replyTo?: string;
  date: string;
  flags?: string[];
  status?: string;
  openCount?: number;
  clickCount?: number;
  isStarred?: boolean;
  direction?: "inbound" | "outbound";
}

export default function DashboardInboxPage() {
  // Identities
  const [identities, setIdentities] = useState<SenderIdentity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<SenderIdentity | null>(null);
  const [loadingIdentities, setLoadingIdentities] = useState(true);

  // Mailbox Folders & Items
  const [folder, setFolder] = useState<"INBOX" | "sent" | "received" | "starred">("INBOX");
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

  // Quick Compose Modal
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingCompose, setSendingCompose] = useState(false);
  const [composeError, setComposeError] = useState("");

  // Switch identity dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchIdentities();
  }, []);

  useEffect(() => {
    if (selectedIdentity) {
      fetchEmails();
    }
  }, [selectedIdentity, folder]);

  async function fetchIdentities() {
    setLoadingIdentities(true);
    try {
      const res = await fetch(`${API}/v1/inbox/identities`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const data = await res.json();
      if (data.identities && Array.isArray(data.identities)) {
        setIdentities(data.identities);

        // Check if there was a previously remembered identity
        const savedId = typeof window !== "undefined" ? localStorage.getItem("qwik_inbox_identity_id") : null;
        if (savedId) {
          const match = data.identities.find((i: SenderIdentity) => i.id === savedId);
          if (match) {
            setSelectedIdentity(match);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIdentities(false);
    }
  }

  function handleSelectIdentity(identity: SenderIdentity) {
    setSelectedIdentity(identity);
    setShowDropdown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("qwik_inbox_identity_id", identity.id);
    }
  }

  function handleBackToIdentities() {
    setSelectedIdentity(null);
    setSelectedEmail(null);
    setSelectedEmailUid(null);
    setShowDropdown(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("qwik_inbox_identity_id");
    }
  }

  async function fetchEmails() {
    if (!selectedIdentity) return;
    setLoading(true);
    setSelectedEmail(null);
    setSelectedEmailUid(null);

    try {
      const res = await fetch(
        `${API}/v1/inbox/emails?identityId=${encodeURIComponent(selectedIdentity.id)}&folder=${encodeURIComponent(folder)}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "x-team-id": getTeamId(),
          },
        }
      );
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

    try {
      const res = await fetch(`${API}/v1/inbox/email?uid=${encodeURIComponent(uid)}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
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

  async function toggleStar(e: React.MouseEvent, uid: string, currentlyStarred: boolean) {
    e.stopPropagation();
    try {
      await fetch(`${API}/v1/inbox/star`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({ uid, starred: !currentlyStarred }),
      });
      setEmails((prev) =>
        prev.map((item) => (item.uid === uid ? { ...item, isStarred: !currentlyStarred } : item))
      );
    } catch (e) {
      console.error(e);
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
    if (!replyText.trim() || !selectedEmail || !selectedIdentity) return;
    setSendingReply(true);
    try {
      const toRecipient =
        selectedEmail.from && selectedEmail.from !== selectedIdentity.email
          ? selectedEmail.from
          : selectedEmail.to;

      const res = await fetch(`${API}/v1/inbox/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          "x-team-id": getTeamId(),
        },
        body: JSON.stringify({
          identityId: selectedIdentity.id,
          to: toRecipient,
          subject: selectedEmail.subject?.startsWith("Re:")
            ? selectedEmail.subject
            : `Re: ${selectedEmail.subject || ""}`,
          text: replyText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplySuccess(true);
        setReplyText("");
        setTimeout(() => setReplySuccess(false), 4000);
        fetchEmails();
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
    if (!composeTo || !composeSubject || !selectedIdentity) return;
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
          identityId: selectedIdentity.id,
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
      item.fromName?.toLowerCase().includes(q) ||
      item.to?.toLowerCase().includes(q)
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 1: IDENTITY SELECTION SCREEN (When no identity is picked)
  // ───────────────────────────────────────────────────────────────────────────
  if (!selectedIdentity) {
    return (
      <div className="max-w-6xl mx-auto w-full py-6 px-4 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                <InboxIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inbox Mailboxes</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a sender identity to open its dedicated inbox for sending, receiving, and tracking emails.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/senders"
            className="btn-secondary self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl"
          >
            <Plus size={14} /> New Sender Identity
          </Link>
        </div>

        {/* Loading State */}
        {loadingIdentities ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <RefreshCw size={24} className="animate-spin text-black mb-3" />
            <p className="text-xs text-gray-400 font-medium">Loading sender identities...</p>
          </div>
        ) : identities.length === 0 ? (
          /* Empty State: No Sender Identity Found */
          <div className="glass-card rounded-3xl p-12 text-center max-w-lg mx-auto border border-gray-200 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Mail size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">No Sender Identities Found</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Before you can use the inbox to send and receive emails, you need to create a sender identity under your verified domain.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/senders"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl"
              >
                <Plus size={14} /> Create Sender Identity
              </Link>
            </div>
          </div>
        ) : (
          /* Grid of Available Sender Identities */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Choose an Identity ({identities.length})
              </h2>
              <span className="text-xs text-gray-400">1-click to open conversation mailbox</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {identities.map((identity) => {
                const initial = (identity.fromName || identity.email || "Q").charAt(0).toUpperCase();
                return (
                  <div
                    key={identity.id}
                    onClick={() => handleSelectIdentity(identity)}
                    className="glass-card rounded-2xl p-5 border border-gray-200/90 hover:border-black/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4 bg-white"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                          {initial}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck size={11} /> Verified
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-black transition-colors">
                          {identity.fromName}
                        </h3>
                        <p className="text-xs font-mono text-gray-600 mt-0.5 truncate select-all">
                          {identity.email}
                        </p>
                      </div>

                      {identity.replyTo && identity.replyTo !== identity.email && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span>Reply-To:</span>
                          <span className="text-gray-600 truncate">{identity.replyTo}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-900 group-hover:text-black">
                      <span>Open Identity Mailbox</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED IDENTITY INBOX SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-140px)] flex flex-col space-y-4 pb-6 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToIdentities}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Back to all identities"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                {selectedIdentity.fromName}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                Active Identity
              </span>
            </div>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              {selectedIdentity.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Identity Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl"
            >
              <AtSign size={13} className="text-gray-500" />
              <span className="max-w-[140px] truncate">{selectedIdentity.fromName}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50 animate-fade-in space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
                  Switch Mailbox
                </div>
                {identities.map((idnt) => (
                  <button
                    key={idnt.id}
                    onClick={() => handleSelectIdentity(idnt)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col transition-colors ${
                      idnt.id === selectedIdentity.id
                        ? "bg-black text-white font-semibold"
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    <span>{idnt.fromName}</span>
                    <span className={`text-[10px] font-mono truncate ${idnt.id === selectedIdentity.id ? "text-gray-300" : "text-gray-400"}`}>
                      {idnt.email}
                    </span>
                  </button>
                ))}
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={handleBackToIdentities}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:text-black hover:bg-gray-50 flex items-center gap-1.5 font-medium"
                  >
                    <Layers size={13} /> View All Identities
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchEmails}
            className="btn-secondary p-2 flex items-center justify-center rounded-xl"
            title="Refresh mailbox"
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
      <div className="glass-card flex-1 rounded-2xl overflow-hidden flex border border-gray-200 shadow-sm min-h-0 bg-white">
        {/* Left Column: Folder Navigation */}
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
                <InboxIcon size={15} className={folder === "INBOX" ? "text-black" : "text-gray-400"} />
                <span>All Mail</span>
              </div>
              {emails.length > 0 && folder === "INBOX" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
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
              <Send size={15} className={folder === "sent" ? "text-black" : "text-gray-400"} />
              <span>Sent</span>
            </button>

            <button
              onClick={() => setFolder("received")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "received"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Mail size={15} className={folder === "received" ? "text-black" : "text-gray-400"} />
              <span>Received</span>
            </button>

            <button
              onClick={() => setFolder("starred")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                folder === "starred"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Star size={15} className={folder === "starred" ? "text-amber-500 fill-amber-500" : "text-gray-400"} />
              <span>Starred</span>
            </button>
          </div>

          {/* Active Sender Identity Pill */}
          <div className="p-3 bg-white border border-gray-200/90 rounded-2xl text-xs shadow-xs space-y-1">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sending As</div>
            <div className="font-bold text-gray-900 truncate">
              {selectedIdentity.fromName}
            </div>
            <div className="text-[11px] font-mono text-gray-500 truncate select-all">
              {selectedIdentity.email}
            </div>
          </div>
        </div>

        {/* Center Thread List Column */}
        <div className="w-80 md:w-96 border-r border-gray-200/80 flex flex-col bg-white shrink-0 min-h-0">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/40">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subject, recipient, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-xs pl-8 py-1.5 w-full bg-white rounded-xl"
              />
            </div>
          </div>

          {/* Thread Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-black" />
                Loading emails for {selectedIdentity.fromName}...
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <InboxIcon size={28} className="mx-auto text-gray-300" />
                <p className="font-medium text-gray-700">No emails in this view</p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Emails sent from or addressed to <span className="font-mono text-gray-600">{selectedIdentity.email}</span> will appear here.
                </p>
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedEmailUid === item.uid;
                return (
                  <div
                    key={item.uid}
                    onClick={() => openEmail(item.uid)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer relative group ${
                      isSelected
                        ? "bg-gray-100/70 border-l-4 border-black"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-gray-900 truncate flex-1">
                        {item.direction === "outbound"
                          ? `To: ${item.to || "Recipient"}`
                          : `From: ${item.fromName || item.from || "Sender"}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => toggleStar(e, item.uid, !!item.isStarred)}
                          className="text-gray-300 hover:text-amber-500 transition-colors"
                        >
                          <Star
                            size={13}
                            className={item.isStarred ? "text-amber-500 fill-amber-500" : ""}
                          />
                        </button>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="font-semibold text-xs text-gray-800 truncate mb-1">
                      {item.subject || "(No subject)"}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <div className="flex items-center gap-2">
                        {item.status && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold uppercase text-[9px] ${
                              item.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "queued"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : item.status === "failed"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        )}

                        {item.openCount && item.openCount > 0 ? (
                          <span className="text-blue-600 font-medium flex items-center gap-0.5">
                            <Eye size={10} /> Opened
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[10px] text-gray-400">
                        {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Email Reader & Reply */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
          {bodyLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LogoLoader fullPage text="Loading email..." />
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Email Reader Header */}
              <div className="p-5 border-b border-gray-100 shrink-0 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedEmail.subject || "(No Subject)"}
                    </h2>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        <strong>From:</strong>{" "}
                        <span className="text-gray-900 font-medium">
                          {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                        </span>
                      </div>
                      <div>
                        <strong>To:</strong>{" "}
                        <span className="text-gray-900 font-medium">{selectedEmail.to}</span>
                      </div>
                      {selectedEmail.replyTo && (
                        <div>
                          <strong>Reply-To:</strong>{" "}
                          <span className="text-gray-600 font-mono text-[11px]">{selectedEmail.replyTo}</span>
                        </div>
                      )}
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
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={13} /> {aiLoading ? "Thinking..." : "AI Summary"}
                    </button>
                    <button
                      onClick={generateAiReplies}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={13} /> Smart Replies
                    </button>
                  </div>
                </div>

                {/* AI Summary Banner */}
                {aiSummary && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100 text-xs text-indigo-950 animate-fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900 mb-1">
                      <Sparkles size={13} className="text-indigo-600" /> AI Conversation Summary
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}

                {/* AI Smart Replies Suggestions */}
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
              </div>

              {/* Reply Section */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
                {replySuccess && (
                  <div className="mb-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
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
                    <span className="text-[11px] text-gray-500">
                      Sending as: <strong>{selectedIdentity.fromName}</strong> &lt;{selectedIdentity.email}&gt;
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
              <p className="text-sm font-semibold text-gray-700 mb-1">No email selected</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Choose a conversation from the list to view its contents, generate AI summaries, and send replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">New Message</h3>
                <p className="text-xs text-gray-500">
                  Sending from <span className="font-bold text-gray-800">{selectedIdentity.fromName}</span> ({selectedIdentity.email})
                </p>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
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
                  className="input w-full text-xs resize-none"
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
                  <Send size={13} /> {sendingCompose ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
