"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
interface BatchLog {
  id: string;
  subject: string;
  createdAt: string;
  total: number;
  delivered: number;
  failed: number;
  queued: number;
  bounced: number;
  complained: number;
  sending: number;
  openCount: number;
  clickCount: number;
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
  deliveredAt?: string;
  bouncedAt?: string;
  bounceReason?: string;
  openCount: number;
  clickCount: number;
  metadata?: Record<string, string>;
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
export default function LogsPage() {
  const [batches, setBatches] = useState<BatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const fetchBatches = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("mf_access_token");
      const url = new URL(`${API}/v1/logs/batches`);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "20");
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);
      if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
      if (dateTo) url.searchParams.set("dateTo", dateTo);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setBatches(json.data.items);
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
  useEffect(() => {
    fetchBatches();
  }, [page, statusFilter, search, dateFrom, dateTo]);
  const pageSize = 20;
  const paginated = batches;
  return (
    <div className="space-y-5 ">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Email Logs
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Track every email sent from your account.
          </p>{" "}
        </div>{" "}
        <button
          className="btn-ghost flex items-center gap-1.5 text-sm"
          onClick={() => {
            fetchBatches();
          }}
        >
          {" "}
          <RefreshCw size={14} /> Refresh{" "}
        </button>{" "}
      </div>{" "}
      {/* Advanced Filter Bar (SendGrid Style) */}
      <div className="glass-card p-4 border border-gray-100 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Batch ID or Subject..."
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
            type="date"
            className="input h-10 w-auto min-w-[130px]"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="input h-10 w-auto min-w-[130px]"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
          <div className="ml-auto flex items-center">
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
              {totalItems} results
            </span>
          </div>
        </div>
      </div>
      {/* Pagination Controls Component */}
      {!loading && batches.length > 0 && (
        <div className="px-6 py-4 flex flex-wrap items-center justify-between border border-gray-100 bg-gray-50/50 rounded-xl gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <p>
              Showing <span className="font-medium text-gray-700">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-gray-700">{Math.min(page * pageSize, totalItems)}</span> of <span className="font-medium text-gray-700">{totalItems}</span> results
            </p>
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
      <div className="glass-card overflow-hidden">
        {" "}
        {loading ? (
          <div
            className="p-8 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            {" "}
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />{" "}
            Loading logs...{" "}
          </div>
        ) : paginated.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            No emails found.
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
                    <th>Sent At</th>
                    <th>Total</th>
                    <th>Delivered</th>
                    <th>Opens</th>
                    <th>Clicks</th>
                    <th>Failed</th>
                    <th>Bounced</th>
                    <th>Complaints</th>
                    <th>Queued</th>
                    <th></th>
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
                      <td className="text-xs" suppressHydrationWarning>
                        {formatIST(batch.createdAt, true)}
                      </td>
                      <td>
                        <span className="font-bold">{batch.total}</span>
                      </td>
                      <td>
                        <span className="text-emerald-600">
                          {batch.delivered}
                        </span>
                      </td>
                      <td>{batch.openCount}</td>
                      <td>{batch.clickCount}</td>
                      <td>
                        <span className="text-red-500">
                          {batch.failed}
                        </span>
                      </td>
                      <td>
                        <span className="text-red-500">
                          {batch.bounced}
                        </span>
                      </td>
                      <td>
                        <span className="text-red-500">
                          {batch.complained}
                        </span>
                      </td>
                      <td>
                        <span className="text-amber-500">
                          {batch.queued + batch.sending}
                        </span>
                      </td>
                      <td>
                        {" "}
                        <a
                          className="btn-ghost p-1.5 cursor-pointer block"
                          href={`/dashboard/logs/batches/${batch.id}`}
                          title="View Emails"
                        >
                          {" "}
                          <Eye size={14} />{" "}
                        </a>{" "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>{" "}
            {/* Pagination */}{" "}
            <div
              className="px-4 py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalItems)} of {totalItems}
              </p>
              <div className="flex gap-1">
                <button
                  className="btn-ghost p-1.5"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn-ghost p-1.5"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}{" "}
      </div>{" "}
    </div>
  );
}
