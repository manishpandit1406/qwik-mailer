"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Inbox as InboxIcon,
  Send,
  Star,
  RefreshCw,
  Search,
  Mail,
  Sparkles,
  CheckCircle2,
  X,
  ChevronDown,
  ShieldCheck,
  Eye,
  Reply,
  ArrowLeft,
  ArrowRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  AtSign,
  Layers,
  Clock,
  CheckCheck,
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
  const [identitySearch, setIdentitySearch] = useState("");

  // Collapsible Folders Sidebar State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Copied state
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchIdentities();
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("qwik_inbox_sidebar_collapsed");
      if (savedCollapsed === "true") setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (selectedIdentity) {
      fetchEmails();
    }
  }, [selectedIdentity, folder]);

  // Click outside to close switcher dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("qwik_inbox_sidebar_collapsed", next ? "true" : "false");
      }
      return next;
    });
  }

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

  function copyToClipboard(text: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
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

  const filteredIdentities = identities.filter((i) => {
    const q = identitySearch.toLowerCase();
    return (
      i.fromName.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.domain && i.domain.toLowerCase().includes(q))
    );
  });

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
  // VIEW 1: IDENTITY SELECTION SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (!selectedIdentity) {
    return (
      <div className="max-w-6xl mx-auto w-full py-8 px-4 space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black text-white">
                Mailboxes
              </span>
              <span className="text-xs text-gray-500 font-medium">Native Email Delivery Engine</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
              Select Sender Identity
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Choose an identity to open its conversation inbox, view sent and received emails, and send replies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {identities.length > 3 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter identities..."
                  value={identitySearch}
                  onChange={(e) => setIdentitySearch(e.target.value)}
                  className="input text-xs pl-8 py-2 w-48 rounded-xl bg-white shadow-xs"
                />
              </div>
            )}

            <Link
              href="/dashboard/senders"
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus size={14} /> New Sender Identity
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loadingIdentities ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <RefreshCw size={24} className="animate-spin text-black mb-3" />
            <p className="text-xs text-gray-400 font-medium">Loading sender identities...</p>
          </div>
        ) : identities.length === 0 ? (
          /* Empty State */
          <div className="glass-card rounded-3xl p-12 text-center max-w-lg mx-auto border border-gray-200 shadow-sm space-y-4 bg-white">
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
          /* Grid of Sender Identities */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-bold uppercase tracking-wider">
                Available Identities ({filteredIdentities.length})
              </span>
              <span>Click any mailbox to open its thread view</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIdentities.map((identity) => {
                const initial = (identity.fromName || identity.email || "Q").charAt(0).toUpperCase();
                const isCopied = copiedEmail === identity.email;

                return (
                  <div
                    key={identity.id}
                    onClick={() => handleSelectIdentity(identity)}
                    className="glass-card rounded-3xl p-6 border border-gray-200 hover:border-black/60 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between space-y-5 bg-white relative overflow-hidden"
                  >
                    {/* Top ambient glow */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full blur-xl group-hover:scale-150 transition-transform pointer-events-none" />

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                          {initial}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={11} /> Verified
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors">
                          {identity.fromName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs font-mono text-gray-600 truncate">
                            {identity.email}
                          </p>
                          <button
                            onClick={(e) => copyToClipboard(identity.email, e)}
                            className="text-gray-400 hover:text-black transition-colors p-0.5"
                            title="Copy email"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      {identity.replyTo && (
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 space-y-0.5">
                          <div className="font-semibold text-gray-400 text-[10px] uppercase">Reply-To Routing</div>
                          <div className="truncate font-mono text-gray-700">{identity.replyTo}</div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-900 group-hover:text-black relative z-10">
                      <span>Open Identity Mailbox</span>
                      <div className="w-7 h-7 rounded-xl bg-gray-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
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
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-130px)] flex flex-col space-y-3 pb-4 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Left: Back + Identity Switcher Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleBackToIdentities}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
            title="All Mailboxes"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Identity Switcher Dropdown (Positioned cleanly on the left) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-gray-400 shadow-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs font-bold">
                {(selectedIdentity.fromName || "Q").charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-900 leading-tight">
                  {selectedIdentity.fromName}
                </div>
                <div className="text-[10px] font-mono text-gray-500 leading-tight">
                  {selectedIdentity.email}
                </div>
              </div>
              <ChevronDown size={13} className="text-gray-400 ml-1" />
            </button>

            {showDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-50 animate-fade-in space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
                  Switch Mailbox Identity
                </div>
                {identities.map((idnt) => {
                  const isCurrent = idnt.id === selectedIdentity.id;
                  return (
                    <button
                      key={idnt.id}
                      onClick={() => handleSelectIdentity(idnt)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? "bg-black text-white font-semibold"
                          : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold">{idnt.fromName}</div>
                        <div className={`text-[10px] font-mono truncate ${isCurrent ? "text-gray-300" : "text-gray-400"}`}>
                          {idnt.email}
                        </div>
                      </div>
                      {isCurrent && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={handleBackToIdentities}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-black hover:bg-gray-50 flex items-center gap-2 font-medium"
                  >
                    <Layers size={13} /> View All Mailboxes Overview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmails}
            className="btn-secondary p-2 flex items-center justify-center rounded-xl"
            title="Refresh mailbox"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowComposeModal(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl font-bold shadow-xs"
          >
            <Send size={13} /> Compose
          </button>
        </div>
      </div>

      {/* Main Mail Container (3-Column Layout with Collapsible Folder Sidebar) */}
      <div className="glass-card flex-1 rounded-2xl overflow-hidden flex border border-gray-200 shadow-sm min-h-0 bg-white">
        {/* Left Column: Folders (Collapsible like Main Sidebar) */}
        <aside
          className={`border-r border-gray-200/80 bg-gray-50/70 shrink-0 flex flex-col justify-between transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "w-16 p-2" : "w-52 p-3"
          }`}
        >
          <div className="space-y-2">
            {/* Collapse / Expand Toggle Button */}
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-1"} pb-1`}>
              {!sidebarCollapsed && (
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Folders
                </span>
              )}
              <button
                onClick={toggleSidebarCollapse}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                title={sidebarCollapsed ? "Expand folders sidebar" : "Collapse folders sidebar"}
              >
                {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>

            {/* Folder Buttons */}
            <div className="space-y-1">
              {/* All Mail / Inbox */}
              <button
                onClick={() => setFolder("INBOX")}
                title={sidebarCollapsed ? `All Mail (${emails.length})` : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                  sidebarCollapsed
                    ? "justify-center h-10 w-10 mx-auto relative"
                    : "justify-between px-3 py-2"
                } ${
                  folder === "INBOX"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <InboxIcon size={15} className={folder === "INBOX" ? "text-white" : "text-gray-500"} />
                  {!sidebarCollapsed && <span>All Mail</span>}
                </div>
                {emails.length > 0 && folder === "INBOX" && (
                  sidebarCollapsed ? (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                      {emails.length}
                    </span>
                  )
                )}
              </button>

              {/* Sent */}
              <button
                onClick={() => setFolder("sent")}
                title={sidebarCollapsed ? "Sent" : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                  sidebarCollapsed
                    ? "justify-center h-10 w-10 mx-auto relative"
                    : "justify-between px-3 py-2"
                } ${
                  folder === "sent"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send size={15} className={folder === "sent" ? "text-white" : "text-gray-500"} />
                  {!sidebarCollapsed && <span>Sent</span>}
                </div>
              </button>

              {/* Received */}
              <button
                onClick={() => setFolder("received")}
                title={sidebarCollapsed ? "Received" : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                  sidebarCollapsed
                    ? "justify-center h-10 w-10 mx-auto relative"
                    : "justify-between px-3 py-2"
                } ${
                  folder === "received"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={15} className={folder === "received" ? "text-white" : "text-gray-500"} />
                  {!sidebarCollapsed && <span>Received</span>}
                </div>
              </button>

              {/* Starred */}
              <button
                onClick={() => setFolder("starred")}
                title={sidebarCollapsed ? "Starred" : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                  sidebarCollapsed
                    ? "justify-center h-10 w-10 mx-auto relative"
                    : "justify-between px-3 py-2"
                } ${
                  folder === "starred"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star
                    size={15}
                    className={folder === "starred" ? "text-amber-400 fill-amber-400" : "text-gray-500"}
                  />
                  {!sidebarCollapsed && <span>Starred</span>}
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Active Mailbox Pill */}
          {sidebarCollapsed ? (
            <div
              className="w-10 h-10 mx-auto rounded-xl bg-black text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer"
              title={`Active Mailbox: ${selectedIdentity.fromName} <${selectedIdentity.email}>`}
            >
              {(selectedIdentity.fromName || "Q").charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="p-3 bg-white border border-gray-200 rounded-xl text-xs shadow-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sending As</div>
              <div className="font-bold text-gray-900 truncate">
                {selectedIdentity.fromName}
              </div>
              <div className="text-[10px] font-mono text-gray-500 truncate">
                {selectedIdentity.email}
              </div>
            </div>
          )}
        </aside>

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
                className="input text-xs pl-8 pr-7 py-1.5 w-full bg-white rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Thread Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-black" />
                Loading conversations...
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <InboxIcon size={28} className="mx-auto text-gray-300" />
                <p className="font-semibold text-gray-700">No emails in this view</p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Messages sent from or addressed to <span className="font-mono text-gray-600">{selectedIdentity.email}</span> will appear here.
                </p>
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedEmailUid === item.uid;
                const isOutbound = item.direction === "outbound";

                return (
                  <div
                    key={item.uid}
                    onClick={() => openEmail(item.uid)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-gray-100 border-l-4 border-black"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOutbound ? "bg-blue-500" : "bg-emerald-500"
                          }`}
                          title={isOutbound ? "Sent from this identity" : "Received"}
                        />
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {isOutbound
                            ? `To: ${item.to || "Recipient"}`
                            : `From: ${item.fromName || item.from || "Sender"}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => toggleStar(e, item.uid, !!item.isStarred)}
                          className="text-gray-300 hover:text-amber-500 transition-colors p-0.5"
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
              <LogoLoader fullPage text="Loading message..." />
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Reader Header */}
              <div className="p-5 border-b border-gray-100 shrink-0 bg-white space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-black text-gray-900 leading-snug">
                      {selectedEmail.subject || "(No Subject)"}
                    </h2>

                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium w-14">From:</span>
                        <span className="font-bold text-gray-900">
                          {selectedEmail.fromName ? `${selectedEmail.fromName} ` : ""}
                        </span>
                        <span className="font-mono text-gray-600 text-[11px]">
                          &lt;{selectedEmail.from}&gt;
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium w-14">To:</span>
                        <span className="font-mono text-gray-800 text-[11px]">{selectedEmail.to}</span>
                      </div>

                      {selectedEmail.replyTo && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-medium w-14">Reply-To:</span>
                          <span className="font-mono text-gray-600 text-[11px]">{selectedEmail.replyTo}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ""}
                        </span>

                        {selectedEmail.status && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase text-[9px] border border-emerald-200">
                            {selectedEmail.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={generateAiSummary}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Sparkles size={13} /> {aiLoading ? "Thinking..." : "AI Summary"}
                    </button>
                    <button
                      onClick={generateAiReplies}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Sparkles size={13} /> Smart Replies
                    </button>
                  </div>
                </div>

                {/* AI Summary Banner */}
                {aiSummary && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-100 text-xs text-indigo-950 animate-fade-in space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Sparkles size={14} className="text-indigo-600" /> AI Conversation Summary
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}

                {/* AI Smart Replies Suggestions */}
                {aiReplies.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Suggested Quick Responses:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiReplies.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => setReplyText(reply)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-700 font-medium shadow-xs transition-all text-left"
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

              {/* Quick Reply Box */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/70 shrink-0 space-y-2">
                {replySuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 size={14} /> Reply sent successfully!
                  </div>
                )}
                <div>
                  <textarea
                    rows={3}
                    placeholder={`Reply to ${selectedEmail.from || selectedEmail.to}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="input w-full text-xs p-3 rounded-xl bg-white shadow-xs resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-500">
                      Replying as: <strong className="text-gray-900">{selectedIdentity.fromName}</strong> &lt;{selectedIdentity.email}&gt;
                    </span>
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyText.trim()}
                      className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl font-bold shadow-xs"
                    >
                      <Reply size={13} /> {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <Mail size={40} className="text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-800 mb-1">No conversation selected</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Choose an email from the left thread list to view its contents, generate AI summaries, and reply as {selectedIdentity.fromName}.
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
                  Sending as <span className="font-bold text-gray-800">{selectedIdentity.fromName}</span> ({selectedIdentity.email})
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
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl"
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
