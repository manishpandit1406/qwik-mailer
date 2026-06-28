"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2, CircleDashed, CircleDot, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

interface Message {
  id: string;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
}

export default function UserTicketPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    fetchTicketAndMessages();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchTicketAndMessages() {
    setLoading(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      
      // Fetch tickets to find the specific one (as we don't have a GET /tickets/:id yet, we filter from list)
      const ticketRes = await fetch(`${API}/v1/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ticketData = await ticketRes.json();
      if (ticketData.success) {
        const found = ticketData.data.find((t: Ticket) => t.id === id);
        if (found) {
          setTicket(found);
        } else {
          router.push("/dashboard/support");
          return;
        }
      }

      // Fetch messages for this ticket
      const msgRes = await fetch(`${API}/v1/support/tickets/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = await msgRes.json();
      if (msgData.success) {
        setMessages(msgData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!ticket || !replyMessage.trim()) return;
    
    try {
      setReplying(true);
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/support/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      
      const data = await res.json();
      if (data.success) {
        setReplyMessage("");
        fetchTicketAndMessages();
      } else {
        alert(data.error || "Failed to send reply");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending reply");
    } finally {
      setReplying(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "resolved": return <CheckCircle2 className="text-green-500" size={16} />;
      case "in_progress": return <CircleDot className="text-blue-500" size={16} />;
      default: return <CircleDashed className="text-orange-500" size={16} />;
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-sm text-gray-500">Loading ticket details...</div>;
  }

  if (!ticket) return null;

  return (
    <div className="max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 flex-shrink-0">
        <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={16} /> Back to Support
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatIST(ticket.createdAt, false)}</span>
              <span>&bull;</span>
              <span>ID: {ticket.id.split("-")[0]}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 w-fit">
            {getStatusIcon(ticket.status)}
            <span className="text-xs uppercase font-semibold text-gray-700 tracking-wider">
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
          {/* Original Issue */}
          <div className="flex flex-col gap-1 max-w-[85%] self-end items-end ml-auto">
            <span className="text-[10px] font-bold tracking-wider text-black uppercase mr-1">You (Original Issue)</span>
            <div className="bg-black text-white p-4 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm whitespace-pre-wrap border border-black">
              {ticket.description}
            </div>
          </div>

          {messages.map((msg) => {
            const isUser = msg.senderType === "user";
            return (
              <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'self-end items-end ml-auto' : ''}`}>
                <span className={`text-[10px] font-bold tracking-wider uppercase ${isUser ? 'text-black mr-1' : 'text-gray-500 ml-1'}`}>
                  {isUser ? 'You' : 'Support Team'}
                </span>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap border ${
                  isUser 
                    ? 'bg-black text-white rounded-tr-sm border-black' 
                    : 'bg-white text-gray-800 rounded-tl-sm border-gray-200'
                }`}>
                  {msg.message}
                </div>
                <span className={`text-[10px] text-gray-400 mt-1 px-1 ${isUser ? 'text-right' : ''}`}>
                  {formatIST(msg.createdAt, true)}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Area */}
        {ticket.status !== 'resolved' ? (
          <div className="p-4 sm:p-6 bg-white border-t border-gray-100">
            <div className="relative flex flex-col sm:flex-row gap-3">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply to our support team..."
                className="flex-1 min-h-[80px] p-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-y transition-shadow bg-gray-50 focus:bg-white"
              />
              <button
                onClick={handleReply}
                disabled={replying || !replyMessage.trim()}
                className="px-8 sm:w-auto w-full bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center font-semibold text-sm min-h-[50px] sm:h-auto"
              >
                {replying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send"}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 sm:ml-2 text-center sm:text-left">We usually reply within a few hours.</p>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
            <CheckCircle2 className="mx-auto text-green-500 mb-2" size={24} />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Ticket Resolved</h3>
            <p className="text-sm text-gray-500">This ticket has been marked as resolved and closed to new replies.</p>
          </div>
        )}
      </div>
    </div>
  );
}
