"use client";
import { formatIST } from "@/lib/dateUtils";

import React, { useState, useEffect } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, Calendar, Filter, ArrowLeft } from "lucide-react";

interface EmailLog {
  id: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  status: string;
  createdAt: string;
  htmlBody?: string;
  textBody?: string;
  deliveredAt?: string;
  sentAt?: string;
  bouncedAt?: string;
  bounceReason?: string;
  openCount: number;
  clickCount: number;
  metadata?: Record<string, string>;
  messageId?: string;
}

const statusStyles: Record<string, string> = {
  delivered: "badge-success",
  bounced: "badge-danger",
  queued: "badge-info",
  failed: "badge-danger",
  sending: "badge-warning",
  deferred: "badge-warning",
  complained: "badge-danger",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function BatchLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const batchId = unwrappedParams.id;
  
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [messageId, setMessageId] = useState("");

  const [selected, setSelected] = useState<EmailLog | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("mf_access_token");
      const url = new URL(`${API}/v1/logs/batches/${batchId}/emails`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", pageSize.toString());
      
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);
      if (fromEmail) url.searchParams.set("fromEmail", fromEmail);
      if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
      if (dateTo) url.searchParams.set("dateTo", dateTo);
      if (messageId) url.searchParams.set("messageId", messageId);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setEmails(json.data.items);
        setTotalPages(Math.ceil(json.data.total / json.data.limit) || 1);
        setTotalItems(json.data.total);
      } else {
        setError(json.error ?? "Failed to load logs");
      }
    } catch (err) {
      setError("Network error. Could not connect to API.");
    } finally {
      setLoading(false);
    }
  };

  async function fetchDetail(id: string) {
    try {
      const token = localStorage.getItem("mf_access_token");
      const res = await fetch(`${API}/v1/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setSelected(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchEmails();
  }, [page, statusFilter, search, fromEmail, dateFrom, dateTo, messageId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8  relative">
      <div className="flex items-center gap-4 mb-2">
        <a href="/dashboard/logs" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Batch Logs <span className="text-gray-400 text-lg ml-2 font-normal">#{batchId.substring(0, 8)}</span>
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Advanced Filter Bar (SendGrid Style) */}
      <div className="glass-card p-4 border border-gray-100 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Recipient or Subject..."
              className="input w-full pl-10 h-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input h-10 w-auto min-w-[140px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="bounced">Bounced</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
            <option value="sending">Sending</option>
          </select>
          <input
            type="text"
            placeholder="From Email"
            className="input h-10 w-auto min-w-[150px]"
            value={fromEmail}
            onChange={(e) => { setFromEmail(e.target.value); setPage(1); }}
          />
          <input
            type="text"
            placeholder="Message ID"
            className="input h-10 w-auto min-w-[150px]"
            value={messageId}
            onChange={(e) => { setMessageId(e.target.value); setPage(1); }}
          />
          
          <div className="ml-auto flex items-center">
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
              {totalItems} results
            </span>
          </div>
        </div>
      </div>

      {/* Pagination Controls Component */}
      {!loading && emails.length > 0 && (
        <div className="px-6 py-4 flex flex-wrap items-center justify-between border border-gray-100 bg-gray-50/50 rounded-xl gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <p>
              Showing <span className="font-medium text-gray-700">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-gray-700">{Math.min(page * pageSize, totalItems)}</span> of <span className="font-medium text-gray-700">{totalItems}</span> results
            </p>
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="font-semibold text-gray-700">On this page:</span>
              {Object.entries(emails.reduce((acc, email) => {
                acc[email.status] = (acc[email.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).map(([status, count]) => (
                <span key={status} className={statusStyles[status] ?? "badge-muted"}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden border border-gray-100 rounded-xl">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            Loading emails...
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center" style={{ color: "var(--text-muted)" }}>
            <Filter size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="font-medium text-gray-600 mb-1">No emails to display</h3>
            <p className="text-sm">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Date</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Recipient</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Subject</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Status</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600">Events</th>
                    <th className="py-3 px-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500" suppressHydrationWarning>
                        {formatIST(email.createdAt, true)}
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: "var(--text-primary)" }}>
                        {email.toEmail}
                      </td>
                      <td className="py-3 px-4 truncate max-w-[200px] text-gray-600" title={email.subject}>
                        {email.subject}
                      </td>
                      <td className="py-3 px-4">
                        <span className={statusStyles[email.status] ?? "badge-muted"}>
                          {email.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs">
                          {email.openCount > 0 && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Open</span>}
                          {email.clickCount > 0 && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">Click</span>}
                          {email.status === 'bounced' && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">Bounce</span>}
                          {email.openCount === 0 && email.clickCount === 0 && email.status !== 'bounced' && <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="btn-ghost p-1.5 rounded-md hover:bg-gray-100"
                          onClick={() => fetchDetail(email.id)}
                          title="View Detail"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Email Detail Panel */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-0 max-w-2xl w-full animate-fade-up overflow-hidden flex flex-col max-h-[85vh] border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-bold text-lg mb-1 text-gray-900">
                  Email Detail
                </h3>
                <span className={statusStyles[selected.status] ?? "badge-muted"}>
                  {selected.status}
                </span>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-3 text-sm bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-inner">
                {[
                  ["ID", selected.id],
                  ["To", selected.toEmail],
                  ["From", selected.fromEmail],
                  ["Subject", selected.subject],
                  ["Source", (() => {
                    const src = selected.metadata?.source || selected.metadata?._source;
                    return src === "api" ? "API Key" : src === "dashboard" ? "Dashboard" : src === "excel-upload" ? "Excel Upload" : src || "—";
                  })()],
                  ["Sent", selected.sentAt ? formatIST(selected.sentAt, true) : formatIST(selected.createdAt, true)],
                  ["Delivered", selected.deliveredAt ? formatIST(selected.deliveredAt, true) : "—"],
                  ["Opens", selected.openCount.toString()],
                  ["Clicks", selected.clickCount.toString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="font-medium shrink-0 text-gray-500">
                      {label}
                    </span>
                    <span className="text-right truncate font-medium text-gray-900">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {(() => {
                let parsedAttachments: any[] = [];
                if (selected.metadata?._attachments) {
                  const atts = selected.metadata._attachments;
                  if (typeof atts === 'string') {
                    try { parsedAttachments = JSON.parse(atts); } catch(e) {}
                  } else if (Array.isArray(atts)) {
                    parsedAttachments = [...atts];
                  }
                }
                if (selected.metadata?.certificateId) {
                  parsedAttachments.push({
                    filename: 'Dynamic_Certificate.pdf',
                    contentType: 'application/pdf',
                    path: '/dashboard/certificates' // Link to certificates dashboard
                  });
                }
                
                if (parsedAttachments.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">
                      Attachments ({parsedAttachments.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {parsedAttachments.map((att, i) => {
                        let url = "#";
                        if (att.path) {
                          const parts = att.path.split('uploads/');
                          if (parts.length > 1) {
                            url = `${API}/uploads/${parts[1]}`.replace(/\\/g, '/');
                          } else {
                            url = att.path.startsWith('/') ? `${API}${att.path}` : `${API}/${att.path}`;
                          }
                        }

                        const content = (
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 border border-indigo-100">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{att.filename || "Attachment"}</span>
                              <span className="text-xs text-gray-400">{att.contentType || "Unknown type"}</span>
                            </div>
                          </div>
                        );

                        return url !== "#" ? (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group block cursor-pointer">
                            {content}
                          </a>
                        ) : (
                          <div key={i} className="group block cursor-help opacity-90" title="This file is dynamically generated when sending and cannot be previewed beforehand.">
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">
                  HTML Preview
                </h4>
                {selected.htmlBody ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <iframe
                      srcDoc={selected.htmlBody}
                      className="w-full h-96 bg-white"
                      title="Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 text-sm shadow-inner">
                    <pre className="whitespace-pre-wrap font-mono text-gray-700">
                      {selected.textBody || "No content."}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
