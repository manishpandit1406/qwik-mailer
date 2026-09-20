"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, Trash2, Star, Settings, Plus, Mail, X } from "lucide-react";

export default function InboxDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ provider: 'gmail', emailAddress: '', appPassword: '', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 });
  const [composeForm, setComposeForm] = useState({ accountId: '', to: '', subject: '', text: '' });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [undoState, setUndoState] = useState<{ form: typeof composeForm; timeoutId: NodeJS.Timeout } | null>(null);
  const isCollapsed = !isHovered;
  
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const navigation = [
    { name: "Inbox", href: "/inbox-dashboard", icon: Inbox },
    { name: "Starred", href: "/inbox-dashboard/starred", icon: Star },
    { name: "Sent", href: "/inbox-dashboard/sent", icon: Send },
    { name: "Trash", href: "/inbox-dashboard/trash", icon: Trash2 },
  ];

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/inbox/connect`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setShowConnectModal(false);
        fetchAccounts();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!composeForm.accountId || !composeForm.to) {
      alert("Please fill required fields.");
      return;
    }
    
    // Close modal immediately
    setShowComposeModal(false);

    // Save the current form to send after delay
    const formToSend = { ...composeForm };
    
    // Reset compose form
    setComposeForm({ accountId: '', to: '', subject: '', text: '' });

    // Set 10s timeout
    const timeoutId = setTimeout(async () => {
      setUndoState(null); // Clear undo state
      try {
        const token = localStorage.getItem("mf_access_token");
        const res = await fetch(`${API}/v1/inbox/send`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(formToSend)
        });
        const data = await res.json();
        if (data.success) {
          console.log("Email sent successfully!");
        } else {
          console.error(data.error);
        }
      } catch (err) {
        console.error(err);
      }
    }, 10000);

    setUndoState({ form: formToSend, timeoutId });
  }

  function handleUndo() {
    if (undoState) {
      clearTimeout(undoState.timeoutId);
      setComposeForm(undoState.form);
      setShowComposeModal(true);
      setUndoState(null);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'c' || e.key === 'C') {
        setShowComposeModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans text-gray-900 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:static flex flex-col overflow-x-hidden shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="p-4 flex items-center gap-2 border-b border-gray-200 shrink-0 h-16">
          <div className="w-8 h-8 shrink-0 rounded bg-black flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className={`font-extrabold text-lg tracking-tight transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
            Qwik Inbox
          </span>
        </div>

        <div className="p-0 py-4 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-3 mb-6">
            <button onClick={() => setShowComposeModal(true)} className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-center gap-2 px-4 py-2.5'} bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all shadow-sm group`}>
              <Plus className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>Compose</span>
            </button>
          </div>
          <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-5 transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>Folders</div>
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group whitespace-nowrap ${
                    isActive 
                      ? "bg-black text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <div className={`shrink-0 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-900"}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={`p-0 py-4 transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-5 flex items-center justify-between">
            Accounts
            <button onClick={() => setShowConnectModal(true)} className="hover:text-black transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {accounts.length === 0 ? (
            <div className="px-5 py-2 text-sm text-gray-500 italic">
              No accounts connected.
            </div>
          ) : (
            <ul className="space-y-1 px-2">
              {accounts.map(acc => (
                <li key={acc.id} className="px-3 py-2 text-sm text-gray-600 truncate cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                  {acc.emailAddress}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 shrink-0">
          <Link href="/inbox-dashboard/settings" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors group whitespace-nowrap">
            <div className="shrink-0 text-gray-400 group-hover:text-gray-900">
              <Settings className="w-4 h-4" />
            </div>
            <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-4 text-sm font-medium animate-in slide-in-from-bottom-5">
          <span>Sending...</span>
          <button 
            onClick={handleUndo}
            className="text-indigo-400 hover:text-indigo-300 transition-colors bg-white/10 px-3 py-1 rounded"
          >
            Undo
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {children}
      </main>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="font-bold text-lg">Connect Email Account</h3>
              <button onClick={() => setShowConnectModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConnect} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Provider</label>
                <select 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={form.provider}
                  onChange={e => {
                    const provider = e.target.value;
                    if (provider === 'gmail') setForm({...form, provider, imapHost: 'imap.gmail.com', smtpHost: 'smtp.gmail.com'});
                    if (provider === 'outlook') setForm({...form, provider, imapHost: 'outlook.office365.com', smtpHost: 'smtp.office365.com'});
                  }}
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                  <option value="custom">Custom IMAP/SMTP</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                <input 
                  type="email" required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={form.emailAddress} onChange={e => setForm({...form, emailAddress: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">App Password</label>
                <input 
                  type="password" required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={form.appPassword} onChange={e => setForm({...form, appPassword: e.target.value})}
                />
                <p className="text-xs text-neutral-500 mt-1">Use an App Password generated from your provider's security settings, NOT your regular password.</p>
              </div>

              {form.provider === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">IMAP Host</label>
                    <input type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm sm:text-sm" value={form.imapHost} onChange={e => setForm({...form, imapHost: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">SMTP Host</label>
                    <input type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm sm:text-sm" value={form.smtpHost} onChange={e => setForm({...form, smtpHost: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200 mt-6">
                <button type="button" onClick={() => setShowConnectModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="font-bold text-lg">New Message</h3>
              <button onClick={() => setShowComposeModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="flex flex-col flex-1">
              <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-500 w-12">From:</span>
                <select 
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-neutral-900 font-medium"
                  value={composeForm.accountId}
                  onChange={e => setComposeForm({...composeForm, accountId: e.target.value})}
                  required
                >
                  <option value="" disabled>Select an account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.emailAddress}</option>
                  ))}
                </select>
              </div>
              <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-500 w-12">To:</span>
                <input 
                  type="email" required
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0 outline-none"
                  value={composeForm.to}
                  onChange={e => setComposeForm({...composeForm, to: e.target.value})}
                />
              </div>
              <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-500 w-12">Subject:</span>
                <input 
                  type="text" required
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0 font-medium outline-none"
                  value={composeForm.subject}
                  onChange={e => setComposeForm({...composeForm, subject: e.target.value})}
                />
              </div>
              <textarea 
                className="flex-1 w-full p-4 resize-none bg-transparent border-none text-sm focus:ring-0 outline-none text-neutral-800"
                placeholder="Write your message here..."
                required
                value={composeForm.text}
                onChange={e => setComposeForm({...composeForm, text: e.target.value})}
              />
              <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setShowComposeModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 rounded-md transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={sending} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {sending ? 'Sending...' : 'Send'} <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
