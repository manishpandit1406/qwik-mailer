"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, Filter, Mail, Clock, MoreVertical, RefreshCw, Send as SendIcon, Sparkles, Paperclip, Download, Eye, MousePointerClick } from "lucide-react";

export default function InboxDashboardPage() {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchEmails(selectedAccountId);
    }
  }, [selectedAccountId, pathname]);

  async function fetchAccounts() {
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }



  async function fetchEmails(accountId: string) {
    setLoading(true);
    let folder = "INBOX";
    if (pathname.includes("/sent")) folder = "[Gmail]/Sent Mail";
    else if (pathname.includes("/starred")) folder = "[Gmail]/Starred";
    else if (pathname.includes("/trash")) folder = "[Gmail]/Trash";

    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/emails?accountId=${accountId}&folder=${encodeURIComponent(folder)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmailBody(uid: string) {
    if (!selectedAccountId) return;
    setBodyLoading(true);

    let folder = "INBOX";
    if (pathname.includes("/sent")) folder = "[Gmail]/Sent Mail";
    else if (pathname.includes("/starred")) folder = "[Gmail]/Starred";
    else if (pathname.includes("/trash")) folder = "[Gmail]/Trash";

    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/email?accountId=${selectedAccountId}&uid=${uid}&folder=${encodeURIComponent(folder)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.email) {
        setSelectedEmail((prev: any) => ({ 
          ...prev, 
          html: data.email.html, 
          text: data.email.text,
          attachments: data.email.attachments,
          trackingLogs: data.email.trackingLogs || [],
          clickLogs: data.email.clickLogs || []
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBodyLoading(false);
    }
  }

  useEffect(() => {
    if (selectedEmail && !selectedEmail.html && !selectedEmail.text && !bodyLoading) {
      fetchEmailBody(selectedEmail.uid);
    }
    // Reset AI state when email changes
    setAiSummary('');
    setAiReplies([]);
    setShowReplyBox(false);
  }, [selectedEmail]);

  async function handleSummarize() {
    if (!selectedEmail || (!selectedEmail.text && !selectedEmail.html)) return;
    setAiLoading(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: selectedEmail.text || selectedEmail.html })
      });
      const data = await res.json();
      if (data.success) setAiSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSmartReply() {
    if (!selectedEmail || (!selectedEmail.text && !selectedEmail.html)) return;
    setAiLoading(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/ai/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: selectedEmail.text || selectedEmail.html })
      });
      const data = await res.json();
      if (data.success) setAiReplies(data.replies);
    } catch (e) {
      console.error(e);
      setAiLoading(false);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedAccountId || !selectedEmail) return;
    setSendingReply(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      
      // Determine recipient (if in Sent folder, reply to the original recipient, else reply to the sender)
      const recipient = pathname.includes("/sent") ? selectedEmail.to : selectedEmail.from;
      const toEmail = emailAddress(recipient);
      
      const res = await fetch(`${API}/v1/inbox/send`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          to: toEmail,
          subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          text: replyText
        })
      });

      if (!res.ok) throw new Error("Failed to send reply");
      
      setReplyText("");
      setShowReplyBox(false);
      alert("Reply sent successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!emails || emails.length === 0) return;

      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        const currentIndex = selectedEmail ? emails.findIndex(em => em.uid === selectedEmail.uid) : -1;
        let newIndex = currentIndex;

        if (e.key === 'j') {
          newIndex = currentIndex < emails.length - 1 ? currentIndex + 1 : currentIndex;
        } else if (e.key === 'k') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        }

        if (newIndex !== currentIndex && newIndex >= 0) {
          setSelectedEmail(emails[newIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedEmail]);

  async function handleDownloadAttachment(index: number, filename: string) {
    if (!selectedAccountId || !selectedEmail) return;
    try {
      const token = localStorage.getItem("mf_access_token");
      let folder = "INBOX";
      if (pathname.includes("/sent")) folder = "[Gmail]/Sent Mail";
      else if (pathname.includes("/starred")) folder = "[Gmail]/Starred";
      else if (pathname.includes("/trash")) folder = "[Gmail]/Trash";

      const res = await fetch(`${API}/v1/inbox/attachment?accountId=${selectedAccountId}&uid=${selectedEmail.uid}&folder=${encodeURIComponent(folder)}&index=${index}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to download");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      console.error(e);
      alert("Failed to download attachment.");
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <header className="h-16 border-b border-neutral-200 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-xl text-neutral-800">Inbox</h1>
          {accounts.length > 0 && (
            <select 
              className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.emailAddress}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search emails..." 
              className="pl-9 pr-4 py-2 w-64 bg-neutral-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <button onClick={() => selectedAccountId && fetchEmails(selectedAccountId)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Email List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-neutral-200 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Focused</span>
            <button className="text-neutral-400 hover:text-neutral-700">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {emails.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-neutral-500">
                {accounts.length === 0 ? "Connect an account to view emails." : "No emails found."}
              </div>
            )}
            {emails.map((email) => (
              <div 
                key={email.uid} 
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-neutral-100 cursor-pointer transition-colors ${
                  selectedEmail?.uid === email.uid ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'hover:bg-neutral-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm truncate mr-2 ${!email.flags.includes('\\Seen') ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'}`}>
                    {email.fromName || email.from}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium shrink-0">
                    {new Date(email.date).toLocaleDateString()}
                  </span>
                </div>
                <h4 className={`text-sm mb-1 truncate ${!email.flags.includes('\\Seen') ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>{email.subject}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Email Detail View */}
        <div className="flex-1 flex flex-col bg-white relative">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                <Mail className="w-8 h-8 text-neutral-300" />
              </div>
              <h3 className="text-lg font-medium text-neutral-600">No email selected</h3>
              <p className="text-sm">Select an email from the list to read it here.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">{selectedEmail.subject}</h2>
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    {(selectedEmail.fromName || selectedEmail.from)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{selectedEmail.fromName || selectedEmail.from}</div>
                    <div className="text-sm text-neutral-500">{emailAddress(selectedEmail.from)}</div>
                  </div>
                </div>
                <div className="text-sm text-neutral-500 flex flex-col items-end gap-1">
                  <span>{new Date(selectedEmail.date).toLocaleString()}</span>
                  <div className="flex gap-2">
                    {selectedEmail.trackingLogs && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${selectedEmail.trackingLogs.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-500 bg-neutral-100'}`}>
                        <Eye className="w-3 h-3" /> Opened {selectedEmail.trackingLogs.length} time{selectedEmail.trackingLogs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {selectedEmail.clickLogs && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${selectedEmail.clickLogs.length > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-neutral-500 bg-neutral-100'}`} title={selectedEmail.clickLogs.map((l:any) => l.url).join(', ')}>
                        <MousePointerClick className="w-3 h-3" /> Clicked {selectedEmail.clickLogs.length} time{selectedEmail.clickLogs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mb-8 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4" /> {selectedEmail.attachments.length} Attachments
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedEmail.attachments.map((att: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-white border border-neutral-200 rounded-lg min-w-[200px] shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 shrink-0 rounded bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-neutral-800 truncate" title={att.filename}>{att.filename || 'Unnamed File'}</span>
                            <span className="text-xs text-neutral-500">{(att.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDownloadAttachment(idx, att.filename || `attachment-${idx}`)}
                          className="shrink-0 p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-indigo-600 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Tools */}
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={handleSummarize} 
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiLoading ? "Thinking..." : "Summarize with AI"}
                </button>
                <button 
                  onClick={handleSmartReply} 
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Smart Reply
                </button>
              </div>

              {aiSummary && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-lg shadow-sm">
                  <h4 className="text-purple-800 font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Summary
                  </h4>
                  <div className="text-purple-900 text-sm whitespace-pre-wrap leading-relaxed">
                    {aiSummary}
                  </div>
                </div>
              )}

              {aiReplies.length > 0 && (
                <div className="mb-6 space-y-2">
                  <h4 className="text-blue-800 font-semibold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Smart Replies
                  </h4>
                  {aiReplies.map((reply, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setShowReplyBox(true);
                        setReplyText(reply);
                      }}
                      className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      {reply}
                    </div>
                  ))}
                </div>
              )}
              <div className="prose max-w-none text-neutral-700 mb-8 border-b border-neutral-100 pb-8">
                {bodyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${selectedEmail.text}</pre>` || "No content" }} />
                )}
              </div>

              {/* Reply Button (Only show if box is hidden) */}
              {!bodyLoading && !showReplyBox && (
                <div className="mb-6">
                  <button 
                    onClick={() => setShowReplyBox(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors border border-neutral-200 shadow-sm"
                  >
                    <SendIcon className="w-4 h-4 text-neutral-500" />
                    Reply
                  </button>
                </div>
              )}

              {/* Inline Reply Box */}
              {!bodyLoading && showReplyBox && (
                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-100 text-sm font-medium text-neutral-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SendIcon className="w-4 h-4 text-neutral-400" />
                      Reply to {emailAddress(pathname.includes("/sent") ? selectedEmail.to : selectedEmail.from)}
                    </div>
                    <button 
                      onClick={() => setShowReplyBox(false)}
                      className="text-neutral-400 hover:text-neutral-600 font-medium text-xs px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full p-4 min-h-[120px] outline-none text-sm text-neutral-800 resize-y"
                    autoFocus
                  />
                  <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button className="p-2 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors" title="Formatting options">
                        <span className="font-serif font-bold text-sm leading-none">Aa</span>
                      </button>
                      <button className="p-2 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors" title="Attach files">
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function emailAddress(str: string | undefined | null) {
  if (!str) return "";
  const match = str.match(/<([^>]+)>/);
  return match ? match[1] : str;
}
