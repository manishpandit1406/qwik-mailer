"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronUp, LifeBuoy, CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import Link from "next/link";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

const faqs = [
  {
    question: "How do I verify my sending domain?",
    answer: "Navigate to the Domains tab, add your domain name, and configure the generated DNS records (SPF, DKIM, and DMARC) in your domain registrar. Once configured, click 'Verify'.",
  },
  {
    question: "What is the difference between Transactional and Marketing emails?",
    answer: "Transactional emails are triggered by user actions (like password resets or receipts). Marketing emails are sent to a list of subscribers for promotional purposes.",
  },
  {
    question: "Why are my emails going to spam?",
    answer: "Ensure your domain is verified and you have set up DMARC. Also, maintain a low complaint rate (<0.1%) and ensure your content doesn't trigger spam filters.",
  },
  {
    question: "Can I invite team members to my workspace?",
    answer: "Yes! Navigate to the Team tab and send an invite to your colleague. You can assign them as an Admin or Viewer.",
  },
  {
    question: "How do webhooks work?",
    answer: "Webhooks allow your application to receive real-time notifications about email events (delivered, opened, bounced). Add your endpoint URL in the Webhooks tab.",
  }
];

export default function SupportPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, description }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create ticket");
      
      setSubject("");
      setDescription("");
      setShowNewTicketForm(false);
      fetchTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "resolved": return <CheckCircle2 className="text-green-500" size={16} />;
      case "in_progress": return <CircleDot className="text-blue-500" size={16} />;
      default: return <CircleDashed className="text-orange-500" size={16} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 relative">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Help & Support</h1>
        <p className="text-sm text-gray-500">Find answers to common questions or reach out to our team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: FAQs */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LifeBuoy size={18} className="text-blue-600" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between font-medium text-sm text-gray-800"
                  >
                    {faq.question}
                    {activeFaq === idx ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </button>
                  {activeFaq === idx && (
                    <div className="px-4 py-3 text-sm text-gray-600 bg-white border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Tickets */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Your Support Tickets</h2>
              {!showNewTicketForm && (
                <button
                  onClick={() => setShowNewTicketForm(true)}
                  className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-md flex items-center gap-1.5 hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <Plus size={14} /> New Ticket
                </button>
              )}
            </div>

            {showNewTicketForm ? (
              <form onSubmit={handleCreateTicket} className="space-y-4 border border-gray-200 p-4 rounded-lg bg-gray-50 mb-6">
                <h3 className="text-sm font-semibold mb-2">Create a new ticket</h3>
                {error && <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>}
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Issue with domain verification"
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-black focus:border-black py-2 px-3 border shadow-sm"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please describe your issue in detail..."
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-black focus:border-black py-2 px-3 border shadow-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-black text-white text-xs font-semibold rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            ) : null}

            {loadingTickets ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                No tickets found. You haven't submitted any support requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <Link 
                    key={ticket.id} 
                    href={`/dashboard/support/${ticket.id}`}
                    className="block w-full text-left border border-gray-100 bg-gray-50/30 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-medium text-sm text-gray-900 group-hover:text-black transition-colors">{ticket.subject}</h4>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-100 bg-white shadow-sm">
                        {getStatusIcon(ticket.status)}
                        <span className="text-[10px] uppercase font-semibold text-gray-600 tracking-wider">
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                      Submitted on {formatIST(ticket.createdAt, false)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
