"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Ban,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
interface BatchLog {
  id: string;
  subject: string;
  createdAt: string;
  total: number;
  queued: number;
}
interface EmailLog {
  id: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  status: string;
  createdAt: string;
  htmlBody?: string;
  textBody?: string;
  scheduledAt?: string;
  metadata?: any;
}
const statusStyles: Record<string, string> = {
  queued: "badge-info",
  failed: "badge-danger",
  sending: "badge-warning",
};
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export default function ScheduledPage() {
  const [batches, setBatches] = useState<BatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchEmails, setBatchEmails] = useState<EmailLog[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const fetchBatches = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API}/v1/logs/batches`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "10");
      url.searchParams.set("status", "scheduled");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setBatches(json.data.items);
        setTotalPages(Math.ceil(json.data.total / json.data.limit) || 1);
        setTotalItems(json.data.total);
      } else {
        setError(json.error ?? "Failed to load scheduled emails");
      }
    } catch (err) {
      setError("Network error. Could not connect to API.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        if (parsed.plan) setUserPlan(parsed.plan);
      } catch (e) {}
    }
    fetchBatches();
  }, [page]);
  async function handleCancelBatch(batchId: string) {
    if (
      !confirm("Are you sure you want to cancel this entire scheduled batch?")
    )
      return;
    setCancelling(batchId);
    try {
      const res = await fetch(`${API}/v1/logs/batches/${batchId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setBatches(batches.filter((b) => b.id !== batchId));
        setTotalItems((prev) => prev - 1);
        if (selectedBatchId === batchId) setSelectedBatchId(null);
      } else {
        alert(json.error ?? "Failed to cancel email");
      }
    } catch (err) {
      alert("Network error. Failed to cancel email.");
    } finally {
      setCancelling(null);
    }
  }
  async function fetchBatchEmails(batchId: string) {
    setSelectedBatchId(batchId);
    setLoadingBatch(true);
    try {
      const res = await fetch(`${API}/v1/logs/batches/${batchId}/emails`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setBatchEmails(json.data.items || json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBatch(false);
    }
  }
  async function fetchDetail(id: string) {
    try {
      const res = await fetch(`${API}/v1/logs/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setSelected(json.data);
    } catch (err) {
      console.error(err);
    }
  }
  const pageSize = 10;
  const paginated = batches;

  if (["free", "starter"].includes(userPlan)) {
    return (
      <div className="max-w-3xl mx-auto w-full py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scheduled Emails</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Schedule emails to be sent at a specific date and time in the future. This feature requires the Pro plan.
          </p>
          <a href="/dashboard/billing" className="btn-primary inline-flex">
            Upgrade to Pro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Scheduled Emails
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View and manage emails scheduled to be sent later.
          </p>{" "}
        </div>{" "}
        <button
          className="btn-ghost flex items-center gap-1.5 text-sm"
          onClick={() => {
            fetchBatches();
          }}
        >
          {" "}
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
          Refresh{" "}
        </button>{" "}
      </div>{" "}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      {/* Filters */} {/* */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        {" "}
        <div className="relative flex-1">
          {" "}
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Batches contain all emails sent together at once.
          </p>{" "}
        </div>{" "}
      </div>{" "}
      {/* Table */} {/* */}
      <div className="glass-card overflow-hidden">
        {" "}
        {loading && batches.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            {" "}
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />{" "}
            Loading scheduled batches...{" "}
          </div>
        ) : paginated.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            No scheduled emails found.
          </div>
        ) : (
          <>
            {" "}
            <div className="overflow-x-auto">
              {" "}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Subject</th>
                    <th>Total Emails</th>
                    <th>Scheduled For</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((batch) => (
                    <tr key={batch.id}>
                      <td
                        className="font-mono text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {batch.id?.substring(0, 8) || "—"}
                      </td>
                      <td
                        className="max-w-xs truncate font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {batch.subject}
                      </td>
                      <td>
                        <span className="font-bold">{batch.queued}</span>
                      </td>
                      <td className="text-xs">
                        {" "}
                        <div>
                          {formatIST(batch.createdAt, false)}
                        </div>{" "}
                      </td>
                      <td>
                        {" "}
                        <div className="flex items-center gap-1">
                          {" "}
                          <button
                            className="btn-ghost p-1.5"
                            onClick={() => fetchBatchEmails(batch.id)}
                            title="View Emails"
                          >
                            {" "}
                            <Eye size={14} />{" "}
                          </button>{" "}
                          <button
                            className="btn-ghost p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancelBatch(batch.id)}
                            disabled={cancelling === batch.id}
                            title="Cancel Entire Batch"
                          >
                            {" "}
                            {cancelling === batch.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Ban size={14} />
                            )}{" "}
                          </button>{" "}
                        </div>{" "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>{" "}
            {/* Pagination */} {/* */}
            <div
              className="px-4 py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {" "}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {" "}
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalItems)} of {totalItems}{" "}
              </p>{" "}
              <div className="flex gap-1">
                {" "}
                <button
                  className="btn-ghost p-1.5"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {" "}
                  <ChevronLeft size={14} />{" "}
                </button>{" "}
                <button
                  className="btn-ghost p-1.5"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {" "}
                  <ChevronRight size={14} />{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </>
        )}{" "}
      </div>{" "}
      {/* Batch Emails Modal */} {/* */}
      {selectedBatchId && !selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedBatchId(null)}
        >
          {" "}
          <div
            className="glass-card p-0 max-w-4xl w-full animate-fade-up flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              {" "}
              <div>
                {" "}
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Batch {selectedBatchId.substring(0, 8)}
                </h3>{" "}
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Emails scheduled in this batch
                </p>{" "}
              </div>{" "}
              <button
                className="btn-ghost p-1"
                onClick={() => setSelectedBatchId(null)}
              >
                ✕
              </button>{" "}
            </div>{" "}
            <div className="p-0 flex-1 overflow-y-auto">
              {" "}
              {loadingBatch ? (
                <div className="p-8 text-center text-gray-400">
                  Loading emails...
                </div>
              ) : (
                <table className="data-table w-full">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th>Scheduled For</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchEmails.map((email) => (
                      <tr key={email.id}>
                        <td
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {email.toEmail}
                        </td>
                        <td>
                          <span
                            className={
                              statusStyles[email.status] ?? "badge-muted"
                            }
                          >
                            {email.status}
                          </span>
                        </td>
                        <td className="text-xs">
                          {email.scheduledAt
                            ? formatIST(email.scheduledAt, false)
                            : "—"}
                        </td>
                        <td>
                          {" "}
                          <button
                            className="btn-ghost p-1.5"
                            onClick={() => fetchDetail(email.id)}
                          >
                            {" "}
                            <Eye size={14} />{" "}
                          </button>{" "}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Email Detail Panel */} {/* */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelected(null)}
        >
          {" "}
          <div
            className="glass-card p-0 max-w-2xl w-full animate-fade-up overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              {" "}
              <div>
                {" "}
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Email Preview
                </h3>{" "}
                <span
                  className={statusStyles[selected.status] ?? "badge-muted"}
                >
                  {selected.status}
                </span>{" "}
              </div>{" "}
              <button
                className="btn-ghost p-1"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>{" "}
            </div>{" "}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {" "}
              <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                {" "}
                {[
                  ["ID", selected.id],
                  ["To", selected.toEmail],
                  ["From", selected.fromEmail],
                  ["Subject", selected.subject],
                  [
                    "Scheduled",
                    selected.scheduledAt
                      ? `${formatIST(selected.scheduledAt, false)} (${formatDistanceToNow(new Date(selected.scheduledAt), { addSuffix: true })})`
                      : formatIST(selected.createdAt, false),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    {" "}
                    <span
                      className="font-medium shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </span>{" "}
                    <span
                      className="text-right truncate font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {value}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
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
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
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
                {" "}
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">
                  HTML Preview
                </h4>{" "}
                {selected.htmlBody ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    {" "}
                    <iframe
                      srcDoc={selected.htmlBody}
                      className="w-full h-96 bg-white"
                      title="Preview"
                      sandbox="allow-same-origin"
                    />{" "}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm">
                    {" "}
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">
                      {selected.textBody || "No content."}
                    </pre>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
