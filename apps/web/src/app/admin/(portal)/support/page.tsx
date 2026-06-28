"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Mail, CheckCircle, Clock, Send, Inbox, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  userId: string;
  teamId: string | null;
  teamSlug: string | null;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/tickets?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      setLoadingMessages(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    } else {
      setMessages([]);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.userId.toLowerCase().includes(search.toLowerCase())
  );

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    
    try {
      setReplying(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      
      const res = await fetch(`${API}/v1/admin/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ message: replyMessage, markResolved: false }),
      });
      
      const data = await res.json();
      if (data.success) {
        setReplyMessage("");
        fetchMessages(selectedTicket.id);
        fetchTickets(); // Refresh list to update status if needed
      } else {
        alert(data.error || "Failed to send reply");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending reply");
    } finally {
      setReplying(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${API}/v1/admin/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ message: "Ticket marked as resolved.", markResolved: true }),
      });
      fetchMessages(selectedTicket.id);
      fetchTickets();
      setSelectedTicket({ ...selectedTicket, status: 'resolved' });
    } catch (e) {}
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full max-w-7xl mx-auto flex flex-col sm:flex-row gap-6 bg-gray-50/30 p-2 sm:p-0 rounded-2xl">
      
      {/* Left Sidebar (Inbox List) */}
      <div className={`w-full sm:w-[350px] lg:w-[400px] flex-shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden ${selectedTicket ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300 bg-gray-50/50 focus:bg-white transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <Inbox size={32} className="mb-3 text-gray-300" />
              <p className="text-sm">No tickets found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-4 transition-colors border-l-4 ${selectedTicket?.id === t.id ? 'bg-gray-100 border-black' : 'bg-white border-transparent hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-semibold truncate ${selectedTicket?.id === t.id ? 'text-black' : 'text-gray-900'}`}>{t.subject}</h3>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{format(new Date(t.createdAt), "MMM d")}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{t.description}</p>
                  <div className="flex items-center gap-2">
                    {t.status === 'resolved' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100"><CheckCircle size={10}/> Resolved</span>}
                    {t.status === 'open' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100"><Clock size={10}/> Open</span>}
                    {t.status === 'in_progress' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"><Clock size={10}/> Active</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Main Area (Chat/Messages) */}
      <div className={`flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden ${!selectedTicket ? 'hidden sm:flex' : 'flex'}`}>
        {!selectedTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <Mail size={48} className="mb-4 text-gray-200" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Select a ticket</h3>
            <p className="text-sm">Choose a ticket from the left to view the conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 bg-white shadow-sm z-10 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setSelectedTicket(null)} className="sm:hidden mt-0.5 text-gray-400 hover:text-gray-900">
                  <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 break-words">{selectedTicket.subject}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 truncate max-w-[200px]">User: {selectedTicket.userId}</span>
                    {selectedTicket.teamSlug && (
                      <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">Team: {selectedTicket.teamSlug}</span>
                    )}
                    <span>{format(new Date(selectedTicket.createdAt), "MMM d, yyyy h:mm a")}</span>
                  </div>
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <button onClick={handleResolve} className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors">
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 space-y-6">
              {/* Original Issue */}
              <div className="flex flex-col gap-1 max-w-[85%]">
                <span className="text-[10px] font-semibold text-gray-500 uppercase ml-1">User (Original Issue)</span>
                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm text-sm text-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {loadingMessages ? (
                <div className="text-center text-xs text-gray-400 py-4">Loading messages...</div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.senderType === "admin";
                  return (
                    <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${isAdmin ? 'self-end items-end ml-auto' : ''}`}>
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${isAdmin ? 'text-black mr-1' : 'text-gray-500 ml-1'}`}>
                        {isAdmin ? 'Admin (You)' : 'User'}
                      </span>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm border ${
                        isAdmin 
                          ? 'bg-black text-white rounded-tr-sm border-black' 
                          : 'bg-white text-gray-800 rounded-tl-sm border-gray-200'
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">{format(new Date(msg.createdAt), "h:mm a")}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Area */}
            {selectedTicket.status !== 'resolved' ? (
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="relative">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full h-24 pl-4 pr-14 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 resize-none transition-shadow bg-gray-50 focus:bg-white"
                  />
                  <button
                    onClick={handleReply}
                    disabled={replying || !replyMessage.trim()}
                    className="absolute right-3 bottom-3 p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {replying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 ml-1">An email notification will be sent to the user.</p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">This ticket is resolved. No further replies can be sent.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
